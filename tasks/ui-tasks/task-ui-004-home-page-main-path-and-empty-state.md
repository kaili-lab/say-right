# UI-004 首页主路径、统计卡片与空状态

## 目标

- 实现首页核心信息结构：今日待复习、开始复习入口、Welcome Stats、Insight 卡片、记录入口与空状态。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-003-app-shell-and-main-tabs.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-home.html`

## previous_task_output（上个任务关键产出摘要）

- UI-003 已完成壳层与 Tab 路由。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-003`

## paired_with

- `API-010`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-005`

## 范围

- 首页主卡片（今日待复习）
- Welcome Stats 卡片（已学习天数/已掌握卡片数）
- Insight 卡片（"你知道吗？"）
- “开始复习”跳转行为（到复习 Deck 列表）
- 记录入口（轻量入口）
- 新用户空状态（Welcome Stats 显示 0 或隐藏）

## 不在范围

- 真实复习数据计算逻辑
- 记录页业务实现

## 子步骤（执行清单）

1. 读取 context_files，确认首页信息架构与空状态规则
2. 写失败测试：主路径按钮、统计卡片、Insight、空状态文案存在（Red）
3. 最小实现首页结构与跳转（Green）
4. 对齐 UI 规范中的层级与间距
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- home-page`

## DoD

- 首页满足主路径、统计卡片、Insight 与空状态规范
- “开始复习”跳转目标正确
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
