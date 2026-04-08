# HONO-025 模块化 review 路由

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 review 相关路由从 `app.ts` 中移出，为 `app.ts` 最终只保留组合层做准备。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-024-modularize-record-routes-and-batch-c-review.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`
- `backend-hono/tests/llm-record-review-integration.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Batch C 已完成，auth/speech/deck-card/record 路由已模块化，剩余最重的是 review/dashboard。

## skill_required

- `-`

## 前置依赖

- `HONO-024`

## paired_with

- `-`

## contract_version

- `N/A（refactor-only；existing contracts unchanged）`

## sync_point

- `SP-HONO-APP-REF-BATCH-D`

## batch_plan（批次协作说明）

- 所属批次：`Batch D`
- 同批次任务：`HONO-025 ~ HONO-026`
- 执行规则：顺序执行，不并行落码
- 停止点：完成 `HONO-026` 后再做整批复核

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
- strategy: 以现有 review integration tests 为主回归网
- rollback_plan: N/A

## 范围

1. 抽离：
   - `/review/decks`
   - `/review/decks/:deckId/session`
   - `/review/session/:sessionId/ai-score`
   - `/review/session/:sessionId/rate`
   - `/review/session/:sessionId/summary`
2. `app.ts` 改为 mount review route module
3. 保持 review 主链路与 AI score 错误映射行为不变

## 不在范围

- 抽离 dashboard 路由
- 对 review 契约做任何语义更改

## 子步骤（执行清单）

1. 先运行 review 相关 tests（Red baseline）
2. 最小抽离 review route module（Green）
3. 清理 `app.ts` review handler（Refactor）
4. 运行 focused integration tests 并保留证据

## test_scope

- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- review-dashboard-api.test.ts llm-record-review-integration.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- review 路由已独立成模块
- review 主链路相关 tests 通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

