# HONO-020 抽离 FSRS 纯领域逻辑

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 FSRS 相关纯函数从 `app.ts` 中抽离为独立领域模块，并补齐纯函数测试。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-019-extract-review-repository-helpers.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- review repository boundary 已更清晰，适合继续抽离纯领域计算。

## skill_required

- `-`

## 前置依赖

- `HONO-019`

## paired_with

- `-`

## contract_version

- `N/A（refactor-only；existing contracts unchanged）`

## sync_point

- `SP-HONO-APP-REF-BATCH-B`

## batch_plan（批次协作说明）

- 所属批次：`Batch B`
- 同批次任务：`HONO-018 ~ HONO-021`
- 执行规则：顺序执行，不并行落码
- 停止点：完成 `HONO-021` 后再做整批复核

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- install_commands:
  - `pnpm install`
  - `pnpm exec wrangler d1 migrations apply say-right --local`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: 新增 pure unit tests 保护 FSRS 逻辑；保留 review integration tests
- rollback_plan: N/A

## 范围

1. 新增 `backend-hono/src/domain/fsrs.ts`
2. 抽离：
   - `roundToFourDecimals`
   - `scheduleNextFsrsState`
   - `buildFsrsStateResponse`
3. 新增 `backend-hono/tests/fsrs.test.ts`

## 不在范围

- 改写 FSRS 业务规则
- 调整 review API 契约

## 子步骤（执行清单）

1. 先写失败测试（Red）：Again/Hard/Good/Easy 路径与边界
2. 最小抽离实现（Green）
3. 用新模块替换 `app.ts` 内嵌实现（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- fsrs.test.ts review-dashboard-api.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- FSRS 纯逻辑已独立成模块
- `fsrs.test.ts` 覆盖核心路径并通过
- 现有 review integration tests 通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

