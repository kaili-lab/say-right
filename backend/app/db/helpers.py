"""数据库公共辅助工具。"""

from __future__ import annotations

import logging
from typing import Any, Callable, TypeVar

import psycopg
from psycopg import Connection
from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)

_T = TypeVar("_T")

_RETRYABLE_CONNECTION_ERROR_HINT = "connection has been closed unexpectedly"


def run_with_retry(
    *,
    pool: ConnectionPool,
    operation_name: str,
    operation: Callable[[Connection[Any]], _T],
) -> _T:
    """在连接池场景下对可重试连接错误做一次幂等重试。"""
    for attempt in (1, 2):
        try:
            with pool.connection() as connection:
                return operation(connection)
        except psycopg.OperationalError as exc:
            if attempt == 2 or not _is_retryable_connection_error(exc):
                raise
            logger.warning(
                "Transient PostgreSQL connection error in %s, retrying once: %s",
                operation_name,
                exc,
            )
    raise RuntimeError("unreachable")


def run_readonly(
    *,
    pool: ConnectionPool,
    operation_name: str,
    operation: Callable[[Connection[Any]], _T],
) -> _T:
    """只读操作：autocommit 模式 + 连接重试。

    在 autocommit 下执行读操作，省去事务收尾的 COMMIT 往返。
    finally 中安全恢复 autocommit = False，防止断连时异常屏蔽重试。
    """
    def _wrapped(connection: Connection[Any]) -> _T:
        connection.autocommit = True
        try:
            return operation(connection)
        finally:
            try:
                connection.autocommit = False
            except Exception:  # noqa: BLE001
                pass

    return run_with_retry(pool=pool, operation_name=operation_name, operation=_wrapped)


def _is_retryable_connection_error(exc: psycopg.OperationalError) -> bool:
    return _RETRYABLE_CONNECTION_ERROR_HINT in str(exc).lower()
