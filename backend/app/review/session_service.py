"""复习 session、AI 评分与评级提交服务。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from app.card.repository import CardNotFoundError
from app.domain.models import Card
from app.review.ai_scorer import AIScoreResult, ReviewAIScorer
from app.review.errors import ReviewCardNotInSessionError, ReviewSessionNotFoundError
from app.review.fsrs_scheduler import FSRSState, RatingValue, schedule_next
from app.review.repository import (
    RatingSource,
    ReviewLogEntry,
    ReviewLogRepository,
    ReviewSessionRepository,
)

DEFAULT_DAILY_NEW_LIMIT = 20
DEFAULT_DAILY_REVIEW_LIMIT = 100


class ReviewCardRepository(Protocol):
    """复习服务依赖的卡片仓储协议。"""

    def list_by_deck(self, *, user_id: str, deck_id: str) -> list[Card]:
        """查询 deck 下卡片列表。"""
        ...

    def get_by_id(self, *, user_id: str, card_id: str) -> Card:
        """按 id 查询卡片。"""
        ...

    def update_fsrs_state(
        self,
        *,
        user_id: str,
        card_id: str,
        due_at: datetime,
        stability: float,
        difficulty: float,
        reps: int,
        lapses: int,
    ) -> Card:
        """更新卡片 FSRS 状态。"""
        ...


@dataclass(slots=True, frozen=True)
class ReviewCardItem:
    """session 卡片展示项。"""

    card_id: str
    front_text: str
    back_text: str
    fsrs_state: FSRSState


@dataclass(slots=True, frozen=True)
class ReviewSessionSnapshot:
    """session 拉取响应模型。"""

    session_id: str
    cards: list[ReviewCardItem]


@dataclass(slots=True, frozen=True)
class RateResult:
    """评级提交结果。"""

    next_due_at: datetime
    updated_fsrs_state: FSRSState


@dataclass(slots=True, frozen=True)
class SessionSummary:
    """复习会话总结。"""

    session_id: str
    reviewed_count: int
    accuracy: int
    rating_distribution: dict[RatingValue, int]


@dataclass(slots=True)
class ReviewSessionService:
    """复习 session 服务。"""

    card_repository: ReviewCardRepository
    ai_scorer: ReviewAIScorer
    session_repository: ReviewSessionRepository
    review_log_repository: ReviewLogRepository
    daily_new_limit: int = DEFAULT_DAILY_NEW_LIMIT
    daily_review_limit: int = DEFAULT_DAILY_REVIEW_LIMIT

    def start_session(self, *, user_id: str, deck_id: str) -> ReviewSessionSnapshot:
        """为用户拉取 deck 会话卡片并创建 session。"""
        now = datetime.now(UTC)
        today = now.date()
        cards = [card for card in self.card_repository.list_by_deck(user_id=user_id, deck_id=deck_id) if card.due_at <= now]
        sorted_cards = sorted(cards, key=lambda item: (item.due_at, item.created_at, item.card_id))

        review_cards = [card for card in sorted_cards if card.reps > 0]
        new_cards = [card for card in sorted_cards if card.reps == 0]

        reviewed_today = self.review_log_repository.count_daily_by_kind(
            user_id=user_id,
            target_date=today,
            is_new_card=False,
        )
        introduced_today = self.review_log_repository.count_daily_by_kind(
            user_id=user_id,
            target_date=today,
            is_new_card=True,
        )
        review_quota = max(0, self.daily_review_limit - reviewed_today)
        new_quota = max(0, self.daily_new_limit - introduced_today)

        selected_cards = review_cards[:review_quota] + new_cards[:new_quota]
        session = self.session_repository.create_session(
            user_id=user_id,
            deck_id=deck_id,
            card_ids=[card.card_id for card in selected_cards],
        )

        items = [
            ReviewCardItem(
                card_id=card.card_id,
                front_text=card.front_text,
                back_text=card.back_text,
                fsrs_state=FSRSState(
                    due_at=card.due_at,
                    stability=card.stability,
                    difficulty=card.difficulty,
                    reps=card.reps,
                    lapses=card.lapses,
                ),
            )
            for card in selected_cards
        ]
        return ReviewSessionSnapshot(session_id=session.session_id, cards=items)

    def ai_score(
        self,
        *,
        user_id: str,
        session_id: str,
        card_id: str,
        user_answer: str,
    ) -> AIScoreResult:
        """对用户答案进行 AI 评分并返回建议评级。"""
        card = self._get_session_card(user_id=user_id, session_id=session_id, card_id=card_id)
        return self.ai_scorer.score(expected_answer=card.back_text, user_answer=user_answer)

    def rate(
        self,
        *,
        user_id: str,
        session_id: str,
        card_id: str,
        rating_source: RatingSource,
        rating_value: RatingValue,
    ) -> RateResult:
        """提交评级并更新卡片 FSRS 状态。"""
        now = datetime.now(UTC)
        card = self._get_session_card(user_id=user_id, session_id=session_id, card_id=card_id)
        next_state = schedule_next(
            state=FSRSState(
                due_at=card.due_at,
                stability=card.stability,
                difficulty=card.difficulty,
                reps=card.reps,
                lapses=card.lapses,
            ),
            rating=rating_value,
            now=now,
        )
        self.card_repository.update_fsrs_state(
            user_id=user_id,
            card_id=card_id,
            due_at=next_state.due_at,
            stability=next_state.stability,
            difficulty=next_state.difficulty,
            reps=next_state.reps,
            lapses=next_state.lapses,
        )
        self.review_log_repository.add_log(
            ReviewLogEntry.create(
                user_id=user_id,
                card_id=card_id,
                session_id=session_id,
                rating_source=rating_source,
                final_rating=rating_value,
                is_new_card=card.reps == 0,
                rated_at=now,
                fsrs_snapshot={
                    "due_at": next_state.due_at.isoformat(),
                    "stability": next_state.stability,
                    "difficulty": next_state.difficulty,
                    "reps": next_state.reps,
                    "lapses": next_state.lapses,
                },
            ),
        )
        return RateResult(next_due_at=next_state.due_at, updated_fsrs_state=next_state)

    def get_session_summary(self, *, user_id: str, session_id: str) -> SessionSummary:
        """聚合指定 session 的复习总结。"""
        session = self.session_repository.get_session(session_id=session_id)
        if session is None or session.user_id != user_id:
            raise ReviewSessionNotFoundError("session not found")

        logs = self.review_log_repository.list_by_session(user_id=user_id, session_id=session_id)
        distribution: dict[RatingValue, int] = {
            "again": 0,
            "hard": 0,
            "good": 0,
            "easy": 0,
        }
        for log in logs:
            distribution[log.final_rating] += 1

        reviewed_count = len(logs)
        if reviewed_count == 0:
            accuracy = 0
        else:
            accuracy = round(((distribution["good"] + distribution["easy"]) / reviewed_count) * 100)

        return SessionSummary(
            session_id=session_id,
            reviewed_count=reviewed_count,
            accuracy=accuracy,
            rating_distribution=distribution,
        )

    def _get_session_card(self, *, user_id: str, session_id: str, card_id: str) -> Card:
        session = self.session_repository.get_session(session_id=session_id)
        if session is None or session.user_id != user_id:
            raise ReviewSessionNotFoundError("session not found")

        card_ids = set(self.session_repository.list_session_card_ids(session_id=session_id))
        if card_id not in card_ids:
            raise ReviewCardNotInSessionError("card not in session")

        try:
            return self.card_repository.get_by_id(user_id=user_id, card_id=card_id)
        except CardNotFoundError as exc:
            raise ReviewCardNotInSessionError("card not in session") from exc
