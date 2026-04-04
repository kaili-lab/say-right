# UI-033 公开页与认证页入口一致性

## 目标

- 打通 landing page、登录页、注册页与登录后工作台之间的跳转关系，避免公开入口与认证入口互相打架。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `docs/contracts/v0.1-auth-basic.yaml`
- `frontend/src/App.tsx`
- `frontend/src/app/navigation.ts`
- `frontend/src/pages/AuthLoginPage.tsx`
- `frontend/src/pages/AuthRegisterPage.tsx`
- `frontend/src/pages/authApi.ts`
- `tasks/ui-tasks/task-ui-032-landing-feature-and-proof-sections.md`

## previous_task_output（上一个任务关键产出摘要）

- landing page 主内容已成型，但认证页与公开页之间还需要统一跳转口径。
- 当前认证页默认围绕旧的根路径设计，登录成功后的落点需要与新路由结构对齐。

## skill_required

- `-`

## 前置依赖

- `UI-032`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-UI-LANDING-AUTH-ENTRY`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 统一登录成功后的跳转目标：
   - 推荐：`/app`
2. 为登录页 / 注册页补“返回首页”入口
3. 已登录用户再访问 `/auth/login` 或 `/auth/register` 时，回到业务首页而不是公开页
4. landing page CTA 与认证页跳转保持一致
5. 如有必要，补充 `location.state` / redirect 参数约定，但不得引入复杂路由状态机

## 不在范围

- 密码找回
- OAuth
- 认证接口协议变更

## 子步骤（执行清单）

1. 先写失败测试（Red）：登录成功跳 `/app`、认证页返回首页、已登录访问认证页重定向。
2. 最小实现入口一致性调整（Green）。
3. 补齐 notice / redirect 场景边界（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test -- auth-ui`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 公开页、认证页、工作台三者跳转关系清晰且一致。
- 认证页不再把用户重新推回旧的根路径语义。
- 已登录用户不会卡在登录/注册页。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 认证入口与公开入口已对齐：
  - 登录页/注册页新增“返回首页（`/`）”入口；
  - 登录成功后统一跳转 `/app`。
- 路由守卫已对齐：
  - 已登录访问 `/auth/login`、`/auth/register` 自动重定向 `/app`；
  - 未登录访问私有路由重定向 `/`。
- 新增并通过路由断言测试，覆盖已登录访问登录页重定向行为。
