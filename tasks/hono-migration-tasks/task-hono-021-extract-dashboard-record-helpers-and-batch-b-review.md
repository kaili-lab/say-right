# HONO-021 抽离 dashboard / record 支撑 helper 并完成 Batch B 复核

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将剩余的 pure / support helper 从 `app.ts` 继续外提，并在本批次结束后执行完整复核门禁。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-020-extract-fsrs-domain-logic.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/deck-card-record-api.test.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Batch B 已完成 repository helper 与 FSRS 逻辑抽离准备，剩余 support helper 可进一步清理。

## skill_required

- `-`

## 前置依赖

- `HONO-020`

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
- **本任务是 Batch B 最后一个任务**
- 完成后必须停止，并执行 full review gate；full gate 未通过前不得进入 `HONO-022`

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
- strategy: 为 pure helper 增补 focused tests；整批次结束跑 full review gate
- rollback_plan: N/A

## 范围

1. 抽离剩余 support helper（按实际边界组织）：
   - `resolveUtcDayRange`
   - `pickDailyInsight`
   - `resolveDisplayName`
   - `decideDeckName`
   - `isUniqueConstraintError`
   - 适合独立的 response mapping helper（如 `buildCardResponse` / `toIsoTime`）
2. 补充 focused tests
3. 完成 Batch B full review gate

## 不在范围

- 抽离路由模块
- 调整路由返回结构

## 子步骤（执行清单）

1. 先写失败测试（Red）
2. 最小抽离 helper（Green）
3. 清理 `app.ts` 的 support logic 嵌入（Refactor）
4. 执行 Batch B full review gate，并保留全部证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `cd frontend && pnpm build`

## DoD

- dashboard / record 支撑 helper 已独立成模块
- Batch B 所有变更已通过 full review gate
- 若任一门禁失败，已先完成 review 记录，且未进入下一批

## output_summary（任务完成后由 AI 填写）

