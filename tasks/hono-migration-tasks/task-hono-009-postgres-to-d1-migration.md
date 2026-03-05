# HONO-009 Postgres -> D1 数据迁移与一致性校验

## 目标

- 提供可复现的数据迁移流程，将现有 Postgres 数据导入 D1 并做一致性验证。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `backend/db/schema.sql`
- `tasks/hono-migration-tasks/task-hono-003-d1-drizzle-schema-and-repositories.md`
- `tasks/hono-migration-tasks/DECISIONS.md`

## previous_task_output（上个任务关键产出摘要）

- Hono 业务 API 与 D1 schema 已可运行。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-007`

## paired_with

- `-`

## contract_version

- N/A（数据迁移任务）

## sync_point

- `SP-HONO-DATA-MIGRATION`

## execution_context（执行环境约定）

- workdir: 仓库根目录
- runtime: mixed
- env_activate: `source ./.venv/bin/activate`（如需 Python 导出脚本）
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `-`
  version: `-`
  reason: 优先复用现有能力
  install_command: `-`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 提供导出/导入脚本（按表顺序与外键关系）
2. 提供一致性校验脚本（行数、关键字段、抽样哈希）
3. 输出迁移执行手册

## 不在范围

- 业务逻辑改动
- 线上切流

## 子步骤（执行清单）

1. 写失败测试（Red）：迁移后校验不通过
2. 最小实现（Green）：导出导入 + 校验脚本
3. 补齐失败回滚与重试策略
4. 执行 test_commands

## test_scope

- integration

## test_commands

- `cd backend-hono && pnpm test -- migration`
- `cd backend-hono && pnpm check`

## DoD

- 数据迁移脚本可重复执行
- 一致性校验报告可追溯
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 关键产出文件：
  - `backend-hono/src/migration/snapshot.ts`
  - `backend-hono/scripts/migration/export-postgres.ts`
  - `backend-hono/scripts/migration/import-d1.ts`
  - `backend-hono/scripts/migration/verify-d1.ts`
  - `backend-hono/tests/migration-tools.test.ts`
  - `docs/HONO-009-Postgres-to-D1迁移手册.md`
- 已完成能力：
  - 定义标准迁移快照格式（按 `users -> decks -> cards -> review_sessions -> review_session_cards -> review_logs` 顺序）。
  - 提供 D1 可重复导入能力：每次导入前按外键逆序清空，再按依赖顺序重灌。
  - 提供一致性校验报告：按表输出 `source_count/target_count/count_match/hash_match` 与抽样哈希。
  - 提供导出/导入/校验 CLI 脚本，形成可执行迁移流程。
  - 提供迁移执行手册，覆盖步骤、回滚与风险说明。
- 测试覆盖：
  - 新增 `tests/migration-tools.test.ts`：
    - 重复导入可通过校验（Green）
    - 关键字段漂移时校验失败（Red 覆盖）
