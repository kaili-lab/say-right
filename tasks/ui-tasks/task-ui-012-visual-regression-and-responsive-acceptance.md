# UI-012 视觉回归与响应式验收（含 iPhone 13）

## 目标

- 对 React 实现与 HTML 基线做视觉回归，完成桌面与移动端验收收口。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-home.html`
- `mock-ui/v3-c-warm-orange-record.html`
- `mock-ui/v3-c-warm-orange-review.html`
- `mock-ui/v3-c-warm-orange-session.html`
- `mock-ui/v3-c-warm-orange-decks.html`

## previous_task_output（上个任务关键产出摘要）

- UI 核心页面与关键交互已完成并可运行。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-004`
- `UI-006`
- `UI-008`
- `UI-010`
- `UI-011`

## paired_with

- `API-012`

## contract_version

- `N/A（验收任务）`

## sync_point

- `SP-FINAL`

## 范围

- 固定视口截图比对（Desktop + iPhone 13）
- 关键路径视觉态检查（空状态、弹窗、禁用态）
- 响应式可用性检查

## 不在范围

- 新业务功能开发
- 接口契约变更

## 子步骤（执行清单）

1. 读取 context_files，确认验收页面与基线范围
2. 建立页面截图基线与比对脚本
3. 跑关键页面截图回归并收集差异
4. 修正高优先级视觉偏差
5. 输出验收结论并保留可追溯证据

## test_scope

- `integration`
- `e2e`

## test_commands

- `pnpm test:visual`
- `pnpm test:e2e -- --grep "critical-path"`

## DoD

- 关键页面视觉差异在可接受阈值内
- iPhone 13 尺寸可用性达标
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
