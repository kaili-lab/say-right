"""认证仓储的连接异常处理测试。"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import cast

import psycopg
from psycopg_pool import ConnectionPool
import pytest

from app.auth.repository import PostgresUserRepository


class _FakeCursor:
    def __init__(
        self,
        *,
        row: dict[str, object] | None,
        fail_once_error: Exception | None,
    ) -> None:
        self._row = row
        self._fail_once_error = fail_once_error
        self.execute_calls = 0

    def __enter__(self) -> _FakeCursor:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        _ = (exc_type, exc, tb)
        return None

    def execute(self, sql: str, params: tuple[object, ...]) -> None:
        _ = (sql, params)
        self.execute_calls += 1
        if self._fail_once_error is not None and self.execute_calls == 1:
            raise self._fail_once_error

    def fetchone(self) -> dict[str, object] | None:
        return self._row


class _FakeConnection:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor
        self.autocommit = False

    def __enter__(self) -> _FakeConnection:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        _ = (exc_type, exc, tb)
        return None

    def cursor(self, **kwargs: object) -> _FakeCursor:
        _ = kwargs
        return self._cursor


class _FakePool:
    def __init__(self, cursor: _FakeCursor) -> None:
        self._cursor = cursor
        self.connection_calls = 0

    def connection(self) -> _FakeConnection:
        self.connection_calls += 1
        return _FakeConnection(self._cursor)


def test_get_by_email_should_retry_once_when_connection_closed_unexpectedly() -> None:
    """遇到可重试连接错误时应自动重试一次，避免请求直接失败。"""
    cursor = _FakeCursor(
        row={
            "user_id": "user-1",
            "email": "alice@example.com",
            "password_hash": "hash",
            "created_at": datetime.now(UTC),
            "nickname": "Alice",
        },
        fail_once_error=psycopg.OperationalError(
            "consuming input failed: SSL connection has been closed unexpectedly",
        ),
    )
    pool = _FakePool(cursor)
    repository = PostgresUserRepository(pool=cast(ConnectionPool, pool))

    user = repository.get_by_email("alice@example.com")

    assert user is not None
    assert user.user_id == "user-1"
    assert user.email == "alice@example.com"
    assert pool.connection_calls == 2


def test_get_by_email_should_not_retry_for_non_retryable_operational_error() -> None:
    """非连接关闭类错误应原样抛出，避免掩盖真实故障。"""
    cursor = _FakeCursor(
        row=None,
        fail_once_error=psycopg.OperationalError("timeout expired"),
    )
    pool = _FakePool(cursor)
    repository = PostgresUserRepository(pool=cast(ConnectionPool, pool))

    with pytest.raises(psycopg.OperationalError, match="timeout expired"):
        repository.get_by_email("alice@example.com")

    assert pool.connection_calls == 1
