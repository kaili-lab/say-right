"""Deck 仓储抽象与内存实现。"""

from collections.abc import Mapping
from dataclasses import replace
from datetime import datetime
from threading import Lock
from typing import Protocol, cast

import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.db.helpers import run_readonly, run_with_retry
from app.domain.models import Deck

DEFAULT_DECK_NAME = "默认组"


class DuplicateDeckNameError(ValueError):
    """同一用户下 deck 名称重复。"""


class DeckNotFoundError(ValueError):
    """Deck 不存在或不属于当前用户。"""


class DefaultDeckDeleteForbiddenError(ValueError):
    """默认组不可删除。"""


class DeckNotEmptyError(ValueError):
    """Deck 内仍有卡片，不允许删除。"""


class DeckRepository(Protocol):
    """Deck 仓储协议。"""

    def ensure_default_deck(self, user_id: str) -> Deck:
        """保证用户存在且仅存在一个默认组。"""
        ...

    def list_by_user(self, user_id: str) -> list[Deck]:
        """按用户返回 deck 列表。"""
        ...

    def get_by_id(self, deck_id: str) -> Deck | None:
        """按 deck_id 查询 deck。"""
        ...

    def add_custom_deck(self, user_id: str, name: str) -> Deck:
        """为用户新增自定义 deck。"""
        ...

    def delete_deck(self, user_id: str, deck_id: str) -> None:
        """删除 deck。"""
        ...

    def update_counts(self, *, deck_id: str, new_count: int, learning_count: int, due_count: int) -> None:
        """更新 deck 聚合计数。"""
        ...


class InMemoryDeckRepository(DeckRepository):
    """基于内存结构的 deck 仓储实现。"""

    def __init__(self) -> None:
        """初始化用户 deck 索引。"""
        self._decks_by_id: dict[str, Deck] = {}
        self._deck_ids_by_user: dict[str, list[str]] = {}
        self._default_deck_id_by_user: dict[str, str] = {}
        self._normalized_names_by_user: dict[str, set[str]] = {}
        self._lock = Lock()

    def ensure_default_deck(self, user_id: str) -> Deck:
        """初始化或返回用户默认组。"""
        with self._lock:
            return self._ensure_default_deck_locked(user_id)

    def list_by_user(self, user_id: str) -> list[Deck]:
        """按创建顺序返回该用户 deck。"""
        deck_ids = self._deck_ids_by_user.get(user_id, [])
        return [self._decks_by_id[deck_id] for deck_id in deck_ids]

    def get_by_id(self, deck_id: str) -> Deck | None:
        """按 deck_id 读取 deck。"""
        return self._decks_by_id.get(deck_id)

    def add_custom_deck(self, user_id: str, name: str) -> Deck:
        """新增自定义组并保证名称唯一。"""
        normalized_name = self._normalize_name(name)
        display_name = name.strip()

        with self._lock:
            self._ensure_default_deck_locked(user_id)
            names = self._normalized_names_by_user.setdefault(user_id, set())
            if normalized_name in names:
                raise DuplicateDeckNameError("duplicate deck name")

            deck = Deck.create(user_id=user_id, name=display_name, is_default=False)
            self._decks_by_id[deck.deck_id] = deck
            self._deck_ids_by_user.setdefault(user_id, []).append(deck.deck_id)
            names.add(normalized_name)
            return deck

    def delete_deck(self, user_id: str, deck_id: str) -> None:
        """删除用户 deck 并校验业务约束。"""
        with self._lock:
            deck = self._decks_by_id.get(deck_id)
            if deck is None or deck.user_id != user_id:
                raise DeckNotFoundError("deck not found")

            if deck.is_default:
                raise DefaultDeckDeleteForbiddenError("default deck cannot be deleted")

            if deck.new_count + deck.learning_count + deck.due_count > 0:
                raise DeckNotEmptyError("deck is not empty")

            del self._decks_by_id[deck_id]
            self._deck_ids_by_user.setdefault(user_id, []).remove(deck_id)
            self._normalized_names_by_user.setdefault(user_id, set()).discard(
                self._normalize_name(deck.name),
            )

    def update_counts(self, *, deck_id: str, new_count: int, learning_count: int, due_count: int) -> None:
        """更新 deck 计数（当前用于测试与后续卡片模块联动）。"""
        with self._lock:
            deck = self._decks_by_id.get(deck_id)
            if deck is None:
                raise DeckNotFoundError("deck not found")

            self._decks_by_id[deck_id] = replace(
                deck,
                new_count=new_count,
                learning_count=learning_count,
                due_count=due_count,
            )

    def _ensure_default_deck_locked(self, user_id: str) -> Deck:
        default_id = self._default_deck_id_by_user.get(user_id)
        if default_id is not None:
            return self._decks_by_id[default_id]

        default_deck = Deck.create(user_id=user_id, name=DEFAULT_DECK_NAME, is_default=True)
        self._decks_by_id[default_deck.deck_id] = default_deck
        self._deck_ids_by_user.setdefault(user_id, []).insert(0, default_deck.deck_id)
        self._default_deck_id_by_user[user_id] = default_deck.deck_id
        self._normalized_names_by_user.setdefault(user_id, set()).add(
            self._normalize_name(DEFAULT_DECK_NAME),
        )
        return default_deck

    @staticmethod
    def _normalize_name(name: str) -> str:
        return name.strip().lower()


