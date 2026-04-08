# HONO-017 抽离 `requireSession` 中间件并完成 Batch A 复核

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 `requireSession` 从 `app.ts` 中抽离为独立 middleware，并在本批次结束后执行完整复核门禁。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-016-extract-current-user-bridge.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/auth-session.test.ts`
- `backend-hono/tests/deck-card-record-api.test.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Better Auth session 到业务用户的桥接逻辑已可独立复用，可继续抽离中间件层。

## skill_required

- `-`

## 前置依赖

- `HONO-016`

## paired_with

- `-`

## contract_version

- `N/A（refactor-only；existing contracts unchanged）`

## sync_point

- `SP-HONO-APP-REF-BATCH-A`

## batch_plan（批次协作说明）

- 所属批次：`Batch A`
- 同批次任务：`HONO-014 ~ HONO-017`
- 执行规则：顺序执行，不并行落码
- **本任务是 Batch A 最后一个任务**
- 完成后必须停止，并执行 full review gate；full gate 未通过前不得进入 `HONO-018`

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
- strategy: 以现有 integration tests 作为主回归网，补 middleware focused test（若必要）
- rollback_plan: N/A

## 范围

1. 新增 `backend-hono/src/middleware/require-session.ts`
2. `app.ts` 改为挂载抽离后的 middleware
3. 保持所有 protected routes 的 `401` 与 `currentUser` 注入行为一致
4. 完成本批次 full review gate

## 不在范围

- 抽离业务路由模块
- 改动 repository / domain helper

## 子步骤（执行清单）

1. 先写失败测试（Red）：覆盖 unauthorized / authorized 路径（必要时新增 focused test）
2. 最小抽离 middleware（Green）
3. 清理 `app.ts` 中间件装配（Refactor）
4. 执行 Batch A full review gate，并保留全部证据

## test_scope

- `integration`
- `unit`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `cd frontend && pnpm build`

## DoD

- `requireSession` 已独立成模块
- Batch A 所有变更已通过 full review gate
- 若任一门禁失败，已先完成 review 记录，且未进入下一批

## output_summary（任务完成后由 AI 填写）

