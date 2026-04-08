# HONO-022 模块化 auth / speech 路由

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 auth / protected / speech 相关路由从 `app.ts` 中移出，形成独立 route module。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-021-extract-dashboard-record-helpers-and-batch-b-review.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/auth-session.test.ts`
- `backend-hono/tests/speech-transcribe.test.ts`
- `backend-hono/tests/health.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- Batch B 已清理 helper/repository/domain 噪音，接下来进入 route modularization。

## skill_required

- `-`

## 前置依赖

- `HONO-021`

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
- strategy: 以既有 integration tests 作为主回归网
- rollback_plan: N/A

## 范围

1. 新增路由模块（按合理命名拆分）承接：
   - `/health`
   - `/api/auth/session`
   - `/api/auth/*`
   - `/protected/ping`
   - `/speech/transcribe`
2. `app.ts` 改为 route mounting
3. 保持现有鉴权 / 错误映射 / speech 行为不变

## 不在范围

- 抽离 deck/card/record/review/dashboard 路由
- 更改 Better Auth 行为

## 子步骤（执行清单）

1. 先运行并确认现有相关测试（Red baseline）
2. 最小抽离路由模块（Green）
3. 清理 `app.ts` 中相关 handler（Refactor）
4. 运行 focused integration tests 并保留证据

## test_scope

- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- auth-session.test.ts speech-transcribe.test.ts health.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- auth / speech 路由已独立成模块
- 相关 integration tests 通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

