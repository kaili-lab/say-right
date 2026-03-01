"""复习 session、AI 评分与评级提交服务。"""

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Protocol
from uuid import uuid4

from app.card.repository import CardNotFoundError
from app.domain.models import Card
from app.review.ai_scorer_stub import AIScoreResult, DeterministicReviewAIScorer
from app.review.errors import ReviewCardNotInSessionError, ReviewSessionNotFoundError
from app.review.fsrs_scheduler import FSRSState, RatingValue, schedule_next


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
class _Session:
    """内存 session 记录。"""

    session_id: str
    user_id: str
    deck_id: str
    card_ids: set[str]


@dataclass(slots=True)
class ReviewSessionService:
    """复习 session 服务。"""

    card_repository: ReviewCardRepository
    ai_scorer: DeterministicReviewAIScorer
    _sessions: dict[str, _Session] = field(init=False, default_factory=dict)

    def start_session(self, *, user_id: str, deck_id: str) -> ReviewSessionSnapshot:
        """为用户拉取 deck 会话卡片并创建 session。"""
        cards = self.card_repository.list_by_deck(user_id=user_id, deck_id=deck_id)
        session_id = str(uuid4())
        session = _Session(
            session_id=session_id,
            user_id=user_id,
            deck_id=deck_id,
            card_ids={card.card_id for card in cards},
        )
        self._sessions[session_id] = session

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
            for card in cards
        ]
        return ReviewSessionSnapshot(session_id=session_id, cards=items)

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
        rating_value: RatingValue,
    ) -> RateResult:
        """提交评级并更新卡片 FSRS 状态。"""
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
            now=datetime.now(UTC),
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
        return RateResult(next_due_at=next_state.due_at, updated_fsrs_state=next_state)

    def _get_session_card(self, *, user_id: str, session_id: str, card_id: str) -> Card:
        session = self._sessions.get(session_id)
        if session is None or session.user_id != user_id:
            raise ReviewSessionNotFoundError("session not found")
        if card_id not in session.card_ids:
            raise ReviewCardNotInSessionError("card not in session")

        try:
            return self.card_repository.get_by_id(user_id=user_id, card_id=card_id)
        except CardNotFoundError as exc:
            raise ReviewCardNotInSessionError("card not in session") from exc
