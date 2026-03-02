"""FastAPI 应用装配入口。

本文件负责把路由、依赖与应用实例拼装在一起，
让 `uvicorn app.main:app` 有稳定且唯一的启动入口。
"""

from __future__ import annotations

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
from app.db.runtime import (
    resolve_cors_allow_origins,
    resolve_postgres_database_url,
    resolve_storage_backend,
)
from app.deck.api import create_deck_router
from app.deck.repository import DeckRepository, InMemoryDeckRepository, PostgresDeckRepository
from app.deck.service import DeckService
from app.domain.models import User
from app.llm.client import LangChainChatClient
from app.llm.runtime import resolve_llm_config
from app.record.api import create_record_router
from app.record.group_agent_stub import DeterministicGroupAgent, LangChainGroupAgent
from app.record.save_agent_service import GroupAgent, SaveWithAgentService
from app.record.service import EnglishGenerator, RecordGenerateService
from app.record.stub import DeterministicEnglishGenerator, LangChainEnglishGenerator
from app.review.ai_scorer import DeterministicReviewAIScorer, LangChainReviewAIScorer, ReviewAIScorer
from app.review.api import create_review_router
from app.review.repository import (
    InMemoryReviewLogRepository,
    InMemoryReviewSessionRepository,
    PostgresReviewLogRepository,
    PostgresReviewSessionRepository,
    ReviewLogRepository,
    ReviewSessionRepository,
)
from app.review.service import ReviewService
from app.review.session_service import ReviewSessionService


def build_repositories_from_env(
    env: Mapping[str, str] | None = None,
) -> tuple[
    str,
    UserRepository,
    DeckRepository,
    CardRepository,
    ReviewSessionRepository,
    ReviewLogRepository,
]:
    """按环境变量装配存储后端仓储。"""
    env_map = env or os.environ
    storage_backend = resolve_storage_backend(env_map)
    user_repository: UserRepository
    deck_repository: DeckRepository
    card_repository: CardRepository
    review_session_repository: ReviewSessionRepository
    review_log_repository: ReviewLogRepository

    if storage_backend == "postgres":
        database_url = resolve_postgres_database_url(env_map)
        user_repository = PostgresUserRepository(database_url=database_url)
        deck_repository = PostgresDeckRepository(database_url=database_url)
        card_repository = PostgresCardRepository(database_url=database_url)
        review_session_repository = PostgresReviewSessionRepository(database_url=database_url)
        review_log_repository = PostgresReviewLogRepository(database_url=database_url)
        return (
            storage_backend,
            user_repository,
            deck_repository,
            card_repository,
            review_session_repository,
            review_log_repository,
        )

    user_repository = InMemoryUserRepository()
    deck_repository = InMemoryDeckRepository()
    card_repository = InMemoryCardRepository(deck_repository=deck_repository)
    review_session_repository = InMemoryReviewSessionRepository()
    review_log_repository = InMemoryReviewLogRepository()
    return (
        storage_backend,
        user_repository,
        deck_repository,
        card_repository,
        review_session_repository,
        review_log_repository,
    )


def build_health_payload() -> dict[str, str]:
    """构造健康检查响应体。"""
    return {"status": "ok"}


def build_ai_dependencies(
    env: Mapping[str, str] | None = None,
) -> tuple[str, EnglishGenerator, GroupAgent, ReviewAIScorer]:
    """按环境配置装配 LLM 相关组件。"""
    llm_config = resolve_llm_config(dict(env or os.environ))
    if llm_config.mode == "provider":
        assert llm_config.api_key is not None
        model_hint = f"provider:{llm_config.model}"
        client = LangChainChatClient(
            model=llm_config.model,
            api_key=llm_config.api_key,
            base_url=llm_config.base_url,
        )
        return (
            llm_config.mode,
            LangChainEnglishGenerator(client=client, model_hint=model_hint),
            LangChainGroupAgent(client=client, model_hint=model_hint),
            LangChainReviewAIScorer(client=client, model_hint=model_hint),
        )

    return (
        llm_config.mode,
        DeterministicEnglishGenerator(),
        DeterministicGroupAgent(),
        DeterministicReviewAIScorer(),
    )


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例。"""
    application = FastAPI(title="say-right-api")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolve_cors_allow_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    (
        storage_backend,
        user_repository,
        deck_repository,
        card_repository,
        review_session_repository,
        review_log_repository,
    ) = build_repositories_from_env()

    llm_mode, english_generator, group_agent, ai_scorer = build_ai_dependencies()

    auth_service = AuthService(user_repository=user_repository)
    deck_service = DeckService(repository=deck_repository)
    card_service = CardService(repository=card_repository)
    record_generate_service = RecordGenerateService(generator=english_generator)
    save_with_agent_service = SaveWithAgentService(
        deck_service=deck_service,
        card_service=card_service,
        group_agent=group_agent,
    )
    review_service = ReviewService(deck_service=deck_service)
    review_session_service = ReviewSessionService(
        card_repository=card_repository,
        ai_scorer=ai_scorer,
        session_repository=review_session_repository,
        review_log_repository=review_log_repository,
    )
    dashboard_service = DashboardService(
        deck_service=deck_service,
        card_repository=card_repository,
        review_log_repository=review_log_repository,
        user_repository=user_repository,
    )

    # 暴露核心依赖给测试使用，便于构造边界数据而不污染业务 API。
    application.state.storage_backend = storage_backend
    application.state.llm_mode = llm_mode
    application.state.user_repository = user_repository
    application.state.deck_repository = deck_repository
    application.state.card_repository = card_repository
    application.state.review_session_repository = review_session_repository
    application.state.review_log_repository = review_log_repository

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
