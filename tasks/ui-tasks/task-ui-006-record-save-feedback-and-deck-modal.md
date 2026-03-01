# UI-006 记录页保存反馈与分组选择弹窗

## 目标

- 实现“保存后已分到 XX 组”反馈、可立即改组入口，以及可滚动的卡片组选择弹窗。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-005-record-input-and-generate-english.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-record.html`
- `docs/contracts/v0.4-record-save-agent.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-005 已完成记录页输入和生成英文状态。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-005`

## paired_with

- `API-008`
- `API-009`

## contract_version

- `docs/contracts/v0.4-record-save-agent.yaml`

## sync_point

- `SP-004`

## 范围

- 保存成功反馈条/弹层
- “立即调整分组”入口
- 分组选择弹窗（支持滚动）
- 选择后前端状态更新

## 不在范围

- Agent 推理实现
- 真实后端错误恢复策略

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：保存反馈出现与弹窗开关（Red）
3. 实现反馈与弹窗交互并转绿（Green）
4. 补充分组过多时滚动可用性测试
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- record-save-feedback`

## DoD

- 保存后反馈、改组入口、弹窗滚动能力均可用
- 与 `v0.4-record-save-agent` 字段对齐
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已在 `frontend/src/pages/RecordPage.tsx` 实现保存反馈与分组调整交互：
  - “保存卡片”按钮与保存中/成功/失败状态
  - 保存成功反馈条（“已保存到 XX 组”）与“立即调整分组”入口
  - 分组选择弹窗（`role="dialog"`）与可滚动分组列表（`overflow-y-auto`）
  - 确认分组后前端状态即时更新（当前分组与反馈文案）
- 已按契约接入保存接口：`frontend/src/pages/recordApi.ts`
  - `POST /records/save-with-agent`
  - 请求字段：`source_text`、`generated_text`、`source_lang=zh`、`target_lang=en`
  - 响应字段映射：`card_id`、`deck_id`、`deck_name`、`deck_created`、`fallback_used`
- 已新增测试：`frontend/src/record-save-feedback.test.tsx`
- 可追溯证据（本地执行）：
  - `pnpm test -- record-save-feedback`（exit 0）
  - `pnpm test && pnpm lint && pnpm typecheck`（exit 0）
