"""Card 仓储抽象与内存实现。"""

from dataclasses import replace
from datetime import UTC, datetime
from threading import Lock
from typing import Protocol

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
