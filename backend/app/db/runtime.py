"""运行态存储后端与数据库连接配置。

WHAT: 统一解析运行时到底使用内存仓储还是 PostgreSQL 仓储，并标准化连接串。
WHY: 避免把“建表完成”误解为“运行态已持久化”，让启动时就能明确当前数据存储模式。
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Literal, cast

StorageBackend = Literal["memory", "postgres"]

_STORAGE_ENV_KEY = "APP_STORAGE_BACKEND"
_DATABASE_URL_ENV_KEY = "DATABASE_URL"
_CORS_ALLOW_ORIGINS_ENV_KEY = "APP_CORS_ALLOW_ORIGINS"
_DB_POOL_MIN_SIZE_ENV_KEY = "APP_DB_POOL_MIN_SIZE"
_DB_POOL_MAX_SIZE_ENV_KEY = "APP_DB_POOL_MAX_SIZE"

_DEFAULT_CORS_ALLOW_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_DEFAULT_DB_POOL_MIN_SIZE = 2
_DEFAULT_DB_POOL_MAX_SIZE = 10


def resolve_storage_backend(env: Mapping[str, str] | None = None) -> StorageBackend:
    """解析运行态存储后端。"""
    env_map = env or os.environ
    explicit_backend = env_map.get(_STORAGE_ENV_KEY, "").strip().lower()
    if explicit_backend:
        if explicit_backend not in {"memory", "postgres"}:
            raise ValueError("APP_STORAGE_BACKEND must be one of: memory, postgres")
        return cast(StorageBackend, explicit_backend)

    has_database_url = bool(env_map.get(_DATABASE_URL_ENV_KEY, "").strip())
    if has_database_url:
        return "postgres"
    return "memory"


def resolve_postgres_database_url(env: Mapping[str, str] | None = None) -> str:
    """读取并标准化 PostgreSQL 连接串。"""
    env_map = env or os.environ
    raw_database_url = env_map.get(_DATABASE_URL_ENV_KEY, "").strip()
    if not raw_database_url:
        raise ValueError("DATABASE_URL is required when storage backend is postgres")
    return normalize_postgres_database_url(raw_database_url)


def normalize_postgres_database_url(database_url: str) -> str:
    """把常见 DSN 归一化为 psycopg 可识别格式。"""
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if database_url.startswith("postgresql+psycopg://"):
        return database_url.replace("postgresql+psycopg://", "postgresql://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url


def resolve_cors_allow_origins(env: Mapping[str, str] | None = None) -> list[str]:
    """解析 CORS 白名单，支持逗号分隔配置。"""
    env_map = env or os.environ
    raw_origins = env_map.get(_CORS_ALLOW_ORIGINS_ENV_KEY, "")
    configured = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    if configured:
        return configured
    return _DEFAULT_CORS_ALLOW_ORIGINS.copy()


def resolve_db_pool_size(env: Mapping[str, str] | None = None) -> tuple[int, int]:
    """解析数据库连接池大小配置。"""
    env_map = env or os.environ
    min_size = _parse_positive_int(
        raw=env_map.get(_DB_POOL_MIN_SIZE_ENV_KEY, str(_DEFAULT_DB_POOL_MIN_SIZE)),
        env_key=_DB_POOL_MIN_SIZE_ENV_KEY,
    )
    max_size = _parse_positive_int(
        raw=env_map.get(_DB_POOL_MAX_SIZE_ENV_KEY, str(_DEFAULT_DB_POOL_MAX_SIZE)),
        env_key=_DB_POOL_MAX_SIZE_ENV_KEY,
    )
    if min_size > max_size:
        raise ValueError("APP_DB_POOL_MIN_SIZE must be less than or equal to APP_DB_POOL_MAX_SIZE")
    return min_size, max_size


def _parse_positive_int(*, raw: str, env_key: str) -> int:
    text = raw.strip()
    if not text:
        raise ValueError(f"{env_key} must be a positive integer")
    try:
        value = int(text)
    except ValueError as exc:
        raise ValueError(f"{env_key} must be a positive integer") from exc
    if value <= 0:
        raise ValueError(f"{env_key} must be a positive integer")
    return value
