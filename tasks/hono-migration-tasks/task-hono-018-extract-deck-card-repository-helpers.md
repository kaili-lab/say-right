# HONO-018 抽离 deck/card repository helper

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 `app.ts` 中 deck/card 相关的查询与写后统计 helper 抽离到 repository 模块。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-017-extract-require-session-middleware-and-batch-a-review.md`
- `backend-hono/src/app.ts`
- `backend-hono/src/repositories/core-repositories.ts`
- `backend-hono/tests/deck-card-record-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Batch A 已完成，middleware 与 auth bridge 已独立，可进入 repository/helper 抽离批次。

## skill_required

- `-`

## 前置依赖

- `HONO-017`

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
- strategy: 补 DB-backed focused tests，复用现有 deck/card integration tests
- rollback_plan: N/A

## 范围

1. 新增或扩展 repository 模块，承接：
   - `findOwnedDeckById`
   - `findOwnedCardById`
   - `findDeckByNameInsensitive`
   - `ensureDefaultDeck`
   - `refreshDeckCounts`
2. 新增 focused tests 覆盖上述 helper
3. `app.ts` 改为调用 repository helper

## 不在范围

- 抽离 review repository helper
- 调整路由模块边界

## 子步骤（执行清单）

1. 先写失败测试（Red）：default deck、owned lookup、duplicate name、count refresh
2. 最小抽离 repository helper（Green）
3. 清理 `app.ts` 内联实现（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- deck-card-record-api.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- deck/card repository helper 已抽离
- focused tests 与原有 deck/card integration tests 通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

