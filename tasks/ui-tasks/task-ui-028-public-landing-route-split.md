# UI-028 公开 landing page 路由拆分

## 目标

- 将域名根路径从“登录后工作台入口”改为“公开 landing page 入口”，把现有业务首页迁移到受保护路径。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `frontend/src/App.tsx`
- `frontend/src/app/navigation.ts`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/AuthLoginPage.tsx`
- `frontend/src/pages/AuthRegisterPage.tsx`
- `frontend/src/routing.test.tsx`

## previous_task_output（上一个任务关键产出摘要）

- 当前根路径 `/` 仍指向登录后的业务首页；未登录访问域名会直接被重定向到 `/auth/login`。
- 认证页已经独立于 `AppShell`，业务页统一挂在受保护布局下。
- 新增的语音任务已完成，当前前端状态应被视为 landing page 改造的基线。

## skill_required

- `-`

## 前置依赖

- `UI-027`

## paired_with

- `-`

## contract_version

- `N/A（前端公开入口与受保护路由结构）`

## sync_point

- `SP-UI-LANDING-ROUTE`

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

1. 为公开 landing page 预留独立页面入口，例如 `LandingPage`
2. 将现有登录后首页迁移到受保护路径：
   - 推荐：`/app`
3. 调整受保护路由与游客路由分工：
   - `/` 始终可访问
   - `/app`、`/record`、`/review`、`/decks`、`/me` 仍要求登录
4. 更新内部导航的“首页”目标路径，确保登录后主导航回到业务首页而不是公开页
5. 对齐 404/兜底跳转逻辑：
   - 未登录访问私有未知路径 -> `/`
   - 已登录访问私有未知路径 -> `/app`

## 不在范围

- landing page 的完整视觉内容
- 中英文文案与语言切换
- 登录页视觉改版

## 子步骤（执行清单）

1. 先写失败测试（Red）：`/` 公开可访问、未登录访问私有页回 `/`、已登录业务首页迁移到 `/app`。
2. 最小实现公开路由与受保护路由拆分（Green）。
3. 补齐内部导航与兜底跳转边界（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test -- routing`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 域名根路径不再强制跳登录页。
- 现有业务首页已迁移到受保护路径，且主导航可正常回到该页面。
- 未登录访问私有页面会回到公开入口。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 路由拆分已落地：
  - `frontend/src/App.tsx` 中 `/` 作为公开 landing，登录后首页迁移到 `/app`。
  - 私有路由未登录重定向到 `/`，避免直接跳登录页。
- 导航与首页入口已同步：
  - `frontend/src/app/navigation.ts` 首页 Tab 路径改为 `/app`。
  - `frontend/src/app/AppShell.tsx` active 逻辑兼容 `/app`。
- 相关测试已更新并通过（`pnpm test` / `pnpm lint` / `pnpm typecheck`）。
