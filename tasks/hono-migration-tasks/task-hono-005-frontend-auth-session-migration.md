# HONO-005 前端鉴权切换到 Better Auth 会话模式

## 目标

- 前端认证从 token/localStorage 迁移到 Better Auth 会话模式（cookie + session）。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/hono-migration-tasks/task-hono-004-better-auth-server-integration.md`
- `frontend/src/pages/authApi.ts`
- `frontend/src/pages/homeApi.ts`
- `frontend/src/pages/recordApi.ts`
- `frontend/src/pages/decksApi.ts`
- `frontend/src/pages/reviewApi.ts`
- `docs/contracts/v0.8-auth-session.yaml`

## previous_task_output（上个任务关键产出摘要）

- Hono 侧 Better Auth 会话接口可用。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `HONO-004`

## paired_with

- `HONO-004`

## contract_version

- `docs/contracts/v0.8-auth-session.yaml`

## sync_point

- `SP-HONO-AUTH-FE`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd frontend && pnpm install`

## dependency_changes（新增依赖清单）

- package: `better-auth` 客户端相关包（按最终集成方式）
  version: 最新稳定版
  reason: 会话客户端接入
  install_command: `cd frontend && pnpm add <final-package>`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 替换 token 存储与 refresh 重试逻辑
2. 重写 `fetchWithAuth`：从 Bearer token 流程切换为 cookie session 流程
3. 全量 API 模块改造（`homeApi/recordApi/decksApi/reviewApi`）并完成回归
4. `authApi.ts` 与路由守卫改为 session 状态驱动
5. 重写 `auth-refresh.test.ts` 及相关测试，覆盖新会话模型

## 不在范围

- UI 视觉重构
- 业务 API 字段改动

## 子步骤（执行清单）

1. 写失败测试（Red）：登录态恢复、登出、未登录跳转
2. 写失败测试（Red）：全 API 模块在会话模式下请求行为一致
3. 最小实现（Green）：authApi + fetch 封装 + API 模块改造
4. 回归边界：401、会话失效、并发请求
5. 重写 auth-refresh 相关测试为 session 模式断言
6. 执行 test_commands

## test_scope

- unit
- integration
- e2e
- mock-regression（`homeApi/recordApi/decksApi/reviewApi` 全量模块）

## test_commands

- `cd frontend && pnpm test -- auth`
- `cd frontend && pnpm test -- auth-refresh`
- `cd frontend && pnpm test -- home record decks review`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 前端不再依赖 localStorage token
- 会话失效时能稳定跳转登录
- `fetchWithAuth` 与四个 API 模块均完成 cookie session 回归
- 全量 API 模块 mock 回归通过，避免会话改造引入静默请求行为漂移
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 关键产出文件：
  - `frontend/src/pages/authApi.ts`：认证 API 与 `fetchWithAuth` 全面切换到 cookie session，请求统一 `credentials: include`；401 触发会话清理与登录跳转；保留旧 token key 常量仅用于迁移期清理。
  - `frontend/src/auth-refresh.test.ts`：重写为 session 模型断言，覆盖凭证携带、401 跳转、并发 401 去重与公共鉴权端点豁免。
  - `frontend/src/auth-ui.test.tsx`：注册/登录/登出测试已对齐 `/api/auth/sign-up/email`、`/api/auth/sign-in/email` 与 session marker 行为。
  - `frontend/src/test/setup.ts`：默认登录态基线改为 `say_right_session_active + say_right_user_email`。
  - `frontend/src/me-page.test.tsx`：会话查询响应结构改为 `/api/auth/session` 契约，登出断言改为 session 清理。
- 契约与行为约定：
  - 前端不再依赖 access/refresh token 进行鉴权判定，路由守卫读取 `say_right_session_active` 作为会话标记。
  - 所有受保护请求通过 `fetchWithAuth` 携带 cookie；会话过期统一跳转 `/auth/login`。
- 测试结果：
  - `cd frontend && pnpm test -- auth` ✅
  - `cd frontend && pnpm test -- auth-refresh` ✅
  - `cd frontend && pnpm test -- home record decks review` ✅
  - `cd frontend && pnpm lint` ✅
  - `cd frontend && pnpm typecheck` ✅
