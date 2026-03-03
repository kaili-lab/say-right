"""数据库连接池工具。"""

from __future__ import annotations

import logging

from psycopg_pool import ConnectionPool

logger = logging.getLogger(__name__)


def create_connection_pool(*, database_url: str, min_size: int, max_size: int) -> ConnectionPool:
    """创建 PostgreSQL 连接池并记录脱敏配置。"""
    pool = ConnectionPool(
        conninfo=database_url,
        min_size=min_size,
        max_size=max_size,
        open=True,
    )
    logger.info(
        "PostgreSQL connection pool initialized (min_size=%s, max_size=%s)",
        min_size,
        max_size,
    )
    return pool
