# HONO-019 抽离 review repository helper

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 review/dashboard 共用的 repository helper 从 `app.ts` 中拆出，降低 review 处理器对大文件的依赖。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-018-extract-deck-card-repository-helpers.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- deck/card repository helper 已开始脱离 `app.ts`，可以继续处理 review 相关查询边界。

## skill_required

- `-`

## 前置依赖

- `HONO-018`

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
- strategy: 新增 DB-backed focused tests；回归仍依赖 review/dashboard integration tests
- rollback_plan: N/A

## 范围

1. 抽离：
   - `findOwnedReviewSession`
   - `isCardBoundToSession`
   - `countDailyRatedStats`
2. 新增 focused tests 覆盖 ownership / session binding / daily count
3. `app.ts` 改为使用新 helper

## 不在范围

- 抽离 FSRS 纯函数
- 抽离 review 路由模块

## 子步骤（执行清单）

1. 先写失败测试（Red）
2. 最小抽离 review repository helper（Green）
3. 保持 review/dashboard 现有行为不变（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- review-dashboard-api.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- review repository helper 已抽离
- review/dashboard 相关回归测试保持通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

