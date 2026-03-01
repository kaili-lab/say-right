# API-015 运行态仓储切换（InMemory -> PostgreSQL）

## 目标

- 让后端运行态在配置可用时使用 PostgreSQL 仓储，避免服务重启后数据丢失。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `tasks/api-tasks/task-api-013-neon-schema-sync.md`
- `tasks/api-tasks/HANDOFF.md`
- `backend/db/schema.sql`

## previous_task_output（上个任务关键产出摘要）

- 已完成 Neon schema 同步基线与 `make db-sync` 命令，但 API 运行态仍使用内存仓储。

## skill_required

- `python-pro`

## 前置依赖

- `API-013`
- `API-014`

## paired_with

- 无

## contract_version

- 无

## sync_point

- `SP-STORAGE-CUTOVER`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: 无新增（沿用既有 `psycopg[binary]`，仅从 dev 依赖提升为运行依赖）

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `ready`
- gap: 无
- strategy: 单元测试验证后端选择与连接串标准化；集成测试默认固定为内存仓储，确保可复现
- rollback_plan: 如后续切换 SQLAlchemy/Alembic 完整链路，保留本任务接口与测试作为行为基线

## 范围

- 新增 PostgreSQL 仓储实现（users/decks/cards）
- 应用启动时按环境变量切换仓储后端
- 文档补充：运行态存储后端说明
- 新增配置解析单元测试

## 不在范围

- LLM 供应商接入
- 前端页面改造
- 数据迁移脚本（历史内存数据导入）

## 子步骤（执行清单）

1. 写失败测试：存储后端选择与 DSN 标准化（Red）
2. 实现 PostgreSQL 仓储与启动装配切换（Green）
3. 补充文档与环境变量说明
4. 跑全量质量门禁并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_storage_runtime.py`
- `make -C backend check`

## DoD

- 配置 `DATABASE_URL` 时后端可切换到 PostgreSQL 仓储
- 未配置数据库时可回退内存仓储并保持现有测试稳定
- 全量测试无回归（不只是本任务的测试）

## output_summary（任务完成后由 AI 填写）

- 新增 PostgreSQL 仓储实现：`PostgresUserRepository`、`PostgresDeckRepository`、`PostgresCardRepository`，覆盖 users/decks/cards 核心读写与约束。
- 新增运行态配置解析：`backend/app/db/runtime.py`，支持 `APP_STORAGE_BACKEND` 显式切换与 `DATABASE_URL` 自动推断。
- `create_app()` 已改为按环境装配仓储后端，并暴露 `app.state.storage_backend` 便于排查当前模式。
- 补充测试稳定策略：`backend/tests/conftest.py` 默认强制测试使用内存仓储，避免外部数据库导致不确定性。
- 新增配置单元测试：`backend/tests/unit/test_storage_runtime.py`（7 通过）。
- 文档已更新：`backend/.env.example`、`backend/README.md`、`backend/DEVELOPMENT.md`。
