# HONO-023 模块化 deck / card 路由

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 deck / card 相关路由处理器从 `app.ts` 中移出，形成独立 route module。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-022-modularize-auth-and-speech-routes.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/deck-card-record-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- auth / speech 路由已从 `app.ts` 分离，route module 组织方式已建立。

## skill_required

- `-`

## 前置依赖

- `HONO-022`

## paired_with

- `-`

## contract_version

- `N/A（refactor-only；existing contracts unchanged）`

## sync_point

- `SP-HONO-APP-REF-BATCH-C`

## batch_plan（批次协作说明）

- 所属批次：`Batch C`
- 同批次任务：`HONO-022 ~ HONO-024`
- 执行规则：顺序执行，不并行落码
- 停止点：完成 `HONO-024` 后再做整批复核

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
- strategy: 使用现有 deck/card integration tests 回归
- rollback_plan: N/A

## 范围

1. 抽离：
   - `/decks`
   - `/decks/:deckId`
   - `/decks/:deckId/cards`
   - `/cards/:cardId`
   - `/cards/:cardId/move`
2. `app.ts` 改为 mount deck/card route module
3. 保持默认组、重复名、跨组移动、404/409/422 等行为不变

## 不在范围

- 抽离 record/review/dashboard 路由
- 调整 repository helper 契约

## 子步骤（执行清单）

1. 先运行并确认现有 deck/card tests（Red baseline）
2. 最小抽离路由模块（Green）
3. 清理 `app.ts` 相关 handler（Refactor）
4. 运行 focused integration tests 并保留证据

## test_scope

- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- deck-card-record-api.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- deck / card 路由已模块化
- deck/card 主链路测试通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

