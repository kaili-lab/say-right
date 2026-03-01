"""Neon schema 同步工具。

WHAT: 加载 `backend/db/schema.sql` 并执行到目标 PostgreSQL/Neon。
WHY: 当前 API 仍使用内存仓储，但需要先把数据库结构落地，避免后续持久化任务无迁移基线。
"""

from __future__ import annotations

import os
from pathlib import Path

import psycopg


def normalize_database_url(database_url: str) -> str:
    """把 SQLAlchemy 风格 DSN 归一化为 psycopg 可识别的格式。"""
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    return database_url


def resolve_schema_path() -> Path:
    """定位 schema.sql 文件。"""
    return Path(__file__).resolve().parents[2] / "db" / "schema.sql"


def resolve_backend_root() -> Path:
    """定位 backend 根目录。"""
    return Path(__file__).resolve().parents[2]


def read_database_url_from_env_file(env_path: Path) -> str | None:
    """从 .env 文件读取 DATABASE_URL（不走 shell 解析，避免特殊字符被解释）。"""
    if not env_path.exists():
        return None

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() != "DATABASE_URL":
            continue
        cleaned = value.strip().strip('"').strip("'")
        return cleaned or None
    return None


def load_schema_sql(schema_path: Path) -> str:
    """读取 schema SQL 内容。"""
    return schema_path.read_text(encoding="utf-8")


def sync_schema(database_url: str, schema_sql: str) -> None:
    """执行 schema SQL，同步数据库结构。"""
    with psycopg.connect(database_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute(schema_sql)


def run() -> int:
    """执行一次 schema 同步流程。"""
    raw_database_url = os.getenv("DATABASE_URL", "").strip()
    if not raw_database_url:
        # Neon URL 往往包含 `&` 等字符，shell `source .env` 容易解析失败；
        # 这里直接读取 .env 作为兜底，降低命令执行门槛。
        env_path = resolve_backend_root() / ".env"
        raw_database_url = read_database_url_from_env_file(env_path) or ""
    if not raw_database_url:
        print("DATABASE_URL 未设置，无法执行 schema 同步。")
        return 1

    schema_path = resolve_schema_path()
    if not schema_path.exists():
        print(f"未找到 schema 文件：{schema_path}")
        return 1

    database_url = normalize_database_url(raw_database_url)
    schema_sql = load_schema_sql(schema_path)

    try:
        sync_schema(database_url, schema_sql)
    except psycopg.Error as exc:
        print(f"schema 同步失败：{exc}")
        return 1

    print("schema 同步成功。")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
