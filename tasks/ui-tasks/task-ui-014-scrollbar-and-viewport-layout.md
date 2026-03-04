# UI-014 全局滚动条样式与桌面端 viewport 布局

## 目标

- 去除全局滚动条上下三角形按钮，统一为细窄样式
- 桌面端（md+）锁定 viewport，高度溢出仅在 `<main>` 内滚动
- 手机端保持整页滚动行为

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 2、8）
- `frontend/src/index.css`
- `frontend/src/app/AppShell.tsx`
- `tasks/ui-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- UI-013 已完成首页与总结接口接入，AppShell 结构为：sticky header + `<main>` + fixed bottom nav。
- `<main>` 当前无 viewport 约束，桌面端可能出现整页滚动。

## skill_required

- `tailwind-css`

## 前置依赖

- `UI-013`

## paired_with

- 无

## contract_version

- N/A（纯前端样式）

## sync_point

- `SP-UI-SCROLL`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. `index.css` 增加全局滚动条样式（WebKit + Firefox）：
   - `::-webkit-scrollbar-button { display: none; height: 0; }`
   - `width/height: 6px`，thumb 圆角，track 透明
   - `scrollbar-width: thin; scrollbar-color: #d6d3d1 transparent`
2. `AppShell.tsx` 增加桌面端 viewport 约束：
   - root: `md:h-screen md:flex md:flex-col md:overflow-hidden`
   - `<main>`: `md:flex-1 md:overflow-y-auto md:min-h-0`
3. 保持手机端滚动逻辑不变，确认底部导航留白不受影响

## 不在范围

- 各页面内部二级滚动区重构
- 手机端布局改版

## 子步骤（执行清单）

1. 读取 context_files，确认当前样式与布局
2. 先写/补失败测试（Red）：桌面容器类名与移动端导航不回归
3. 实现全局滚动条样式 + AppShell 桌面约束（Green）
4. 补充边界验证（`md:min-h-0` 生效）
5. 运行全量测试并保留证据

## test_scope

- `unit`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 桌面端不出现整页滚动，内容在 `<main>` 内滚动
- 手机端仍为整页滚动
- 全局滚动条无上下三角按钮
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

