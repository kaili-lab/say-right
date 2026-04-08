# HONO-016 抽离当前用户解析与业务用户桥接

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 Better Auth session -> domain user 的桥接逻辑从 `app.ts` 抽离出来，为中间件独立化做准备。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-015-extract-http-validation-helpers.md`
- `backend-hono/src/app.ts`
- `backend-hono/src/auth.ts`
- `backend-hono/src/db/schema.ts`
- `backend-hono/tests/auth-session.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- 验证 helper 已独立，`app.ts` 可继续抽离 auth 相关职责。

## skill_required

- `-`

## 前置依赖

- `HONO-015`

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
- 停止点：完成 `HONO-017` 后再做整批复核

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
- strategy: 通过 focused test + 现有 auth integration test 保护行为
- rollback_plan: N/A

## 范围

1. 新增 `backend-hono/src/auth/current-user.ts`
2. 从 `app.ts` 抽离：
   - `resolveCurrentUser`
   - `ensureDomainUser`
3. 新增 `backend-hono/tests/current-user.test.ts`
4. 保持现有 `401` / upsert 行为不变

## 不在范围

- 更改 Better Auth 配置
- 更改业务用户表 schema

## 子步骤（执行清单）

1. 先写失败测试（Red）：覆盖 null session、有效 session、domain user upsert
2. 最小抽离实现（Green）
3. 保持 `auth-session` 相关契约不变（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- current-user.test.ts auth-session.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- `src/auth/current-user.ts` 已落位
- 新测试覆盖 session -> current user 桥接逻辑
- 现有 auth integration tests 保持通过
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

