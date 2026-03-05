"""Card 仓储抽象与内存实现。"""

from collections.abc import Mapping
from dataclasses import replace
from datetime import UTC, datetime
from threading import Lock
from typing import Protocol, cast

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.db.helpers import run_readonly, run_with_retry
from app.deck.repository import DeckNotFoundError, DeckRepository
from app.domain.models import Card


class CardNotFoundError(ValueError):
    """Card 不存在或不属于当前用户。"""


class CardRepository(Protocol):
    """Card 仓储协议。"""

    def create_card(
        self,
        *,
        user_id: str,
        deck_id: str,
        front_text: str,
        back_text: str,
        source_lang: str = "zh",
        target_lang: str = "en",
        due_at: datetime | None = None,
        stability: float = 0.0,
        difficulty: float = 0.0,
        reps: int = 0,
        lapses: int = 0,
    ) -> Card:
        """创建卡片。"""
        ...

    def list_by_deck(self, *, user_id: str, deck_id: str) -> list[Card]:
        """按 deck 查询卡片。"""
        ...

    def list_by_user(self, *, user_id: str) -> list[Card]:
        """按用户查询全部卡片。"""
        ...

    def get_by_id(self, *, user_id: str, card_id: str) -> Card:
        """按 ID 查询卡片。"""
        ...

    def update_text(self, *, user_id: str, card_id: str, front_text: str, back_text: str) -> Card:
        """更新卡片正反面文本。"""
        ...

    def delete_card(self, *, user_id: str, card_id: str) -> None:
        """删除卡片。"""
        ...

    def move_card(self, *, user_id: str, card_id: str, to_deck_id: str) -> Card:
        """移动卡片到目标 deck。"""
        ...

    def update_fsrs_state(
        self,
        *,
        user_id: str,
        card_id: str,
        due_at: datetime,
        stability: float,
        difficulty: float,
        reps: int,
        lapses: int,
    ) -> Card:
        """更新卡片 FSRS 状态。"""
        ...


