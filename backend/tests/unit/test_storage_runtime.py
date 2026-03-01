"""运行态存储配置解析测试。"""

import pytest

from app.db.runtime import (
    normalize_postgres_database_url,
    resolve_postgres_database_url,
    resolve_storage_backend,
)


def test_resolve_storage_backend_prefers_explicit_value() -> None:
    """显式配置应优先于自动推断。"""
    backend = resolve_storage_backend(
        {
            "APP_STORAGE_BACKEND": "memory",
            "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        },
    )
    assert backend == "memory"


def test_resolve_storage_backend_auto_detects_postgres() -> None:
    """未显式指定时，存在数据库连接串应默认启用 postgres。"""
    backend = resolve_storage_backend(
        {
            "DATABASE_URL": "postgresql+asyncpg://user:pass@host:5432/db",
        },
    )
    assert backend == "postgres"


def test_resolve_storage_backend_raises_for_invalid_value() -> None:
    """非法存储后端配置应立即失败。"""
    with pytest.raises(ValueError, match="APP_STORAGE_BACKEND"):
        resolve_storage_backend({"APP_STORAGE_BACKEND": "redis"})


def test_resolve_postgres_database_url_requires_database_url() -> None:
    """缺少 DATABASE_URL 时应抛出可读错误。"""
    with pytest.raises(ValueError, match="DATABASE_URL"):
        resolve_postgres_database_url({})


@pytest.mark.parametrize(
    ("raw_url", "expected"),
    [
        (
            "postgresql+asyncpg://user:pass@host:5432/db",
            "postgresql://user:pass@host:5432/db",
        ),
        (
            "postgresql+psycopg://user:pass@host:5432/db",
            "postgresql://user:pass@host:5432/db",
        ),
        (
            "postgres://user:pass@host:5432/db",
            "postgresql://user:pass@host:5432/db",
        ),
    ],
)
def test_normalize_postgres_database_url(raw_url: str, expected: str) -> None:
    """常见 DSN 变体应转换为 psycopg 可识别格式。"""
    assert normalize_postgres_database_url(raw_url) == expected
