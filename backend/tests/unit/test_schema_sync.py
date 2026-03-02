"""schema 同步工具单元测试。"""

from pathlib import Path

from app.db.schema_sync import (
    load_schema_sql,
    normalize_database_url,
    read_database_url_from_env_file,
    resolve_schema_path,
)


def test_normalize_database_url_should_strip_asyncpg_prefix() -> None:
    raw = "postgresql+asyncpg://user:pass@localhost:5432/demo"
    assert normalize_database_url(raw) == "postgresql://user:pass@localhost:5432/demo"


def test_normalize_database_url_should_keep_plain_postgresql_url() -> None:
    raw = "postgresql://user:pass@localhost:5432/demo"
    assert normalize_database_url(raw) == raw


def test_load_schema_sql_should_contain_core_tables() -> None:
    schema_sql = load_schema_sql(resolve_schema_path())
    assert "CREATE TABLE IF NOT EXISTS users" in schema_sql
    assert "CREATE TABLE IF NOT EXISTS decks" in schema_sql
    assert "CREATE TABLE IF NOT EXISTS cards" in schema_sql
    assert "CREATE TABLE IF NOT EXISTS review_sessions" in schema_sql
    assert "CREATE TABLE IF NOT EXISTS review_logs" in schema_sql


def test_read_database_url_from_env_file_should_parse_full_url(tmp_path: Path) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text(
        "\n".join(
            [
                "APP_ENV=dev",
                "DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require&channel_binding=require",
            ],
        ),
        encoding="utf-8",
    )

    assert (
        read_database_url_from_env_file(env_path)
        == "postgresql://user:pass@host:5432/db?sslmode=require&channel_binding=require"
    )
