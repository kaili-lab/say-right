# UI-007 复习 Deck 列表页

## 目标

- 实现复习 Tab 的 Deck 列表页，支持按待复习数展示与进入 Session 的入口。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-003-app-shell-and-main-tabs.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-review.html`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-003 已提供复习路由壳层。

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

- Deck 列表展示
- 待复习数量展示与排序态
- 进入指定 Deck Session 的入口
- 列表空状态

## 不在范围

- Session 内翻卡流程
- FSRS 调度计算

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：Deck 列表与跳转入口（Red）
3. 最小实现列表页面并转绿（Green）
4. 补齐空状态与建议入口高亮
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- review-deck-list`

## DoD

- 复习 Deck 列表结构与交互完整
- 可承接首页“开始复习”入口
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