class InMemoryCardRepository(CardRepository):
    """基于内存结构的 card 仓储实现。"""

    def __init__(self, *, deck_repository: DeckRepository) -> None:
        """初始化 card 索引并注入 deck 仓储。"""
        self._deck_repository = deck_repository
        self._cards_by_id: dict[str, Card] = {}
        self._card_ids_by_deck: dict[str, list[str]] = {}
        self._lock = Lock()

    def create_card(
        self,
        *,
        user_id: str,
        deck_id: str,
        front_text: str,
        back_text: str,
        source_lang: str = "zh",
        target_lang: str = "en",
        due_at: datetime | None = None,
        stability: float = 0.0,
        difficulty: float = 0.0,
        reps: int = 0,
        lapses: int = 0,
    ) -> Card:
        """创建并落盘卡片，同时刷新 deck 统计。"""
        with self._lock:
            self._ensure_deck_accessible_locked(user_id=user_id, deck_id=deck_id)

            card = Card.create(
                user_id=user_id,
                deck_id=deck_id,
                front_text=front_text,
                back_text=back_text,
                source_lang=source_lang,
                target_lang=target_lang,
                due_at=due_at,
                stability=stability,
                difficulty=difficulty,
                reps=reps,
                lapses=lapses,
            )
            self._cards_by_id[card.card_id] = card
            self._card_ids_by_deck.setdefault(deck_id, []).append(card.card_id)
            self._refresh_deck_counts_locked(deck_id)
            return card

    def list_by_deck(self, *, user_id: str, deck_id: str) -> list[Card]:
        """按插入顺序返回 deck 下的卡片。"""
        with self._lock:
            self._ensure_deck_accessible_locked(user_id=user_id, deck_id=deck_id)
            card_ids = self._card_ids_by_deck.get(deck_id, [])
            return [self._cards_by_id[card_id] for card_id in card_ids]

    def list_by_user(self, *, user_id: str) -> list[Card]:
        """按创建时间返回用户全部卡片。"""
        with self._lock:
            cards = [card for card in self._cards_by_id.values() if card.user_id == user_id]
            return sorted(cards, key=lambda item: item.created_at)

    def get_by_id(self, *, user_id: str, card_id: str) -> Card:
        """按 ID 返回单张卡片。"""
        with self._lock:
            return self._get_owned_card_locked(user_id=user_id, card_id=card_id)

    def update_text(self, *, user_id: str, card_id: str, front_text: str, back_text: str) -> Card:
        """仅更新正反面文本，保留 FSRS 状态字段。"""
        with self._lock:
            card = self._get_owned_card_locked(user_id=user_id, card_id=card_id)
            updated = replace(
                card,
                front_text=front_text,
                back_text=back_text,
                updated_at=datetime.now(UTC),
            )
            self._cards_by_id[card_id] = updated
            return updated

    def delete_card(self, *, user_id: str, card_id: str) -> None:
        """删除卡片并同步 deck 统计。"""
        with self._lock:
            card = self._get_owned_card_locked(user_id=user_id, card_id=card_id)
            del self._cards_by_id[card_id]
            self._card_ids_by_deck.setdefault(card.deck_id, []).remove(card_id)
            self._refresh_deck_counts_locked(card.deck_id)

    def move_card(self, *, user_id: str, card_id: str, to_deck_id: str) -> Card:
        """移动卡片并刷新来源/目标 deck 统计。"""
        with self._lock:
            card = self._get_owned_card_locked(user_id=user_id, card_id=card_id)
            self._ensure_deck_accessible_locked(user_id=user_id, deck_id=to_deck_id)
            if card.deck_id == to_deck_id:
                return card

            from_deck_id = card.deck_id
            self._card_ids_by_deck.setdefault(from_deck_id, []).remove(card_id)
            self._card_ids_by_deck.setdefault(to_deck_id, []).append(card_id)

            moved = replace(
                card,
                deck_id=to_deck_id,
                updated_at=datetime.now(UTC),
            )
            self._cards_by_id[card_id] = moved

            self._refresh_deck_counts_locked(from_deck_id)
            self._refresh_deck_counts_locked(to_deck_id)
            return moved

    def update_fsrs_state(
        self,
        *,
        user_id: str,
        card_id: str,
        due_at: datetime,
        stability: float,
        difficulty: float,
        reps: int,
        lapses: int,
    ) -> Card:
        """更新卡片 FSRS 状态并同步 deck 统计。"""
        with self._lock:
            card = self._get_owned_card_locked(user_id=user_id, card_id=card_id)
            updated = replace(
                card,
                due_at=due_at,
                stability=stability,
                difficulty=difficulty,
                reps=reps,
                lapses=lapses,
                updated_at=datetime.now(UTC),
            )
            self._cards_by_id[card_id] = updated
            self._refresh_deck_counts_locked(updated.deck_id)
            return updated

    def _ensure_deck_accessible_locked(self, *, user_id: str, deck_id: str) -> None:
        deck = self._deck_repository.get_by_id(deck_id)
        if deck is None or deck.user_id != user_id:
            raise DeckNotFoundError("deck not found")

    def _get_owned_card_locked(self, *, user_id: str, card_id: str) -> Card:
        card = self._cards_by_id.get(card_id)
        if card is None or card.user_id != user_id:
            raise CardNotFoundError("card not found")
        return card

    def _refresh_deck_counts_locked(self, deck_id: str) -> None:
        """按卡片实时状态回写 deck 聚合计数，避免删除约束与真实数据漂移。"""
        cards = [
            self._cards_by_id[card_id]
            for card_id in self._card_ids_by_deck.get(deck_id, [])
            if card_id in self._cards_by_id
        ]
        now = datetime.now(UTC)
        new_count = sum(1 for card in cards if card.reps == 0)
        due_count = sum(1 for card in cards if card.reps > 0 and card.due_at <= now)
        learning_count = len(cards) - new_count - due_count
        self._deck_repository.update_counts(
            deck_id=deck_id,
            new_count=new_count,
            learning_count=learning_count,
            due_count=due_count,
        )


