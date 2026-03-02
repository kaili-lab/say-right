"""复习 API 路由层。"""

from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth.service import AuthService
from app.deck.api import build_current_user_dependency
from app.domain.models import User
from app.review.errors import ReviewAIUnavailableError, ReviewCardNotInSessionError, ReviewSessionNotFoundError
from app.review.service import ReviewDeckSummary, ReviewService
from app.review.session_service import ReviewCardItem, ReviewSessionService, ReviewSessionSnapshot, SessionSummary


class ReviewDeckSummaryResponse(BaseModel):
    """复习 deck 列表项。"""

    deck_id: str
    deck_name: str
    due_count: int


class FSRSStateResponse(BaseModel):
    """FSRS 状态对象。"""

    due_at: datetime
    stability: float
    difficulty: float
    reps: int
    lapses: int


class ReviewSessionCardResponse(BaseModel):
    """复习 session 卡片展示对象。"""

    card_id: str
    front_text: str
    back_text: str
    fsrs_state: FSRSStateResponse


class ReviewSessionResponse(BaseModel):
    """复习 session 拉取响应。"""

    session_id: str
    cards: list[ReviewSessionCardResponse]


class AIScoreRequest(BaseModel):
    """AI 评分请求体。"""

    card_id: str = Field(min_length=1, max_length=100)
    user_answer: str = Field(min_length=1, max_length=500)

    @field_validator("card_id", "user_answer")
    @classmethod
    def validate_not_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("field must not be empty")
        return normalized


class AIScoreResponse(BaseModel):
    """AI 评分响应体。"""

    score: int
    feedback: str
    suggested_rating: Literal["again", "hard", "good", "easy"]


class RateRequest(BaseModel):
    """评级提交请求体。"""

    card_id: str = Field(min_length=1, max_length=100)
    rating_source: Literal["manual", "ai"]
    rating_value: Literal["again", "hard", "good", "easy"]
    user_answer: str | None = Field(default=None, max_length=500)

    @field_validator("card_id")
    @classmethod
    def validate_card_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("card_id must not be empty")
        return normalized


class RateResponse(BaseModel):
    """评级提交响应体。"""

    next_due_at: datetime
    updated_fsrs_state: FSRSStateResponse


class SessionSummaryResponse(BaseModel):
    """复习会话总结响应体。"""

    session_id: str
    reviewed_count: int
    accuracy: int
    rating_distribution: dict[Literal["again", "hard", "good", "easy"], int]


def _to_deck_response(item: ReviewDeckSummary) -> ReviewDeckSummaryResponse:
    return ReviewDeckSummaryResponse(
        deck_id=item.deck_id,
        deck_name=item.deck_name,
        due_count=item.due_count,
    )


def _to_card_response(card: ReviewCardItem) -> ReviewSessionCardResponse:
    return ReviewSessionCardResponse(
        card_id=card.card_id,
        front_text=card.front_text,
        back_text=card.back_text,
        fsrs_state=FSRSStateResponse(
            due_at=card.fsrs_state.due_at,
            stability=card.fsrs_state.stability,
            difficulty=card.fsrs_state.difficulty,
            reps=card.fsrs_state.reps,
            lapses=card.fsrs_state.lapses,
        ),
    )


def _to_session_response(snapshot: ReviewSessionSnapshot) -> ReviewSessionResponse:
    return ReviewSessionResponse(
        session_id=snapshot.session_id,
        cards=[_to_card_response(card) for card in snapshot.cards],
    )


def _to_summary_response(summary: SessionSummary) -> SessionSummaryResponse:
    return SessionSummaryResponse(
        session_id=summary.session_id,
        reviewed_count=summary.reviewed_count,
        accuracy=summary.accuracy,
        rating_distribution={
            "again": summary.rating_distribution["again"],
            "hard": summary.rating_distribution["hard"],
            "good": summary.rating_distribution["good"],
            "easy": summary.rating_distribution["easy"],
        },
    )


def create_review_router(
    review_service: ReviewService,
    review_session_service: ReviewSessionService,
    auth_service: AuthService,
) -> APIRouter:
    """创建复习路由集合。"""
    router = APIRouter(tags=["review"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.get("/review/decks", response_model=list[ReviewDeckSummaryResponse])
    def list_review_decks(
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> list[ReviewDeckSummaryResponse]:
        summaries = review_service.list_review_decks(user_id=current_user.user_id)
        return [_to_deck_response(item) for item in summaries]

    @router.get("/review/decks/{deck_id}/session", response_model=ReviewSessionResponse)
    def get_review_session(
        deck_id: str,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> ReviewSessionResponse:
        snapshot = review_session_service.start_session(user_id=current_user.user_id, deck_id=deck_id)
        return _to_session_response(snapshot)

    @router.post("/review/session/{session_id}/ai-score", response_model=AIScoreResponse)
    def ai_score(
        session_id: str,
        payload: AIScoreRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> AIScoreResponse:
        try:
            result = review_session_service.ai_score(
                user_id=current_user.user_id,
                session_id=session_id,
                card_id=payload.card_id,
                user_answer=payload.user_answer,
            )
        except ReviewSessionNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found") from exc
        except ReviewCardNotInSessionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="card not in session") from exc
        except ReviewAIUnavailableError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="ai unavailable") from exc

        return AIScoreResponse(
            score=result.score,
            feedback=result.feedback,
            suggested_rating=result.suggested_rating,
        )

    @router.post("/review/session/{session_id}/rate", response_model=RateResponse)
    def rate(
        session_id: str,
        payload: RateRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> RateResponse:
        try:
            result = review_session_service.rate(
                user_id=current_user.user_id,
                session_id=session_id,
                card_id=payload.card_id,
                rating_source=payload.rating_source,
                rating_value=payload.rating_value,
            )
        except ReviewSessionNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found") from exc
        except ReviewCardNotInSessionError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="card not in session") from exc

        return RateResponse(
            next_due_at=result.next_due_at,
            updated_fsrs_state=FSRSStateResponse(
                due_at=result.updated_fsrs_state.due_at,
                stability=result.updated_fsrs_state.stability,
                difficulty=result.updated_fsrs_state.difficulty,
                reps=result.updated_fsrs_state.reps,
                lapses=result.updated_fsrs_state.lapses,
            ),
        )

    @router.get("/review/session/{session_id}/summary", response_model=SessionSummaryResponse)
    def get_session_summary(
        session_id: str,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> SessionSummaryResponse:
        try:
            summary = review_session_service.get_session_summary(
                user_id=current_user.user_id,
                session_id=session_id,
            )
        except ReviewSessionNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="session not found") from exc
        return _to_summary_response(summary)

    return router
