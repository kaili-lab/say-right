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

- 已建立 Playwright 验收基线：`frontend/playwright.config.ts`
  - 双项目：`desktop-chromium` + `iphone-13`（移动端按 iPhone 13 视口仿真）
  - 统一 `webServer` 启动参数，保证本地与 CI 可复现
- 已新增视觉回归用例：`frontend/tests/visual/visual-regression.spec.ts`
  - 覆盖首页/记录/复习列表/复习 Session/卡片组空状态
  - 每个用例先截图 `mock-ui` HTML 基线，再对 React 页面做同名截图比对
  - 覆盖桌面与 iPhone 13 两套视口
- 已新增关键路径 e2e 用例：`frontend/tests/e2e/critical-path.spec.ts`
  - 记录页：生成英文 → 保存 → 立即调整分组
  - 复习页：进入 Session → AI 评分 → 手动评级 → 完成总结
  - 使用路由级 stub，避免依赖真实后端与外部环境
- 可追溯证据（本地执行）：
  - `pnpm test:visual`（exit 0）
  - `pnpm test:e2e -- --grep "critical-path"`（exit 0）
  - `pnpm test && pnpm lint && pnpm typecheck`（exit 0）