class PostgresDeckRepository(DeckRepository):
    """基于 PostgreSQL 的 deck 仓储实现。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        """初始化数据库连接池。"""
        self._pool = pool

    def ensure_default_deck(self, user_id: str) -> Deck:
        """初始化或返回用户默认组。"""
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                existing_default = self._find_default_deck(cursor=cursor, user_id=user_id)
                if existing_default is not None:
                    return _row_to_deck(existing_default)

                default_deck = Deck.create(
                    user_id=user_id,
                    name=DEFAULT_DECK_NAME,
                    is_default=True,
                )
                try:
                    cursor.execute(
                        """
                        INSERT INTO decks (
                            deck_id,
                            user_id,
                            name,
                            is_default,
                            new_count,
                            learning_count,
                            due_count,
                            created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            default_deck.deck_id,
                            default_deck.user_id,
                            default_deck.name,
                            default_deck.is_default,
                            default_deck.new_count,
                            default_deck.learning_count,
                            default_deck.due_count,
                            default_deck.created_at,
                        ),
                    )
                    return default_deck
                except psycopg.errors.UniqueViolation:
                    # 并发请求下默认组可能已被其他事务创建，回读即可。
                    connection.rollback()
                    with connection.cursor(row_factory=dict_row) as retry_cursor:
                        existing_default = self._find_default_deck(
                            cursor=retry_cursor,
                            user_id=user_id,
                        )
                    if existing_default is not None:
                        return _row_to_deck(existing_default)
                    raise

    def list_by_user(self, user_id: str) -> list[Deck]:
        """按创建顺序返回该用户 deck。"""
        def _query(connection: Connection[object]) -> list[dict[str, object]]:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT deck_id, user_id, name, is_default,
                           new_count, learning_count, due_count, created_at
                    FROM decks
                    WHERE user_id = %s
                    ORDER BY created_at ASC, deck_id ASC
                    """,
                    (user_id,),
                )
                return cursor.fetchall()

        rows = run_readonly(
            pool=self._pool, operation_name="list_by_user", operation=_query,
        )
        return [_row_to_deck(row) for row in rows]

    def get_by_id(self, deck_id: str) -> Deck | None:
        """按 deck_id 读取 deck。"""
        def _query(connection: Connection[object]) -> dict[str, object] | None:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT deck_id, user_id, name, is_default,
                           new_count, learning_count, due_count, created_at
                    FROM decks
                    WHERE deck_id = %s
                    LIMIT 1
                    """,
                    (deck_id,),
                )
                return cursor.fetchone()

        row = run_readonly(
            pool=self._pool, operation_name="get_by_id", operation=_query,
        )
        if row is None:
            return None
        return _row_to_deck(row)

    def add_custom_deck(self, user_id: str, name: str) -> Deck:
        """新增自定义组并保证名称唯一。"""
        deck = Deck.create(
            user_id=user_id,
            name=name.strip(),
            is_default=False,
        )
        try:
            def _op(connection: Connection[object]) -> None:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO decks (
                            deck_id, user_id, name, is_default,
                            new_count, learning_count, due_count, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            deck.deck_id, deck.user_id, deck.name, deck.is_default,
                            deck.new_count, deck.learning_count, deck.due_count,
                            deck.created_at,
                        ),
                    )

            run_with_retry(pool=self._pool, operation_name="add_custom_deck", operation=_op)
        except psycopg.errors.UniqueViolation as exc:
            raise DuplicateDeckNameError("duplicate deck name") from exc
        return deck

    def delete_deck(self, user_id: str, deck_id: str) -> None:
        """删除用户 deck 并校验业务约束。"""
        def _op(connection: Connection[object]) -> None:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT deck_id, user_id, name, is_default,
                           new_count, learning_count, due_count, created_at
                    FROM decks
                    WHERE deck_id = %s
                    LIMIT 1
                    """,
                    (deck_id,),
                )
                row = cursor.fetchone()
                if row is None or str(row["user_id"]) != user_id:
                    raise DeckNotFoundError("deck not found")

                if bool(row["is_default"]):
                    raise DefaultDeckDeleteForbiddenError("default deck cannot be deleted")

                if (
                    cast(int, row["new_count"])
                    + cast(int, row["learning_count"])
                    + cast(int, row["due_count"])
                    > 0
                ):
                    raise DeckNotEmptyError("deck is not empty")

                cursor.execute("DELETE FROM decks WHERE deck_id = %s", (deck_id,))

        run_with_retry(pool=self._pool, operation_name="delete_deck", operation=_op)

    def update_counts(self, *, deck_id: str, new_count: int, learning_count: int, due_count: int) -> None:
        """更新 deck 聚合计数。"""
        def _op(connection: Connection[object]) -> None:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE decks
                    SET new_count = %s, learning_count = %s, due_count = %s
                    WHERE deck_id = %s
                    """,
                    (new_count, learning_count, due_count, deck_id),
                )
                if cursor.rowcount == 0:
                    raise DeckNotFoundError("deck not found")

        run_with_retry(pool=self._pool, operation_name="update_counts", operation=_op)

    @staticmethod
    def _find_default_deck(*, cursor: psycopg.Cursor[dict[str, object]], user_id: str) -> dict[str, object] | None:
        cursor.execute(
            """
            SELECT
                deck_id,
                user_id,
                name,
                is_default,
                new_count,
                learning_count,
                due_count,
                created_at
            FROM decks
            WHERE user_id = %s AND is_default = TRUE
            ORDER BY created_at ASC, deck_id ASC
            LIMIT 1
            """,
            (user_id,),
        )
        return cursor.fetchone()


def _row_to_deck(row: Mapping[str, object]) -> Deck:
    """把数据库行映射为领域实体。"""
    return Deck(
        deck_id=str(row["deck_id"]),
        user_id=str(row["user_id"]),
        name=str(row["name"]),
        is_default=bool(row["is_default"]),
        new_count=cast(int, row["new_count"]),
        learning_count=cast(int, row["learning_count"]),
        due_count=cast(int, row["due_count"]),
        created_at=cast(datetime, row["created_at"]),
    )