class PostgresCardRepository(CardRepository):
    """基于 PostgreSQL 的 card 仓储实现。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        """初始化数据库连接池。"""
        self._pool = pool

    def create_card(
        self,
        *,
        user_id: str,
        deck_id: str,
        front_text: str,
        back_text: str,
        source_lang: str = "zh",
        target_lang: str = "en",
        due_at: datetime | None = None,
        stability: float = 0.0,
        difficulty: float = 0.0,
        reps: int = 0,
        lapses: int = 0,
    ) -> Card:
        """创建并落盘卡片，同时刷新 deck 统计。"""
        card = Card.create(
            user_id=user_id,
            deck_id=deck_id,
            front_text=front_text,
            back_text=back_text,
            source_lang=source_lang,
            target_lang=target_lang,
            due_at=due_at,
            stability=stability,
            difficulty=difficulty,
            reps=reps,
            lapses=lapses,
        )

        def _op(connection: Connection[object]) -> None:
            with connection.cursor(row_factory=dict_row) as cursor:
                self._ensure_deck_accessible(cursor=cursor, user_id=user_id, deck_id=deck_id)
                cursor.execute(
                    """
                    INSERT INTO cards (
                        card_id, user_id, deck_id, front_text, back_text,
                        source_lang, target_lang, due_at, stability, difficulty,
                        reps, lapses, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        card.card_id, card.user_id, card.deck_id,
                        card.front_text, card.back_text,
                        card.source_lang, card.target_lang, card.due_at,
                        card.stability, card.difficulty, card.reps, card.lapses,
                        card.created_at, card.updated_at,
                    ),
                )
                self._refresh_deck_counts(cursor=cursor, deck_id=deck_id)

        run_with_retry(pool=self._pool, operation_name="create_card", operation=_op)
        return card

    def list_by_deck(self, *, user_id: str, deck_id: str) -> list[Card]:
        """按插入顺序返回 deck 下的卡片。"""
        def _query(connection: Connection[object]) -> list[dict[str, object]]:
            with connection.cursor(row_factory=dict_row) as cursor:
                self._ensure_deck_accessible(cursor=cursor, user_id=user_id, deck_id=deck_id)
                cursor.execute(
                    """
                    SELECT card_id, user_id, deck_id, front_text, back_text,
                           source_lang, target_lang, due_at, stability, difficulty,
                           reps, lapses, created_at, updated_at
                    FROM cards
                    WHERE user_id = %s AND deck_id = %s
                    ORDER BY created_at ASC, card_id ASC
                    """,
                    (user_id, deck_id),
                )
                return cursor.fetchall()

        rows = run_readonly(pool=self._pool, operation_name="list_by_deck", operation=_query)
        return [_row_to_card(row) for row in rows]

    def list_by_user(self, *, user_id: str) -> list[Card]:
        """按创建时间返回用户全部卡片。"""
        def _query(connection: Connection[object]) -> list[dict[str, object]]:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT card_id, user_id, deck_id, front_text, back_text,
                           source_lang, target_lang, due_at, stability, difficulty,
                           reps, lapses, created_at, updated_at
                    FROM cards
                    WHERE user_id = %s
                    ORDER BY created_at ASC, card_id ASC
                    """,
                    (user_id,),
                )
                return cursor.fetchall()

        rows = run_readonly(pool=self._pool, operation_name="list_by_user", operation=_query)
        return [_row_to_card(row) for row in rows]

    def get_by_id(self, *, user_id: str, card_id: str) -> Card:
        """按 ID 返回单张卡片。"""
        def _query(connection: Connection[object]) -> dict[str, object] | None:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT card_id, user_id, deck_id, front_text, back_text,
                           source_lang, target_lang, due_at, stability, difficulty,
                           reps, lapses, created_at, updated_at
                    FROM cards
                    WHERE card_id = %s AND user_id = %s
                    LIMIT 1
                    """,
                    (card_id, user_id),
                )
                return cursor.fetchone()

        row = run_readonly(pool=self._pool, operation_name="get_by_id", operation=_query)
        if row is None:
            raise CardNotFoundError("card not found")
        return _row_to_card(row)

    def update_text(self, *, user_id: str, card_id: str, front_text: str, back_text: str) -> Card:
        """仅更新正反面文本，保留 FSRS 状态字段。"""
        now = datetime.now(UTC)

        def _op(connection: Connection[object]) -> dict[str, object] | None:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    UPDATE cards
                    SET front_text = %s, back_text = %s, updated_at = %s
                    WHERE card_id = %s AND user_id = %s
                    RETURNING
                        card_id, user_id, deck_id, front_text, back_text,
                        source_lang, target_lang, due_at, stability, difficulty,
                        reps, lapses, created_at, updated_at
                    """,
                    (front_text, back_text, now, card_id, user_id),
                )
                return cursor.fetchone()

        row = run_with_retry(pool=self._pool, operation_name="update_text", operation=_op)
        if row is None:
            raise CardNotFoundError("card not found")
        return _row_to_card(row)

    def delete_card(self, *, user_id: str, card_id: str) -> None:
        """删除卡片并同步 deck 统计。"""
        def _op(connection: Connection[object]) -> None:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    DELETE FROM cards
                    WHERE card_id = %s AND user_id = %s
                    RETURNING deck_id
                    """,
                    (card_id, user_id),
                )
                row = cursor.fetchone()
                if row is None:
                    raise CardNotFoundError("card not found")
                self._refresh_deck_counts(cursor=cursor, deck_id=str(row["deck_id"]))

        run_with_retry(pool=self._pool, operation_name="delete_card", operation=_op)

    def move_card(self, *, user_id: str, card_id: str, to_deck_id: str) -> Card:
        """移动卡片并刷新来源/目标 deck 统计。"""
        now = datetime.now(UTC)

        def _op(connection: Connection[object]) -> dict[str, object]:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        card_id, user_id, deck_id, front_text, back_text,
                        source_lang, target_lang, due_at, stability, difficulty,
                        reps, lapses, created_at, updated_at
                    FROM cards
                    WHERE card_id = %s AND user_id = %s
                    LIMIT 1
                    """,
                    (card_id, user_id),
                )
                card_row = cursor.fetchone()
                if card_row is None:
                    raise CardNotFoundError("card not found")

                current_deck_id = str(card_row["deck_id"])
                self._ensure_deck_accessible(cursor=cursor, user_id=user_id, deck_id=to_deck_id)
                if current_deck_id == to_deck_id:
                    return card_row

                cursor.execute(
                    """
                    UPDATE cards
                    SET deck_id = %s, updated_at = %s
                    WHERE card_id = %s AND user_id = %s
                    RETURNING
                        card_id, user_id, deck_id, front_text, back_text,
                        source_lang, target_lang, due_at, stability, difficulty,
                        reps, lapses, created_at, updated_at
                    """,
                    (to_deck_id, now, card_id, user_id),
                )
                moved_row = cursor.fetchone()
                if moved_row is None:
                    raise CardNotFoundError("card not found")

                self._refresh_deck_counts(cursor=cursor, deck_id=current_deck_id)
                self._refresh_deck_counts(cursor=cursor, deck_id=to_deck_id)
                return moved_row

        row = run_with_retry(pool=self._pool, operation_name="move_card", operation=_op)
        return _row_to_card(row)

    def update_fsrs_state(
        self,
        *,
        user_id: str,
        card_id: str,
        due_at: datetime,
        stability: float,
        difficulty: float,
        reps: int,
        lapses: int,
    ) -> Card:
        """更新卡片 FSRS 状态并同步 deck 统计。"""
        now = datetime.now(UTC)

        def _op(connection: Connection[object]) -> dict[str, object]:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    UPDATE cards
                    SET due_at = %s, stability = %s, difficulty = %s,
                        reps = %s, lapses = %s, updated_at = %s
                    WHERE card_id = %s AND user_id = %s
                    RETURNING
                        card_id, user_id, deck_id, front_text, back_text,
                        source_lang, target_lang, due_at, stability, difficulty,
                        reps, lapses, created_at, updated_at
                    """,
                    (due_at, stability, difficulty, reps, lapses, now, card_id, user_id),
                )
                row = cursor.fetchone()
                if row is None:
                    raise CardNotFoundError("card not found")
                self._refresh_deck_counts(cursor=cursor, deck_id=str(row["deck_id"]))
                return row

        row = run_with_retry(pool=self._pool, operation_name="update_fsrs_state", operation=_op)
        return _row_to_card(row)

    @staticmethod
    def _ensure_deck_accessible(*, cursor: psycopg.Cursor[dict[str, object]], user_id: str, deck_id: str) -> None:
        cursor.execute(
            """
            SELECT deck_id
            FROM decks
            WHERE deck_id = %s AND user_id = %s
            LIMIT 1
            """,
            (deck_id, user_id),
        )
        if cursor.fetchone() is None:
            raise DeckNotFoundError("deck not found")

    @staticmethod
    def _refresh_deck_counts(*, cursor: psycopg.Cursor[dict[str, object]], deck_id: str) -> None:
        """按卡片实时状态回写 deck 聚合计数，保证删除约束与展示一致。"""
        cursor.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE reps = 0) AS new_count,
                COUNT(*) FILTER (WHERE reps > 0 AND due_at <= NOW()) AS due_count,
                COUNT(*) FILTER (WHERE reps > 0 AND due_at > NOW()) AS learning_count
            FROM cards
            WHERE deck_id = %s
            """,
            (deck_id,),
        )
        counts = cursor.fetchone()
        if counts is None:
            new_count = 0
            due_count = 0
            learning_count = 0
        else:
            new_count_raw = cast(int | None, counts["new_count"])
            due_count_raw = cast(int | None, counts["due_count"])
            learning_count_raw = cast(int | None, counts["learning_count"])
            new_count = new_count_raw or 0
            due_count = due_count_raw or 0
            learning_count = learning_count_raw or 0

        cursor.execute(
            """
            UPDATE decks
            SET
                new_count = %s,
                learning_count = %s,
                due_count = %s
            WHERE deck_id = %s
            """,
            (new_count, learning_count, due_count, deck_id),
        )


def _row_to_card(row: Mapping[str, object]) -> Card:
    """把数据库行映射为领域实体。"""
    return Card(
        card_id=str(row["card_id"]),
        user_id=str(row["user_id"]),
        deck_id=str(row["deck_id"]),
        front_text=str(row["front_text"]),
        back_text=str(row["back_text"]),
        source_lang=str(row["source_lang"]),
        target_lang=str(row["target_lang"]),
        due_at=cast(datetime, row["due_at"]),
        stability=cast(float, row["stability"]),
        difficulty=cast(float, row["difficulty"]),
        reps=cast(int, row["reps"]),
        lapses=cast(int, row["lapses"]),
        created_at=cast(datetime, row["created_at"]),
        updated_at=cast(datetime, row["updated_at"]),
    )
