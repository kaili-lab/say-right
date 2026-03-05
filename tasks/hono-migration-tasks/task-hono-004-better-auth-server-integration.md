# HONO-004 Better Auth 后端接入（Hono + D1）

## 目标

- 在 Hono 后端完成 Better Auth 会话鉴权接入，替代现有 JWT refresh 模式。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/hono-migration-tasks/task-hono-003-d1-drizzle-schema-and-repositories.md`
- `docs/contracts/v0.8-auth-session.yaml`
- `docs/初版需求.md`

## previous_task_output（上个任务关键产出摘要）

- D1 + Drizzle 已具备基础数据读写能力。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-003`

## paired_with

- `HONO-005`

## contract_version

- `docs/contracts/v0.8-auth-session.yaml`

## sync_point

- `SP-HONO-AUTH`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `better-auth`
  version: 最新稳定版
  reason: 会话鉴权
  install_command: `cd backend-hono && pnpm add better-auth`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 接入 Better Auth 路由
2. 基于 D1 会话持久化
3. 落地 Better Auth 所需 schema（通过 Drizzle + D1）
4. 实现会话鉴权中间件（保护业务路由）
5. 完成 CORS + cookie 端到端验证（与前端 `credentials: include` 对齐）

## 不在范围

- 前端调用改造
- 业务接口平移

## 子步骤（执行清单）

1. 写失败测试（Red）：注册/登录/登出/会话查询
2. 写失败测试（Red）：跨域携带 cookie 的会话读写链路
3. 最小实现（Green）：auth 路由 + schema + 会话校验中间件
4. 补齐未登录/无权限边界
5. 全量执行 test_commands

## test_scope

- unit
- integration

## test_commands

- `cd backend-hono && pnpm test -- auth`
- `cd backend-hono && pnpm test -- auth cors session`
- `cd backend-hono && pnpm check`

## DoD

- Better Auth 会话链路可用
- 受保护路由可正确返回 401/200
- Better Auth schema 已落库并通过迁移验证
- `credentials: include` 场景下 cookie 可收发，CORS 不因 `*` 误配导致鉴权失败
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 完成时间：2026-03-05 22:18 +0800
- 关键变更：
  - 接入 Better Auth：新增 `src/auth.ts`，使用 `drizzleAdapter` + sqlite provider。
  - 在 Drizzle schema 中落地 Better Auth 所需表：`auth_users/auth_sessions/auth_accounts/auth_verifications`。
  - 挂载鉴权路由：`/api/auth/*`，并增加契约兼容会话查询路由 `/api/auth/session`。
  - 实现受保护路由中间件：`/protected/*` 通过 `auth.api.getSession` 校验 cookie 会话。
  - 完成 CORS + cookie 端到端验证（`credentials: include` 场景）。
- TDD 证据：
  - Red：`pnpm test -- auth` 初次失败（缺少 `src/auth`）。
  - Green：完成 auth 路由、schema 与中间件后，`auth` 相关测试全部通过。
- 测试证据（Green）：
  - `cd backend-hono && pnpm test -- auth` -> 退出码 `0`（`tests/auth-session.test.ts (2 tests)`）
  - `cd backend-hono && pnpm test -- auth cors session` -> 退出码 `0`
  - `cd backend-hono && pnpm drizzle-kit check` -> 退出码 `0`（`Everything's fine`）
  - `cd backend-hono && pnpm check` -> 退出码 `0`
  - `make -C backend check` -> 退出码 `0`（`122 passed`）
- 结论：
  - DoD 满足，可进入 `HONO-005`。
