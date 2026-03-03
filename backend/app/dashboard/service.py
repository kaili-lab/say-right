"""首页概览服务层。"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime

from app.dashboard.repository import DashboardRepository
from app.domain.models import User


@dataclass(slots=True, frozen=True)
class HomeRecentDeckSummary:
    """首页最近卡片组展示项。"""

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

    dashboard_repository: DashboardRepository

    def get_home_summary(self, user: User) -> HomeSummary:
        """聚合首页所需核心指标。"""
        stats = self.dashboard_repository.get_stats(user.user_id)

        recent_decks = [
            HomeRecentDeckSummary(
                deck_id=d.deck_id,
                deck_name=d.deck_name,
                due_count=d.due_count,
            )
            for d in stats.recent_decks
        ]

        return HomeSummary(
            display_name=user.display_name,
            insight=self._pick_daily_insight(user_id=user.user_id),
            study_days=stats.study_days,
            mastered_count=stats.mastered_count,
            total_cards=stats.total_cards,
            total_due=stats.total_due,
            recent_decks=recent_decks,
        )

    @staticmethod
    def _pick_daily_insight(*, user_id: str) -> str:
        """按用户 + 日期稳定选取洞察文案，避免每次刷新跳变。"""
        tips = [
            "\u628a\u4e00\u53e5\u8bdd\u7528\u4e09\u79cd\u8bed\u6c14\u590d\u8ff0\u4e00\u904d\uff0c\u8bb0\u5fc6\u4f1a\u66f4\u7262\u3002",
            "\u5148\u8ffd\u6c42\u201c\u8bf4\u5f97\u51fa\u201d\uff0c\u518d\u8ffd\u6c42\u201c\u8bf4\u5f97\u6f02\u4eae\u201d\uff0c\u66f4\u5bb9\u6613\u575a\u6301\u3002",
            "\u590d\u4e60\u65f6\u5148\u56de\u5fc6\u518d\u770b\u7b54\u6848\uff0c\u6548\u679c\u901a\u5e38\u4f18\u4e8e\u76f4\u63a5\u6d4f\u89c8\u3002",
            "\u628a\u4eca\u5929\u65b0\u5b66\u8868\u8fbe\u653e\u8fdb\u771f\u5b9e\u5bf9\u8bdd\u573a\u666f\uff0c\u80fd\u663e\u8457\u63d0\u9ad8\u7559\u5b58\u3002",
            "\u6bcf\u5929 10 \u5206\u949f\u8fde\u7eed\u5b66\u4e60\uff0c\u6bd4\u5468\u672b\u7a81\u51fb\u66f4\u6709\u6548\u3002",
        ]
        day_key = datetime.now(UTC).date().isoformat()
        digest = hashlib.sha1(f"{user_id}:{day_key}".encode("utf-8")).hexdigest()
        return tips[int(digest[:8], 16) % len(tips)]
