"""复习查询服务层。"""

from dataclasses import dataclass

from app.deck.service import DeckService


@dataclass(slots=True, frozen=True)
class ReviewDeckSummary:
    """复习 deck 摘要。"""

    deck_id: str
    deck_name: str
    due_count: int


@dataclass(slots=True)
class ReviewService:
    """复习域服务。"""

    deck_service: DeckService

    def list_review_decks(self, user_id: str) -> list[ReviewDeckSummary]:
        """返回用户复习 deck 列表并按 due_count 降序排序。"""
        decks = self.deck_service.list_decks(user_id=user_id)
        summaries = [
            ReviewDeckSummary(
                deck_id=deck.deck_id,
                deck_name=deck.name,
                due_count=deck.due_count,
            )
            for deck in decks
        ]
        return sorted(summaries, key=lambda item: item.due_count, reverse=True)
