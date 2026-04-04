# UI-030 landing page 顶部导航与首屏 Hero

## 目标

- 基于公开路由与双语文案，完成 landing page 的顶部导航、语言切换与首屏 Hero 区。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `docs/UI设计规范.md`
- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/app/navigation.ts`
- `frontend/src/pages/AuthLoginPage.tsx`
- `tasks/ui-tasks/task-ui-028-public-landing-route-split.md`
- `tasks/ui-tasks/task-ui-029-landing-bilingual-copy-and-locale-toggle.md`

## previous_task_output（上一个任务关键产出摘要）

- landing page 已有独立公开入口与文案/语言状态基础能力。
- 需要先完成最能体现产品定位的首屏，再逐步补充下方区块。

## skill_required

- `-`

## 前置依赖

- `UI-029`

## paired_with

- `-`

## contract_version

- `N/A（公开页首屏结构）`

## sync_point

- `SP-UI-LANDING-HERO`

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

1. 新建或补齐 `LandingPage` 页面骨架
2. 完成公开页顶部区域：
   - 品牌标识
   - 登录 / 注册入口
   - 语言切换
   - 已登录态的“进入应用”入口
3. 完成 Hero 区：
   - 一句价值主张
   - 一段补充说明
   - 主 CTA / 次 CTA
4. 视觉风格沿用现有 Warm Orange，不另起新品牌风格
5. CTA 目标建议：
   - 主按钮：进入应用或立即体验
   - 次按钮：查看流程 / 了解功能

## 不在范围

- 工作流区
- 真实截图区
- 技术证明区

## 子步骤（执行清单）

1. 先写失败测试（Red）：首屏标题、语言切换、登录/注册入口、已登录 CTA。
2. 最小实现 header 与 hero（Green）。
3. 补齐响应式与已登录/未登录态细节（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test -- landing-page`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- landing page 首屏可清楚表达产品价值。
- 公开页顶部已具备登录/注册/语言切换入口。
- 已登录与未登录态 CTA 行为清晰。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- `frontend/src/pages/LandingPage.tsx` 已实现顶部导航与首屏 Hero：
  - 顶部包含品牌信息、锚点导航、语言切换、登录/注册（或已登录返回应用）。
  - Hero 区包含主叙事标题、副标题与主次 CTA。
- 首屏 CTA 与登录态联动：
  - 未登录引导到 `/auth/register` 或 `/auth/login`；
  - 已登录引导到 `/app`。
- 样式遵循项目暖橙主题规范，并适配桌面与移动端布局。
