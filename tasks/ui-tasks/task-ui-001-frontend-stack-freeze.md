# UI-001 前端技术栈冻结与工程约定

## 目标

- 冻结前端技术栈与工程约定，给后续 UI 实现任务提供统一执行口径。

## context_files（AI 开始前必读）

- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `docs/React项目固定流程.md`
- `tasks/任务拆分说明-final.md`
- `tasks/ui-tasks/DECISIONS.md`

## previous_task_output（上个任务关键产出摘要）

- 初始任务，无前置产出。

## skill_required

- 无

## 前置依赖

- 无

## paired_with

- 无

## contract_version

- 无

## sync_point

- `SP-STACK`

## 范围

- 冻结：前端框架、包管理器、样式方案、测试栈
- 更新：`tasks/ui-tasks/DECISIONS.md`
- 统一：后续任务 `skill_required` 与 `test_commands` 口径

## 不在范围

- 任何业务页面实现
- API 联调

## 子步骤（执行清单）

1. 读取 context_files，确认当前工程状态与待决策项
2. 形成候选方案对比并做单点决策（Red: 若无决策则阻塞）
3. 在 `DECISIONS.md` 写入最终结论与原因（Green）
4. 回填 UI 任务里的 `skill_required/test_commands`
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`

## test_commands

- `rg -n "前端框架|包管理器|样式方案|测试栈" tasks/ui-tasks/DECISIONS.md`
- `rg -n "已决策" tasks/ui-tasks/DECISIONS.md`

## DoD

- `DECISIONS.md` 中存在明确且可执行的前端技术决策
- 后续 UI task 的 `skill_required/test_commands` 已可回填或已回填
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据（命令、退出码、关键通过行）

## output_summary（任务完成后由 AI 填写）

- 已冻结前端技术栈：Vite + React + React Router + pnpm + Tailwind + shadcn/ui + Sonner + RHF + Zod + TanStack Query。
- 已冻结测试与质量工具：Vitest + RTL + Playwright；命令口径统一为 `pnpm test/lint/typecheck/test:e2e/test:visual`。
- 已回填全部 UI tasks 的 `skill_required` 与 `test_commands` 占位符。
