# UI-032 landing page 功能卖点与展示证明区

## 目标

- 为 landing page 补齐功能卖点区、真实截图/演示位和工程证明区，让它能承担作品集展示职责。

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
- `mock-ui/record1.png`
- `mock-ui/record2.png`
- `mock-ui/card-group.png`
- `mock-ui/review.png`
- `tasks/ui-tasks/task-ui-031-landing-workflow-section.md`

## previous_task_output（上一个任务关键产出摘要）

- 公开页已具备首屏与工作流。
- 需要进一步回答“为什么这个项目值得看”和“它有哪些真实证明”。

## skill_required

- `-`

## 前置依赖

- `UI-031`

## paired_with

- `-`

## contract_version

- `N/A（公开页展示内容）`

## sync_point

- `SP-UI-LANDING-PROOF`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 公开页证明素材以现有截图为主，暂无稳定线上使用指标
- strategy: 先复用仓库内真实界面截图与工程实现信息，不编造指标
- rollback_plan: 后续若有真实用户数据，再增补 metrics 区块

## 范围

1. 增加功能卖点区：
   - 表达生成
   - 复习机制
   - 工程实现 / 全链路体验
2. 增加展示证明区：
   - 真实截图
   - 或预留 Demo 视频位
3. 增加工程证明区：
   - 技术栈
   - 测试 / 架构 / 部署关键词
4. 文案约束：
   - 不把 `Group Agent` 作为核心卖点
   - 若提及自动归组，只能作为次要能力或未来能力

## 不在范围

- 登录页/注册页改造
- 全站 docs 对齐
- SEO 元信息

## 子步骤（执行清单）

1. 先写失败测试（Red）：卖点卡片、截图区、工程证明区存在且内容可切换中英文。
2. 最小实现功能卖点与证明区（Green）。
3. 补齐素材加载、无图占位和移动端层级（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test -- landing-page`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- landing page 已具备作品集级展示内容，而不只是单一首屏。
- 使用真实截图或可信占位，不编造不存在的指标。
- 对外卖点与当前产品真实状态一致。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- landing 已补齐 feature/proof/engineering/final CTA 区块，形成完整公开叙事。
- 证明区使用真实界面截图资源（`frontend/public/landing/*`），并在页面中按网格展示。
- 卖点口径已对齐当前实现：
  - 主叙事聚焦表达生成、学习闭环、工程实现；
  - 不再把 Group Agent 作为当前核心卖点。
