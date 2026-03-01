# API DECISIONS

## 已决策（2026-03-01）

- 数据库：`PostgreSQL (Neon)`
- ORM：`SQLAlchemy 2.0 async`
- 迁移工具：`Alembic`
- 认证与授权：`FastAPI Security + pwdlib[argon2] + PyJWT`
- 测试：`pytest + pytest-asyncio`
- 质量工具：`ruff + mypy`

## 命令口径（统一）

- 单元/集成测试：`pytest -q`
- Lint：`ruff check .`
- 类型检查：`mypy .`

## 决策说明

- Neon 与 PostgreSQL 原生兼容，满足 free tier + 后续扩展需求。
- SQLAlchemy 2.0 async + Alembic 组合成熟，便于维护长期 schema 演进。
- 认证采用 FastAPI 官方安全组件路线，避免重依赖单一认证全家桶。
- LLM 相关测试统一 stub/fixture，禁止依赖真实模型调用。
