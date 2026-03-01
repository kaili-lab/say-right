"""Deck 仓储抽象与内存实现。"""

from dataclasses import replace
from threading import Lock
from typing import Protocol

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

    def add_custom_deck(self, user_id: str, name: str) -> Deck:
        """为用户新增自定义 deck。"""
        ...

    def delete_deck(self, user_id: str, deck_id: str) -> None:
        """删除 deck。"""
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
