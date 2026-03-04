"""运行态存储配置解析测试。"""

import pytest

import re

from app.db.runtime import (
    normalize_postgres_database_url,
    resolve_cors_allow_origin_regex,
    resolve_cors_allow_origins,
    resolve_db_pool_size,
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


def test_resolve_cors_allow_origins_uses_default_localhost_when_not_configured() -> None:
    """未配置时应回退本地开发域名。"""
    assert resolve_cors_allow_origins({}) == [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def test_resolve_cors_allow_origins_supports_comma_separated_values() -> None:
    """应支持通过逗号分隔配置多个 origin。"""
    assert resolve_cors_allow_origins(
        {"APP_CORS_ALLOW_ORIGINS": "https://app.example.com, https://admin.example.com "},
    ) == [
        "https://app.example.com",
        "https://admin.example.com",
    ]


def test_resolve_cors_allow_origin_regex_returns_localhost_wildcard_by_default() -> None:
    """未配置时正则应覆盖所有 localhost 端口（Vite 端口自动递增场景）。"""
    pattern = resolve_cors_allow_origin_regex({})
    assert pattern is not None
    compiled = re.compile(pattern)
    assert compiled.fullmatch("http://localhost:5173")
    assert compiled.fullmatch("http://localhost:5174")
    assert compiled.fullmatch("http://127.0.0.1:5173")
    assert compiled.fullmatch("http://127.0.0.1:9999")
    assert not compiled.fullmatch("https://example.com")
    assert not compiled.fullmatch("http://evil.com:5173")


def test_resolve_cors_allow_origin_regex_returns_none_when_origins_are_configured() -> None:
    """已显式配置 APP_CORS_ALLOW_ORIGINS 时，不应启用正则兜底（生产严格白名单）。"""
    result = resolve_cors_allow_origin_regex(
        {"APP_CORS_ALLOW_ORIGINS": "https://app.example.com"},
    )
    assert result is None


def test_resolve_cors_allow_origin_regex_uses_explicit_override() -> None:
    """APP_CORS_ALLOW_ORIGIN_REGEX 显式设置时应直接返回该值。"""
    result = resolve_cors_allow_origin_regex(
        {"APP_CORS_ALLOW_ORIGIN_REGEX": r"https://.*\.example\.com"},
    )
    assert result == r"https://.*\.example\.com"


def test_resolve_cors_allow_origin_regex_explicit_overrides_origins() -> None:
    """同时设置两个 env 时，APP_CORS_ALLOW_ORIGIN_REGEX 应优先。"""
    result = resolve_cors_allow_origin_regex(
        {
            "APP_CORS_ALLOW_ORIGINS": "https://app.example.com",
            "APP_CORS_ALLOW_ORIGIN_REGEX": r"https://.*\.example\.com",
        },
    )
    assert result == r"https://.*\.example\.com"


def test_resolve_db_pool_size_uses_default_values() -> None:
    """未配置时应回退到默认连接池大小。"""
    assert resolve_db_pool_size({}) == (2, 10)


def test_resolve_db_pool_size_rejects_invalid_values() -> None:
    """非法池大小配置应抛出可读错误。"""
    with pytest.raises(ValueError, match="APP_DB_POOL_MIN_SIZE"):
        resolve_db_pool_size({"APP_DB_POOL_MIN_SIZE": "0"})
    with pytest.raises(ValueError, match="APP_DB_POOL_MIN_SIZE"):
        resolve_db_pool_size({"APP_DB_POOL_MIN_SIZE": "abc"})
    with pytest.raises(ValueError, match="APP_DB_POOL_MIN_SIZE"):
        resolve_db_pool_size({"APP_DB_POOL_MIN_SIZE": "11", "APP_DB_POOL_MAX_SIZE": "10"})
