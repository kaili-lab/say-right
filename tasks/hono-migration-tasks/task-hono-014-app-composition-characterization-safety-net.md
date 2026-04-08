# HONO-014 `app.ts` 重构安全网：组合层表征测试

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 为后续 `backend-hono/src/app.ts` 抽离建立“组合层安全网”，先补充不改行为的 characterization test。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/health.test.ts`
- `backend-hono/tests/cors.test.ts`
- `backend-hono/tests/auth-session.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- `HONO-013` 已证明 `backend-hono/src/app.ts` 的主链路行为可用。
- 当前 `app.ts` 已超过千行，后续会逐步拆分，但必须先补组合层保护测试。

## skill_required

- `-`

## 前置依赖

- `HONO-013`

## paired_with

- `-`

## contract_version

- `N/A（refactor-only；existing contracts unchanged）`

## sync_point

- `SP-HONO-APP-REF-BATCH-A`

## batch_plan（批次协作说明）

- 所属批次：`Batch A`
- 同批次任务：`HONO-014 ~ HONO-017`
- 执行规则：同批次任务可连续推进，但因共享修改 `backend-hono/src/app.ts`，**不得并行落码**
- 停止点：完成 `HONO-017` 后，必须执行整批复核门禁

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
- strategy: 复用现有 integration tests，并新增 app composition characterization test
- rollback_plan: N/A

## 范围

1. 新增 `backend-hono/tests/app-composition.test.ts`
2. 以 `createApp()` 为边界验证组合层仍正确挂载：
   - `/health`
   - `/api/auth/session`
   - `/api/auth/*`
   - `/protected/ping`
   - 至少 1 个业务前缀路由
3. 明确后续抽离过程不允许改变现有行为

## 不在范围

- 抽离生产代码
- 修改任何接口契约

## 子步骤（执行清单）

1. 先写失败测试（Red）：覆盖组合层挂载点与最小路由边界
2. 最小实现测试辅助（Green）
3. 保持生产行为不变（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- app-composition.test.ts health.test.ts cors.test.ts auth-session.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- 新增 `app-composition` 测试并通过
- 不改变任何现有接口行为
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

