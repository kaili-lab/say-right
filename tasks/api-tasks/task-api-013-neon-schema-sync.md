# API-013 Neon Schema 同步基线

## 目标

- 补齐“数据库落地”最小闭环：提供可执行 schema 文件、同步脚本与验收命令。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-001-backend-stack-freeze.md`
- `tasks/api-tasks/DECISIONS.md`
- `docs/FastAPI项目固定流程.md`

## previous_task_output（上个任务关键产出摘要）

- API-012 已完成接口契约回归与主链路测试收口，但后端运行态仍为内存仓储。

## skill_required

- `python-pro`
- `supabase-postgres-best-practices`

## 前置依赖

- `API-001`

## paired_with

- 无

## contract_version

- 无

## sync_point

- `SP-DB-BASELINE`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: `psycopg[binary]`
  version: `>=3.2.0,<4.0`
  reason: 使用 Python 脚本直连 Neon/PostgreSQL 执行 schema SQL
  install_command: `../.venv/bin/pip install -e ".[dev]"`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `ready`
- gap: 无
- strategy: 不需要造数，直接执行 DDL 同步
- rollback_plan: 若未来切换 Alembic，保留本任务 schema.sql 作为初始迁移参考并迁移到版本化脚本

## 范围

- `backend/db/schema.sql`
- `backend/scripts/sync_schema.py` 与可复用模块
- `make -C backend db-sync` 命令口径
- 文档补充（README/DEVELOPMENT）

## 不在范围

- 把运行态仓储从内存改为数据库
- 增删业务接口

## 子步骤（执行清单）

1. 写失败测试（schema 同步工具函数）
2. 实现 schema 同步模块与脚本入口
3. 增加 `make db-sync` 命令
4. 更新文档并给出执行方式
5. 运行全量质量门禁并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_schema_sync.py`
- `make -C backend db-sync`
- `make -C backend check`

## DoD

- Neon/PostgreSQL 可通过统一命令同步 schema
- schema 同步工具具备基础单元测试
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增 `backend/db/schema.sql`，覆盖 `users/decks/cards` 核心表与索引。
- 已新增 schema 同步模块与脚本：`backend/app/db/schema_sync.py`、`backend/scripts/sync_schema.py`。
- 已新增统一命令：`make -C backend db-sync`。
- 已补充文档：`backend/README.md`、`backend/DEVELOPMENT.md`。
- 已补充单元测试：`backend/tests/unit/test_schema_sync.py`。
