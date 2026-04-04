# UI-035 landing page 视觉回归与响应式验收

## 目标

- 为 landing page 补齐桌面端与移动端视觉回归，确保公开入口在作品集展示场景下稳定可看。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `docs/UI设计规范.md`
- `frontend/playwright.config.ts`
- `frontend/tests/visual/visual-regression.spec.ts`
- `frontend/tests/visual/visual-regression.spec.ts-snapshots/`
- `tasks/ui-tasks/task-ui-034-landing-routing-and-locale-tests.md`

## previous_task_output（上一个任务关键产出摘要）

- landing page 的结构与交互已基本完成。
- 公开页将成为外部第一印象，需要单独做视觉回归而不是只依赖功能测试。

## skill_required

- `-`

## 前置依赖

- `UI-034`

## paired_with

- `-`

## contract_version

- `N/A（视觉回归任务）`

## sync_point

- `SP-UI-LANDING-VISUAL`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 视觉回归需要稳定的本地测试数据与视口
- strategy: 复用现有 Playwright 基线与固定视口，避免依赖真实后端
- rollback_plan: 若后续公开页引入远程素材，再补静态资源 fixture

## 范围

1. 将 landing page 纳入现有视觉回归
2. 至少覆盖：
   - desktop chromium
   - iPhone 13
3. 验收重点：
   - Hero 区层级与按钮
   - 工作流区
   - 卖点 / 截图区
   - 顶部导航与移动端折叠行为
4. 如需新增快照，按现有目录规范提交

## 不在范围

- 业务页视觉重构
- 真实数据联调

## 子步骤（执行清单）

1. 先写失败用例（Red）：landing page 视觉基线缺失。
2. 最小补齐视觉回归用例与基线（Green）。
3. 补齐移动端断言与稳定性处理（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `visual`
- `e2e`

## test_commands

- `cd frontend && pnpm test:visual`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- landing page 在桌面端与移动端均有视觉基线。
- 公开入口不会因样式调整产生无感知回归。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 已更新 `frontend/tests/visual/visual-regression.spec.ts`：
  - 业务首页视觉比对路径由 `/` 改为 `/app`，避免路由拆分后基线误判。
  - 新增 `landing page 视觉基线与响应式行为` 用例，覆盖 desktop chromium 与 iPhone 13。
  - 新增响应式断言：桌面端显示公开导航，移动端隐藏公开导航并保留语言切换按钮。
- 新增 landing mock 基线页面：`mock-ui/v3-c-warm-orange-landing.html`，并复用现有视觉对比机制动态生成快照对照。
- 已执行并通过：
  - `cd frontend && pnpm test:visual`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm typecheck`
