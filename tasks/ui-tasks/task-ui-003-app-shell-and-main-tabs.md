# UI-003 AppShell 与四 Tab 占位路由

## 目标

- 搭建桌面顶部导航 + 移动底部导航 + 四 Tab 占位路由的统一壳层。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-002-frontend-bootstrap-and-test-baseline.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-home.html`
- `mock-ui/v3-c-warm-orange-record.html`
- `mock-ui/v3-c-warm-orange-review.html`
- `mock-ui/v3-c-warm-orange-decks.html`

## previous_task_output（上个任务关键产出摘要）

- UI-002 已提供前端工程与测试基线。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-002`

## paired_with

- 无（纯前端结构任务）

## contract_version

- `N/A（纯前端结构任务）`

## sync_point

- `SP-UI-001`

## 范围

- `AppShell`（TopNav / BottomNav / Main）
- 首页/记录/复习/卡片组 四个占位路由
- 当前 Tab 高亮状态
- 容器宽度一致与滚动稳定策略

## 不在范围

- 任何业务数据请求
- 记录/复习/卡片组具体业务逻辑

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：四个主导航入口存在且首页默认高亮（Red）
3. 实现壳层与占位路由，测试转绿（Green）
4. 增加移动端导航可见性测试
5. 验证页面切换无横向抖动

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- app-shell`
- `pnpm test -- routing`

## DoD

- 四 Tab 可访问且高亮正确
- 桌面/移动导航切换符合 UI 规范
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
