"""首页概览仓储层。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.card.repository import CardRepository
from app.db.helpers import run_readonly
from app.deck.service import DeckService
from app.review.repository import ReviewLogRepository


@dataclass(slots=True, frozen=True)
class DashboardStats:
    """首页聚合统计数据。"""

    study_days: int
    mastered_count: int
    total_cards: int
    total_due: int
    recent_decks: list[DashboardRecentDeck]


@dataclass(slots=True, frozen=True)
class DashboardRecentDeck:
    """首页最近卡片组。"""

    deck_id: str
    deck_name: str
    due_count: int


class DashboardRepository(Protocol):
    """首页聚合数据仓储协议。"""

    def get_stats(self, user_id: str) -> DashboardStats:
        """获取用户首页聚合统计。"""
        ...


class InMemoryDashboardRepository:
    """内存版首页聚合仓储（保持现有 Python 聚合逻辑）。"""

    def __init__(
        self,
        *,
        deck_service: DeckService,
        card_repository: CardRepository,
        review_log_repository: ReviewLogRepository,
    ) -> None:
        self._deck_service = deck_service
        self._card_repository = card_repository
        self._review_log_repository = review_log_repository

    def get_stats(self, user_id: str) -> DashboardStats:
        decks = self._deck_service.list_decks(user_id=user_id)
        cards = self._card_repository.list_by_user(user_id=user_id)
        review_logs = self._review_log_repository.list_by_user(user_id=user_id)

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
            DashboardRecentDeck(
                deck_id=deck.deck_id,
                deck_name=deck.name,
                due_count=deck.due_count,
            )
            for deck in sorted(decks, key=lambda item: item.created_at, reverse=True)[:3]
        ]

        return DashboardStats(
            study_days=study_days,
            mastered_count=mastered_count,
            total_cards=total_cards,
            total_due=total_due,
            recent_decks=recent_decks,
        )


class PostgresDashboardRepository:
    """PostgreSQL 版首页聚合仓储 — 使用 SQL 聚合，不拉全量数据。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        self._pool = pool

    def get_stats(self, user_id: str) -> DashboardStats:
        def _query(connection: Connection[Any]) -> DashboardStats:
            with connection.cursor(row_factory=dict_row) as cur:
                # 1) 核心聚合：study_days + mastered_count + total_cards
                cur.execute(
                    """
                    WITH latest_ratings AS (
                        SELECT DISTINCT ON (card_id)
                            card_id,
                            final_rating
                        FROM review_logs
                        WHERE user_id = %s
                        ORDER BY card_id, rated_at DESC
                    )
                    SELECT
                        (SELECT COUNT(DISTINCT rated_at::date)
                         FROM review_logs WHERE user_id = %s
                        ) AS study_days,
                        COALESCE(
                            (SELECT COUNT(*)
                             FROM latest_ratings
                             WHERE final_rating IN ('good', 'easy')
                            ), 0
                        ) AS mastered_count,
                        (SELECT COUNT(*)
                         FROM cards WHERE user_id = %s
                        ) AS total_cards,
                        COALESCE(
                            (SELECT SUM(due_count)
                             FROM decks WHERE user_id = %s
                            ), 0
                        ) AS total_due
                    """,
                    (user_id, user_id, user_id, user_id),
                )
                stats_row = cur.fetchone()
                assert stats_row is not None

                # 2) 最近 3 个 deck
                cur.execute(
                    """
                    SELECT deck_id, name, due_count
                    FROM decks
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 3
                    """,
                    (user_id,),
                )
                deck_rows = cur.fetchall()

            recent_decks = [
                DashboardRecentDeck(
                    deck_id=str(row["deck_id"]),
                    deck_name=str(row["name"]),
                    due_count=int(row["due_count"]),
                )
                for row in deck_rows
            ]

            return DashboardStats(
                study_days=int(stats_row["study_days"]),
                mastered_count=int(stats_row["mastered_count"]),
                total_cards=int(stats_row["total_cards"]),
                total_due=int(stats_row["total_due"]),
                recent_decks=recent_decks,
            )

        return run_readonly(
            pool=self._pool,
            operation_name="dashboard_get_stats",
            operation=_query,
        )
