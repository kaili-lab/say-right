# UI-016 手机端“我的”Tab 与个人中心页

## 目标

- 手机端底部导航新增“我的”入口
- 新增 `/me` 页面，展示当前用户邮箱与昵称，并提供退出登录
- 桌面端头像菜单统一跳转 `/me`

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 1）
- `frontend/src/app/navigation.ts`
- `frontend/src/app/AppShell.tsx`
- `frontend/src/App.tsx`
- `frontend/src/pages/authApi.ts`
- `backend/app/auth/api.py`（`GET /me`）
- `docs/contracts/v0.1-auth-basic.yaml`
- `tasks/ui-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- UI-015 已完成统一鉴权请求层（`fetchWithAuth`）。
- 当前导航仍是 4 个主 Tab，桌面头像菜单里账号信息为占位文案。

## skill_required

- `vercel-react-best-practices`
- `tailwind-css`

## 前置依赖

- `UI-015`

## paired_with

- 无（后端接口已完成）

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-UI-ME-TAB`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. `navigation.ts` 拆分 `DESKTOP_TABS`（4项）与 `MOBILE_TABS`（5项，含 `/me`）
2. `AppShell.tsx`：
   - 顶部导航使用 `DESKTOP_TABS`
   - 底部导航使用 `MOBILE_TABS`，`grid-cols-5`
   - 桌面头像菜单“账号信息”改为跳转 `/me`
3. 新建 `MePage.tsx`：
   - 通过鉴权请求读取 `GET /me`
   - 展示只读邮箱与昵称
   - “修改昵称”“修改密码”标注“即将上线”
   - 提供退出登录按钮（复用现有登出能力）
4. `App.tsx` 注册 `/me` 路由
5. 更新导航与个人中心相关测试

## 不在范围

- 昵称修改接口
- 密码修改流程
- 头像上传/账号注销

## 子步骤（执行清单）

1. 写失败测试（Red）：移动端 5 Tab、`/me` 信息渲染、退出登录
2. 实现导航与路由改造（Green）
3. 新建 `MePage` 并接入接口
4. 补齐边界测试并回归
5. 运行全量测试并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 手机端可见并可访问“我的”Tab
- `/me` 页面展示后端返回的邮箱与昵称
- 桌面头像菜单可跳转 `/me`
- 退出登录行为可用
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

