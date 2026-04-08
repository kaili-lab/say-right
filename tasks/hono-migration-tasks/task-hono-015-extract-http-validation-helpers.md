# HONO-015 抽离验证辅助函数到 `src/http/validation.ts`

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`

## 目标

- 将 `app.ts` 中与请求校验相关的纯辅助函数抽离到独立模块，降低组合层噪音。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/task-hono-014-app-composition-characterization-safety-net.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/app-composition.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- `HONO-014` 已建立组合层 characterization test，后续 helper 抽离有最小安全网。

## skill_required

- `-`

## 前置依赖

- `HONO-014`

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
- strategy: 对纯 helper 补 focused unit tests；同时保留组合层回归测试
- rollback_plan: N/A

## 范围

1. 新增 `backend-hono/src/http/validation.ts`
2. 从 `app.ts` 抽离：
   - `toValidationDetail`
   - `createValidationHook`
   - `buildBodyValidationError`
3. 新增 `backend-hono/tests/validation.test.ts`
4. `app.ts` 改为引用新模块

## 不在范围

- 修改任何业务路由逻辑
- 调整错误响应契约

## 子步骤（执行清单）

1. 先写失败测试（Red）：覆盖 helper 输出结构
2. 最小抽离实现（Green）
3. 清理 `app.ts` 内部重复引用（Refactor）
4. 运行 focused tests 并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test -- validation.test.ts app-composition.test.ts`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- `src/http/validation.ts` 已落位
- `validation.test.ts` 覆盖核心 helper 行为并通过
- `app.ts` 仅保留调用，不再内嵌实现
- 所有 `test_commands` 通过

## output_summary（任务完成后由 AI 填写）

