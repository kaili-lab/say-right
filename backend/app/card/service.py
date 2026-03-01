"""Card 服务层。"""

from dataclasses import dataclass
from datetime import datetime

from app.card.repository import CardRepository
from app.domain.models import Card


class InvalidCardPayloadError(ValueError):
    """Card 请求参数非法。"""


@dataclass(slots=True)
class CardService:
    """Card 领域服务。"""

    repository: CardRepository

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
        """创建卡片（供后续 Agent 链路复用）。"""
        normalized_front = front_text.strip()
        normalized_back = back_text.strip()
        if not normalized_front or not normalized_back:
            raise InvalidCardPayloadError("card text must not be empty")

        return self.repository.create_card(
            user_id=user_id,
            deck_id=deck_id,
            front_text=normalized_front,
            back_text=normalized_back,
            source_lang=source_lang,
            target_lang=target_lang,
            due_at=due_at,
            stability=stability,
            difficulty=difficulty,
            reps=reps,
            lapses=lapses,
        )

    def list_cards(self, *, user_id: str, deck_id: str) -> list[Card]:
        """查询 deck 下卡片列表。"""
        return self.repository.list_by_deck(user_id=user_id, deck_id=deck_id)

    def update_card(
        self,
        *,
        user_id: str,
        card_id: str,
        front_text: str | None,
        back_text: str | None,
    ) -> Card:
        """更新卡片文案并保留 FSRS 状态。"""
        if front_text is None and back_text is None:
            raise InvalidCardPayloadError("at least one field must be provided")

        current = self.repository.get_by_id(user_id=user_id, card_id=card_id)
        next_front = front_text.strip() if front_text is not None else current.front_text
        next_back = back_text.strip() if back_text is not None else current.back_text

        if not next_front or not next_back:
            raise InvalidCardPayloadError("card text must not be empty")

        return self.repository.update_text(
            user_id=user_id,
            card_id=card_id,
            front_text=next_front,
            back_text=next_back,
        )

    def delete_card(self, *, user_id: str, card_id: str) -> None:
        """删除卡片。"""
        self.repository.delete_card(user_id=user_id, card_id=card_id)

    def move_card(self, *, user_id: str, card_id: str, to_deck_id: str) -> Card:
        """移动卡片到目标组。"""
        return self.repository.move_card(
            user_id=user_id,
            card_id=card_id,
            to_deck_id=to_deck_id,
        )
