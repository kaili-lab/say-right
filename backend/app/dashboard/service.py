"""首页概览服务层。"""

from dataclasses import dataclass

from app.card.repository import CardRepository
from app.deck.service import DeckService


@dataclass(slots=True, frozen=True)
class HomeRecentDeckSummary:
    """首页“最近卡片组”展示项。"""

    deck_id: str
    deck_name: str
    due_count: int


@dataclass(slots=True, frozen=True)
class HomeSummary:
    """首页概览数据。"""

    study_days: int
    mastered_count: int
    total_cards: int
    total_due: int
    recent_decks: list[HomeRecentDeckSummary]


@dataclass(slots=True)
class DashboardService:
    """首页概览服务。"""

    deck_service: DeckService
    card_repository: CardRepository

    def get_home_summary(self, user_id: str) -> HomeSummary:
        """聚合首页所需核心指标。"""
        decks = self.deck_service.list_decks(user_id=user_id)
        cards = self.card_repository.list_by_user(user_id=user_id)

        mastered_cards = [card for card in cards if card.reps > 0]
        # 学习天数按“发生过复习行为”的自然日去重统计，避免把新建未复习卡片计入学习日。
        study_days = len({card.updated_at.date().isoformat() for card in mastered_cards})
        mastered_count = len(mastered_cards)
        total_cards = len(cards)
        total_due = sum(deck.due_count for deck in decks)

        recent_decks = [
            HomeRecentDeckSummary(
                deck_id=deck.deck_id,
                deck_name=deck.name,
                due_count=deck.due_count,
            )
            for deck in sorted(decks, key=lambda item: item.created_at, reverse=True)[:3]
        ]

        return HomeSummary(
            study_days=study_days,
            mastered_count=mastered_count,
            total_cards=total_cards,
            total_due=total_due,
            recent_decks=recent_decks,
        )
