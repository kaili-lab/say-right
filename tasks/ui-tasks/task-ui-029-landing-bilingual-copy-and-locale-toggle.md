# UI-029 landing page 双语文案与语言切换

## 目标

- 为公开 landing page 建立独立的中英文文案源、默认语言策略与手动切换能力，不引入全站 i18n。

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
- `docs/初版需求.md`

## previous_task_output（上一个任务关键产出摘要）

- UI-028 将公开入口与受保护工作台拆开，landing page 已有独立路由落点。
- 当前 README / showcase 文案仍偏向旧叙事，需要为公开页抽离更真实的对外表达。
- 现阶段产品更适合宣传“表达生成 + 复习闭环 + 工程实现”，不应继续把 Group Agent 作为核心卖点。

## skill_required

- `-`

## 前置依赖

- `UI-028`

## paired_with

- `-`

## contract_version

- `N/A（公开页文案与本地语言状态）`

## sync_point

- `SP-UI-LANDING-LOCALE`

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

1. 新建 landing page 专用文案源，例如：
   - `landingCopy.ts`
   - `landingLocale.ts`
2. 支持两种公开页语言：
   - `zh-CN`
   - `en`
3. 定义默认语言策略：
   - 优先读取本地持久化
   - 无持久化时按浏览器语言推断
4. 只影响公开 landing page，不改造登录后业务页
5. 文案要求：
   - 对全球用户可读
   - 明确当前产品更适合中文用户练习英文表达
   - 不把 `Group Agent` 作为首屏核心卖点

## 不在范围

- 全站级 i18n 框架接入
- 业务页面翻译
- SEO 多语言路由

## 子步骤（执行清单）

1. 先写失败测试（Red）：默认语言、手动切换、持久化恢复、英文浏览器兜底。
2. 最小实现文案源与 locale 工具（Green）。
3. 补齐边界场景：未知语言值回退、缺失文案键兜底（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`

## test_commands

- `cd frontend && pnpm test -- landingLocale`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- landing page 具备独立中英文文案源。
- 浏览器语言默认策略与手动切换都可复现。
- 语言状态可持久化，不影响登录后业务页。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 新增双语文案与语言状态模块：
  - `frontend/src/pages/landingCopy.ts` 提供 `zh-CN/en` 结构化文案。
  - `frontend/src/pages/landingLocale.ts` 提供语言归一化、读取与持久化能力。
- landing 页默认语言策略：
  - 优先读取本地持久化；
  - 无持久化时基于浏览器语言回退到 `zh-CN` 或 `en`。
- 语言切换单测已补齐并通过（`frontend/src/landing-locale.test.ts`）。
