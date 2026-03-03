"""连接池装配与批量写入相关测试。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from fastapi.testclient import TestClient
from psycopg_pool import ConnectionPool
import pytest

from app import main as app_main
from app.auth.repository import InMemoryUserRepository, PostgresUserRepository
from app.card.repository import InMemoryCardRepository, PostgresCardRepository
from app.deck.repository import InMemoryDeckRepository, PostgresDeckRepository
from app.record.group_agent_stub import DeterministicGroupAgent
from app.record.stub import DeterministicEnglishGenerator
from app.review.ai_scorer import DeterministicReviewAIScorer
from app.review.repository import (
    InMemoryReviewLogRepository,
    InMemoryReviewSessionRepository,
    PostgresReviewLogRepository,
    PostgresReviewSessionRepository,
)


@dataclass(slots=True)
class _FakePool:
    closed: bool = False

    def close(self) -> None:
        self.closed = True


class _FakeCursor:
    def __init__(self) -> None:
        self.execute_calls: list[tuple[str, tuple[object, ...]]] = []
        self.executemany_calls: list[tuple[str, list[tuple[object, ...]]]] = []

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        return None

    def execute(self, sql: str, params: tuple[object, ...]) -> None:
        self.execute_calls.append((sql, params))

    def executemany(self, sql: str, params_list: list[tuple[object, ...]]) -> None:
        self.executemany_calls.append((sql, params_list))


class _FakeConnection:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor

    def __enter__(self) -> "_FakeConnection":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # noqa: ANN001
        return None

    def cursor(self, **kwargs: object) -> _FakeCursor:
        _ = kwargs
        return self._cursor


class _FakePoolForRepo:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor

    def connection(self) -> _FakeConnection:
        return _FakeConnection(self._cursor)


def test_build_repositories_from_env_should_inject_same_pool_into_all_postgres_repositories(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Postgres 路径应复用同一个连接池实例。"""
    fake_pool = _FakePool()

    def fake_create_pool(*, database_url: str, min_size: int, max_size: int) -> _FakePool:
        assert database_url.startswith("postgresql://")
        assert (min_size, max_size) == (2, 10)
        return fake_pool

    monkeypatch.setattr(app_main, "create_connection_pool", fake_create_pool)

    (
        storage_backend,
        user_repository,
        deck_repository,
        card_repository,
        session_repository,
        log_repository,
        db_pool,
    ) = app_main.build_repositories_from_env(
        {
            "APP_STORAGE_BACKEND": "postgres",
            "DATABASE_URL": "postgresql://user:pass@localhost:5432/demo",
        },
    )

    assert storage_backend == "postgres"
    assert db_pool is fake_pool
    assert isinstance(user_repository, PostgresUserRepository)
    assert isinstance(deck_repository, PostgresDeckRepository)
    assert isinstance(card_repository, PostgresCardRepository)
    assert isinstance(session_repository, PostgresReviewSessionRepository)
    assert isinstance(log_repository, PostgresReviewLogRepository)
    assert user_repository._pool is fake_pool
    assert deck_repository._pool is fake_pool
    assert card_repository._pool is fake_pool
    assert session_repository._pool is fake_pool
    assert log_repository._pool is fake_pool


def test_create_app_should_close_pool_on_shutdown(monkeypatch: pytest.MonkeyPatch) -> None:
    """应用关闭时应释放连接池。"""
    fake_pool = _FakePool()

    def fake_build_repositories(env=None):  # noqa: ANN001, ANN202
        _ = env
        deck_repository = InMemoryDeckRepository()
        return (
            "postgres",
            InMemoryUserRepository(),
            deck_repository,
            InMemoryCardRepository(deck_repository=deck_repository),
            InMemoryReviewSessionRepository(),
            InMemoryReviewLogRepository(),
            fake_pool,
        )

    def fake_build_ai_dependencies(env=None):  # noqa: ANN001, ANN202
        _ = env
        return (
            "deterministic",
            DeterministicEnglishGenerator(),
            DeterministicGroupAgent(),
            DeterministicReviewAIScorer(),
        )

    monkeypatch.setattr(app_main, "build_repositories_from_env", fake_build_repositories)
    monkeypatch.setattr(app_main, "build_ai_dependencies", fake_build_ai_dependencies)

    app = app_main.create_app()
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200

    assert fake_pool.closed is True


def test_postgres_review_session_create_session_should_use_executemany_for_cards() -> None:
    """session 卡片写入应使用批量插入。"""
    cursor = _FakeCursor()
    pool = _FakePoolForRepo(cursor)
    repository = PostgresReviewSessionRepository(pool=cast(ConnectionPool, pool))

    repository.create_session(
        user_id="user-1",
        deck_id="deck-1",
        card_ids=["card-1", "card-2", "card-3"],
    )

    assert len(cursor.execute_calls) == 1
    assert len(cursor.executemany_calls) == 1
    _, params_list = cursor.executemany_calls[0]
    assert len(params_list) == 3
