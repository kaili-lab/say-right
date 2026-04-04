# UI-031 landing page 三步工作流区

## 目标

- 为 landing page 增加清晰的三步工作流区，展示产品主路径而不是把用户直接推去登录页。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `docs/UI设计规范.md`
- `README.md`
- `README_CN.md`
- `showcase-say-right.md`
- `frontend/src/pages/RecordPage.tsx`
- `frontend/src/pages/ReviewDeckListPage.tsx`
- `tasks/ui-tasks/task-ui-030-landing-header-and-hero.md`

## previous_task_output（上一个任务关键产出摘要）

- 公开页已具备首屏、入口动作与语言切换。
- 现在需要把“怎么使用这个产品”讲明白，降低首次访问者理解成本。

## skill_required

- `-`

## 前置依赖

- `UI-030`

## paired_with

- `-`

## contract_version

- `N/A（公开页流程表达）`

## sync_point

- `SP-UI-LANDING-WORKFLOW`

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

1. 增加三步工作流区，推荐结构：
   - 输入中文想法
   - 生成自然英文并保存
   - 进入复习并记住表达
2. 每一步都要有简短标题、说明与视觉节奏
3. 工作流区文案必须与当前真实产品主链路一致
4. 对外明确：
   - 当前更适合中文用户练习英文表达
   - 不把自动归组描述为主流程

## 不在范围

- 功能卖点卡片
- 技术栈展示
- 文档更新

## 子步骤（执行清单）

1. 先写失败测试（Red）：三步工作流标题、顺序与关键说明文案。
2. 最小实现工作流区（Green）。
3. 补齐移动端布局与语言切换联动（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test -- landing-page`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 三步工作流区能独立解释产品主路径。
- 文案与当前产品真实行为一致。
- 中英文切换时工作流内容同步更新。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- landing 已新增 workflow 区块（`#workflow`）并展示三步主链路：
  1. 输入中文表达
  2. 生成并打磨英文
  3. 进入 FSRS 复习
- workflow 文案统一来自 `landingCopy.ts`，支持中英文切换。
- 叙事明确“表达生成 + 复习闭环”为主路径，不把自动归组作为核心流程。
