# API DECISIONS

## 已决策（2026-03-01）

- 数据库：`PostgreSQL (Neon)`
- ORM：`SQLAlchemy 2.0 async`
- 迁移工具：`Alembic`
- 运行态仓储：`Repository + psycopg(SQL)`（已完成 InMemory -> PostgreSQL 切换）
- 连接管理：`psycopg_pool.ConnectionPool`（共享池，默认 `min=2/max=10`，可环境变量覆盖）
- 复习数据：`review_sessions + review_logs` 持久化入 PostgreSQL
- 认证与授权：`FastAPI Security + pwdlib[argon2] + PyJWT`
- LLM 接入：`LangChain OpenAI-compatible` + `deterministic fallback`
- 测试：`pytest + pytest-asyncio`
- 质量工具：`ruff + mypy`

## 命令口径（统一）

- 单元/集成测试：`pytest -q`
- Lint：`ruff check .`
- 类型检查：`mypy .`
- schema 同步：`make -C backend db-sync`

## 决策说明

- Neon 与 PostgreSQL 原生兼容，满足 free tier + 后续扩展需求。
- SQLAlchemy 2.0 async + Alembic 组合成熟，便于维护长期 schema 演进。
- 当前优先完成“运行态数据持久化”闭环，仓储层采用 psycopg 直连 SQL；后续可再演进到 SQLAlchemy 模型化实现。
- 认证采用 FastAPI 官方安全组件路线，避免重依赖单一认证全家桶。
- LLM 运行态支持 `provider` 与 `deterministic` 双模式；测试统一走 deterministic，禁止依赖真实模型调用。
- 同步 psycopg + 同步路由在当前版本不会阻塞事件循环；异步仓储迁移作为 API-019 架构债单独评估。
