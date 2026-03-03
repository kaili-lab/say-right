"""首页概览 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth.service import AuthService
from app.deck.api import build_current_user_dependency
from app.domain.models import User
from app.dashboard.service import DashboardService, HomeRecentDeckSummary, HomeSummary


class HomeRecentDeckSummaryResponse(BaseModel):
    """最近卡片组响应项。"""

    id: str
    name: str
    due_count: int


class HomeSummaryResponse(BaseModel):
    """首页概览响应体。"""

    display_name: str
    insight: str
    study_days: int
    mastered_count: int
    total_cards: int
    total_due: int
    recent_decks: list[HomeRecentDeckSummaryResponse]


def _to_recent_deck_response(item: HomeRecentDeckSummary) -> HomeRecentDeckSummaryResponse:
    return HomeRecentDeckSummaryResponse(
        id=item.deck_id,
        name=item.deck_name,
        due_count=item.due_count,
    )


def _to_home_summary_response(summary: HomeSummary) -> HomeSummaryResponse:
    return HomeSummaryResponse(
        display_name=summary.display_name,
        insight=summary.insight,
        study_days=summary.study_days,
        mastered_count=summary.mastered_count,
        total_cards=summary.total_cards,
        total_due=summary.total_due,
        recent_decks=[_to_recent_deck_response(item) for item in summary.recent_decks],
    )


def create_dashboard_router(
    dashboard_service: DashboardService,
    auth_service: AuthService,
) -> APIRouter:
    """创建首页概览路由。"""
    router = APIRouter(tags=["dashboard"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.get("/dashboard/home-summary", response_model=HomeSummaryResponse)
    def get_home_summary(
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> HomeSummaryResponse:
        summary = dashboard_service.get_home_summary(user=current_user)
        return _to_home_summary_response(summary)

    return router
