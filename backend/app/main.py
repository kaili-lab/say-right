"""FastAPI 应用装配入口。

本文件负责把路由、依赖与应用实例拼装在一起，
让 `uvicorn app.main:app` 有稳定且唯一的启动入口。
"""

import os
from collections.abc import Mapping

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.api import create_auth_router
from app.auth.repository import InMemoryUserRepository, PostgresUserRepository, UserRepository
from app.auth.service import AuthService
from app.card.api import create_card_router
from app.card.repository import CardRepository, InMemoryCardRepository, PostgresCardRepository
from app.card.service import CardService
from app.dashboard.api import create_dashboard_router
from app.dashboard.service import DashboardService
from app.deck.api import create_deck_router
from app.db.runtime import resolve_postgres_database_url, resolve_storage_backend
from app.deck.repository import DeckRepository, InMemoryDeckRepository, PostgresDeckRepository
from app.deck.service import DeckService
from app.domain.models import User
from app.record.api import create_record_router
from app.record.group_agent_stub import DeterministicGroupAgent
from app.record.save_agent_service import SaveWithAgentService
from app.record.service import RecordGenerateService
from app.record.stub import DeterministicEnglishGenerator
from app.review.ai_scorer_stub import DeterministicReviewAIScorer
from app.review.api import create_review_router
from app.review.service import ReviewService
from app.review.session_service import ReviewSessionService


def build_repositories_from_env(
    env: Mapping[str, str] | None = None,
) -> tuple[str, UserRepository, DeckRepository, CardRepository]:
    """按环境变量装配存储后端仓储。"""
    env_map = env or os.environ
    storage_backend = resolve_storage_backend(env_map)
    user_repository: UserRepository
    deck_repository: DeckRepository
    card_repository: CardRepository
    if storage_backend == "postgres":
        database_url = resolve_postgres_database_url(env_map)
        user_repository = PostgresUserRepository(database_url=database_url)
        deck_repository = PostgresDeckRepository(database_url=database_url)
        card_repository = PostgresCardRepository(database_url=database_url)
        return storage_backend, user_repository, deck_repository, card_repository

    user_repository = InMemoryUserRepository()
    deck_repository = InMemoryDeckRepository()
    card_repository = InMemoryCardRepository(deck_repository=deck_repository)
    return storage_backend, user_repository, deck_repository, card_repository


def build_health_payload() -> dict[str, str]:
    """构造健康检查响应体。"""
    return {"status": "ok"}


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例。"""
    application = FastAPI(title="say-right-api")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    storage_backend, user_repository, deck_repository, card_repository = build_repositories_from_env()

    auth_service = AuthService(user_repository=user_repository)
    deck_service = DeckService(repository=deck_repository)
    card_service = CardService(repository=card_repository)
    record_generate_service = RecordGenerateService(generator=DeterministicEnglishGenerator())
    save_with_agent_service = SaveWithAgentService(
        deck_service=deck_service,
        card_service=card_service,
        group_agent=DeterministicGroupAgent(),
    )
    review_service = ReviewService(deck_service=deck_service)
    review_session_service = ReviewSessionService(
        card_repository=card_repository,
        ai_scorer=DeterministicReviewAIScorer(),
    )
    dashboard_service = DashboardService(
        deck_service=deck_service,
        card_repository=card_repository,
    )

    # 暴露核心依赖给测试使用，便于构造边界数据而不污染业务 API。
    application.state.storage_backend = storage_backend
    application.state.user_repository = user_repository
    application.state.deck_repository = deck_repository
    application.state.card_repository = card_repository

    def bootstrap_default_deck(user: User) -> None:
        """在账号创建时立即补齐默认组，避免后续流程出现空组状态。"""
        deck_service.ensure_default_deck(user.user_id)

    application.include_router(
        create_auth_router(
            auth_service=auth_service,
            on_user_registered=bootstrap_default_deck,
        ),
    )
    application.include_router(
        create_deck_router(deck_service=deck_service, auth_service=auth_service),
    )
    application.include_router(
        create_card_router(card_service=card_service, auth_service=auth_service),
    )
    application.include_router(
        create_record_router(
            record_service=record_generate_service,
            save_with_agent_service=save_with_agent_service,
            auth_service=auth_service,
        ),
    )
    application.include_router(
        create_review_router(
            review_service=review_service,
            review_session_service=review_session_service,
            auth_service=auth_service,
        ),
    )
    application.include_router(
        create_dashboard_router(
            dashboard_service=dashboard_service,
            auth_service=auth_service,
        ),
    )

    @application.get("/health")
    async def health() -> dict[str, str]:
        """提供最小健康检查能力，供启动验证与监控探活使用。"""
        return build_health_payload()

    return application


app = create_app()
