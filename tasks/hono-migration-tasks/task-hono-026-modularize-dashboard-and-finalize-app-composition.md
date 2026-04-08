# HONO-026 模块化 dashboard 路由并收口 `app.ts` 组合层

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 完成 dashboard 路由抽离，并将 `app.ts` 收口为真正的 composition root。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-025-modularize-review-routes.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/review-dashboard-api.test.ts`
- `backend-hono/tests/app-composition.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- review 路由已可从 `app.ts` 中脱离；最后一步是 dashboard 模块化与入口文件收口。

## skill_required

- `-`

## 前置依赖

- `HONO-025`

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
- **本任务是 Batch D 最后一个任务**
- 完成后必须停止，并执行 full review gate；通过后本轮 `app.ts` 重构任务包才算结束

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
- strategy: dashboard integration tests + app composition test 保护最终收口；批次末尾跑 full gate
- rollback_plan: N/A

## 范围

1. 抽离 `/dashboard/home-summary` 路由
2. 收口 `app.ts`，只保留：
   - app creation
   - dependency resolution
   - middleware registration
   - route mounting
3. 删除已迁移后的死代码 / 无用 import
4. 完成 Batch D full review gate

## 不在范围

- 进一步重写 module API 设计
- 修改前端代码

## 子步骤（执行清单）

1. 先运行 dashboard / composition tests（Red baseline）
2. 最小抽离 dashboard route 并收口 `app.ts`（Green）
3. 删除死代码并整理 imports（Refactor）
4. 执行 Batch D full review gate，并保留全部证据

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

- dashboard 路由已独立成模块
- `app.ts` 已收口为组合层入口
- Batch D 所有变更已通过 full review gate
- 若任一门禁失败，已先完成 review 记录，且 refactor task pack 不继续扩展

## output_summary（任务完成后由 AI 填写）

