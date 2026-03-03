"""数据库公共辅助工具测试。"""

from __future__ import annotations

from typing import Any, cast

import psycopg
from psycopg import Connection
from psycopg_pool import ConnectionPool
import pytest

from app.db.helpers import run_with_retry


class _FakeConnection:
    def __init__(self) -> None:
        self.autocommit = False

    def __enter__(self) -> _FakeConnection:
        return self

    def __exit__(self, exc_type: object, exc: object, tb: object) -> None:
        return None


class _FakePool:
    def __init__(self) -> None:
        self.connection_calls = 0

    def connection(self) -> _FakeConnection:
        self.connection_calls += 1
        return _FakeConnection()


def test_run_with_retry_should_succeed_on_first_attempt() -> None:
    """正常情况下一次即成功。"""
    pool = _FakePool()

    result = run_with_retry(
        pool=cast(ConnectionPool, pool),
        operation_name="test_op",
        operation=lambda conn: "ok",
    )

    assert result == "ok"
    assert pool.connection_calls == 1


def test_run_with_retry_should_retry_once_on_retryable_error() -> None:
    """遇到可重试连接错误时应自动重试一次。"""
    pool = _FakePool()
    call_count = 0

    def _op(conn: Connection[Any]) -> str:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise psycopg.OperationalError(
                "SSL connection has been closed unexpectedly",
            )
        return "ok"

    result = run_with_retry(
        pool=cast(ConnectionPool, pool),
        operation_name="test_op",
        operation=_op,
    )

    assert result == "ok"
    assert pool.connection_calls == 2


def test_run_with_retry_should_not_retry_non_retryable_error() -> None:
    """非连接关闭类错误应原样抛出。"""
    pool = _FakePool()

    with pytest.raises(psycopg.OperationalError, match="timeout"):
        run_with_retry(
            pool=cast(ConnectionPool, pool),
            operation_name="test_op",
            operation=lambda conn: (_ for _ in ()).throw(
                psycopg.OperationalError("timeout"),
            ),
        )

    assert pool.connection_calls == 1


def test_run_with_retry_should_raise_after_max_attempts() -> None:
    """重试后仍失败应抛出异常。"""
    pool = _FakePool()

    def _always_fail(conn: Connection[Any]) -> str:
        raise psycopg.OperationalError(
            "connection has been closed unexpectedly",
        )

    with pytest.raises(psycopg.OperationalError, match="closed unexpectedly"):
        run_with_retry(
            pool=cast(ConnectionPool, pool),
            operation_name="test_op",
            operation=_always_fail,
        )

    assert pool.connection_calls == 2
