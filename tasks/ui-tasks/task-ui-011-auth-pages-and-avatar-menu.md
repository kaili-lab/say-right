# UI-011 登录注册页与头像下拉菜单

## 目标

- 完成登录/注册页面与顶部头像下拉菜单（账号占位 + 退出登录）。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-003-app-shell-and-main-tabs.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `docs/contracts/v0.1-auth-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-003 已提供全局导航壳层，可挂载头像菜单。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-003`

## paired_with

- `API-004`

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-002`

## 范围

- 登录页与注册页表单
- 基础校验与错误提示态
- 顶部头像下拉（账号信息占位 + 退出）

## 不在范围

- 第三方 OAuth
- 找回密码

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：表单校验与提交态（Red）
3. 实现登录/注册最小流程并转绿（Green）
4. 实现头像下拉菜单与退出入口
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- auth-ui`

## DoD

- 登录注册表单交互完整
- 头像下拉菜单行为正确
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已实现登录/注册页面：`frontend/src/pages/AuthLoginPage.tsx`、`frontend/src/pages/AuthRegisterPage.tsx`
  - 邮箱/密码基础校验（空值、邮箱格式、最小密码长度）
  - 注册提交流程（`POST /auth/register`）与成功/失败提示
  - 登录提交流程（`POST /auth/login`），成功后回到首页
- 已新增认证 API 与会话封装：`frontend/src/pages/authApi.ts`
  - 接口：`/auth/register`、`/auth/login`
  - 会话：access token / refresh token / email 本地持久化与清理
- 已实现桌面端头像下拉菜单：`frontend/src/app/AppShell.tsx`
  - 点击头像展开菜单（账号信息占位 + 退出登录）
  - 支持点击外部与 `Esc` 关闭
  - 退出登录会清理本地会话并回到首页
- 已更新路由结构：`frontend/src/App.tsx`
  - 新增 `/auth/login`、`/auth/register`
  - 认证页与主导航壳层分离，主业务页统一挂载在 `AppShell`
- 已新增测试：`frontend/src/auth-ui.test.tsx`
- 可追溯证据（本地执行）：
  - `pnpm test -- auth-ui`（exit 0）
  - `pnpm test && pnpm lint && pnpm typecheck`（exit 0）
