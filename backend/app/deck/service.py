"""Deck 服务层。"""

from dataclasses import dataclass

from app.deck.repository import DeckRepository
from app.domain.models import Deck


class InvalidDeckNameError(ValueError):
    """Deck 名称非法。"""


@dataclass(slots=True)
class DeckService:
    """Deck 领域服务。"""

    repository: DeckRepository

    def ensure_default_deck(self, user_id: str) -> Deck:
        """确保目标用户存在默认组。"""
        return self.repository.ensure_default_deck(user_id)

    def list_decks(self, user_id: str) -> list[Deck]:
        """列出用户全部 deck。"""
        decks = self.repository.list_by_user(user_id)
        if not decks:
            self.repository.ensure_default_deck(user_id)
            decks = self.repository.list_by_user(user_id)
        return decks

    def create_deck(self, user_id: str, name: str) -> Deck:
        """创建自定义 deck。"""
        if not name.strip():
            raise InvalidDeckNameError("deck name must not be empty")

        self.repository.ensure_default_deck(user_id)
        return self.repository.add_custom_deck(user_id=user_id, name=name)

    def delete_deck(self, user_id: str, deck_id: str) -> None:
        """删除指定 deck。"""
        self.repository.delete_deck(user_id=user_id, deck_id=deck_id)
