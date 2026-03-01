"""复习 API 路由层。"""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.service import AuthService
from app.deck.api import build_current_user_dependency
from app.domain.models import User
from app.review.service import ReviewDeckSummary, ReviewService


class ReviewDeckSummaryResponse(BaseModel):
    """复习 deck 列表项。"""

    deck_id: str
    deck_name: str
    due_count: int


def _to_response(item: ReviewDeckSummary) -> ReviewDeckSummaryResponse:
    return ReviewDeckSummaryResponse(
        deck_id=item.deck_id,
        deck_name=item.deck_name,
        due_count=item.due_count,
    )


def create_review_router(review_service: ReviewService, auth_service: AuthService) -> APIRouter:
    """创建复习路由集合。"""
    router = APIRouter(tags=["review"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.get("/review/decks", response_model=list[ReviewDeckSummaryResponse])
    def list_review_decks(
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> list[ReviewDeckSummaryResponse]:
        summaries = review_service.list_review_decks(user_id=current_user.user_id)
        return [_to_response(item) for item in summaries]

    return router
