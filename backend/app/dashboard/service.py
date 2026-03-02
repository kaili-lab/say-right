"""首页概览服务层。"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from app.card.repository import CardRepository
from app.deck.service import DeckService
from app.domain.models import User
from app.review.repository import ReviewLogRepository


class DashboardUserRepository(Protocol):
    """Dashboard 查询所需的用户仓储协议。"""

    def get_by_id(self, user_id: str) -> User | None:
        """按用户 ID 查询用户。"""
        ...


@dataclass(slots=True, frozen=True)
class HomeRecentDeckSummary:
    """首页“最近卡片组”展示项。"""

    deck_id: str
    deck_name: str
    due_count: int


@dataclass(slots=True, frozen=True)
class HomeSummary:
    """首页概览数据。"""

    display_name: str
    insight: str
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
    review_log_repository: ReviewLogRepository
    user_repository: DashboardUserRepository

    def get_home_summary(self, user_id: str) -> HomeSummary:
        """聚合首页所需核心指标。"""
        decks = self.deck_service.list_decks(user_id=user_id)
        cards = self.card_repository.list_by_user(user_id=user_id)
        review_logs = self.review_log_repository.list_by_user(user_id=user_id)
        user = self.user_repository.get_by_id(user_id)

        study_days = len({log.rated_at.date().isoformat() for log in review_logs})
        latest_rating_by_card: dict[str, str] = {}
        for log in review_logs:
            if log.card_id not in latest_rating_by_card:
                latest_rating_by_card[log.card_id] = log.final_rating
        mastered_count = sum(
            1 for rating in latest_rating_by_card.values() if rating in {"good", "easy"}
        )

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

        display_name = user.display_name if user is not None else "Learner"
        insight = self._pick_daily_insight(user_id=user_id)

        return HomeSummary(
            display_name=display_name,
            insight=insight,
            study_days=study_days,
            mastered_count=mastered_count,
            total_cards=total_cards,
            total_due=total_due,
            recent_decks=recent_decks,
        )

    @staticmethod
    def _pick_daily_insight(*, user_id: str) -> str:
        """按用户 + 日期稳定选取洞察文案，避免每次刷新跳变。"""
        tips = [
            "把一句话用三种语气复述一遍，记忆会更牢。",
            "先追求“说得出”，再追求“说得漂亮”，更容易坚持。",
            "复习时先回忆再看答案，效果通常优于直接浏览。",
            "把今天新学表达放进真实对话场景，能显著提高留存。",
            "每天 10 分钟连续学习，比周末突击更有效。",
        ]
        day_key = datetime.now(UTC).date().isoformat()
        digest = hashlib.sha1(f"{user_id}:{day_key}".encode("utf-8")).hexdigest()
        return tips[int(digest[:8], 16) % len(tips)]
