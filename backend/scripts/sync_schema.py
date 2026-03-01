"""schema 同步脚本入口。"""

from app.db.schema_sync import run


if __name__ == "__main__":
    raise SystemExit(run())
