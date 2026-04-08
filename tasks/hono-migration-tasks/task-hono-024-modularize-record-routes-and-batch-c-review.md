# HONO-024 模块化 record 路由并完成 Batch C 复核

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 record 相关路由从 `app.ts` 中移出，并在本批次结束后执行完整复核门禁。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-023-modularize-deck-card-routes.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/deck-card-record-api.test.ts`
- `backend-hono/tests/llm-record-review-integration.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Batch C 前两步已完成，route module pattern 已稳定，可继续抽离 record handler。

## skill_required

- `-`

## 前置依赖

- `HONO-023`

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
- **本任务是 Batch C 最后一个任务**
- 完成后必须停止，并执行 full review gate；full gate 未通过前不得进入 `HONO-025`

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
- strategy: 保留 record/LLM integration test 作为主回归网；批次末尾跑 full gate
- rollback_plan: N/A

## 范围

1. 抽离：
   - `/records/generate`
   - `/records/save`
   - `/records/save-with-agent`
2. `app.ts` 改为 mount record route module
3. 保持 LLM unavailable / validation / save 成功路径与现有契约一致
4. 完成 Batch C full review gate

## 不在范围

- 抽离 review/dashboard 路由
- 调整 LLM adapter 行为

## 子步骤（执行清单）

1. 先运行现有 record 相关 tests（Red baseline）
2. 最小抽离 record route module（Green）
3. 清理 `app.ts` record handler（Refactor）
4. 执行 Batch C full review gate，并保留全部证据

## test_scope

- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `cd frontend && pnpm build`

## DoD

- record 路由已独立成模块
- Batch C 所有变更已通过 full review gate
- 若任一门禁失败，已先完成 review 记录，且未进入下一批

## output_summary（任务完成后由 AI 填写）

