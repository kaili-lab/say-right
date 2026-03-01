# UI-010 组内卡片编辑/移动/删除交互

## 目标

- 实现组内卡片管理的三项核心交互：编辑、移动分组、删除。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-009-deck-list-and-create-modal.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-decks.html`
- `docs/contracts/v0.3-card-management.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-009 已完成卡片组基础页与创建流程。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-009`

## paired_with

- `API-006`
- `API-007`

## contract_version

- `docs/contracts/v0.3-card-management.yaml`

## sync_point

- `SP-007`

## 范围

- 卡片编辑弹窗
- 移动分组弹窗
- 删除确认弹窗
- 完成态/失败态提示

## 不在范围

- 复习状态重算策略
- 批量操作

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：编辑/移动/删除三个入口与确认流程（Red）
3. 实现最小交互并转绿（Green）
4. 补齐失败态与撤销提示（如有）
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- deck-card-management`

## DoD

- 三类交互均可完成闭环
- 弹窗流程与视觉规范一致
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
