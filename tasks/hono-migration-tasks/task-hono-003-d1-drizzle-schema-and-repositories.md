# HONO-003 D1 + Drizzle Schema 重建与仓储基线

## 目标

- 在 `backend-hono` 中完成 D1 schema 与 Drizzle 仓储基础能力，覆盖用户/分组/卡片核心读写。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `backend/db/schema.sql`
- `tasks/hono-migration-tasks/task-hono-002-worker-bootstrap-and-quality-gates.md`
- `docs/contracts/v0.2-deck-basic.yaml`
- `docs/contracts/v0.3-card-management.yaml`

## previous_task_output（上个任务关键产出摘要）

- `backend-hono` 可启动，具备最小健康检查与测试门禁。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-002`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml`

## sync_point

- `SP-HONO-DATA`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `drizzle-orm`
  version: 最新稳定版
  reason: 类型安全 ORM
  install_command: `cd backend-hono && pnpm add drizzle-orm`
- package: `drizzle-kit`
  version: 最新稳定版
  reason: schema/migration 管理
  install_command: `cd backend-hono && pnpm add -D drizzle-kit`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 建立 D1 Drizzle schema（users/decks/cards/review_sessions/review_session_cards/review_logs）
2. 提供 repository 层最小接口与测试 fixture
3. 完成基础迁移脚本与本地验证命令

## 不在范围

- Better Auth 集成
- 前端改造

## 子步骤（执行清单）

1. 写失败测试（Red）：核心表 CRUD 与约束
2. 最小 schema + repository 实现（Green）
3. 回归 edge case（唯一键、外键、删除约束）
4. 执行 test_commands 并保留证据

## test_scope

- unit
- integration

## test_commands

- `cd backend-hono && pnpm test -- d1`
- `cd backend-hono && pnpm drizzle-kit check`
- `cd backend-hono && pnpm check`

## DoD

- 核心实体 schema 与仓储测试通过
- `review_session_cards` 已落地并有约束测试
- D1 本地迁移可执行
- lint + typecheck + test 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）
