# UI-005 记录页输入与“生成英文”流程

## 目标

- 实现记录页输入区、生成英文按钮、结果展示区交互，并接入“生成英文”后端契约。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-003-app-shell-and-main-tabs.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-record.html`
- `docs/contracts/v0.3.5-record-generate.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-003 已完成路由壳层，记录页可挂载。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-003`

## paired_with

- `API-007A`

## contract_version

- `docs/contracts/v0.3.5-record-generate.yaml`

## sync_point

- `SP-0035`

## 范围

- 输入中文
- 点击“生成英文”后的 loading/success/error 状态
- 调用后端生成接口并展示结果
- 结果卡片展示与可编辑态

## 不在范围

- 保存卡片链路
- 真实 LLM 供应商接入（按契约走 stub）

## 子步骤（执行清单）

1. 读取 context_files，确认生成英文契约与页面态
2. 写失败测试：输入、按钮、结果区三态切换（Red）
3. 最小实现状态机并接入契约接口（Green）
4. 对齐 v3 页面视觉层级
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- record-generate`

## DoD

- 记录页生成英文流程三态可用
- 契约字段正确渲染且支持编辑态
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已实现记录页核心流程：`frontend/src/pages/RecordPage.tsx`
  - 中文输入区（200 字限制）
  - “生成英文”按钮与 loading/success/error 三态
  - 成功后结果卡片展示（`generated_text`、`model_hint`、`trace_id`）
  - 英文结果可直接编辑
- 已接入生成英文契约调用：`frontend/src/pages/recordApi.ts`
  - `POST /records/generate`
  - 请求字段：`source_text`、`source_lang=zh`、`target_lang=en`
  - 错误响应统一映射为可展示文案
- 已将 `/record` 路由从占位页替换为真实记录页：`frontend/src/App.tsx`
- 已新增/更新测试：
  - 新增：`frontend/src/record-generate.test.tsx`
  - 更新：`frontend/src/routing.test.tsx`
- 可追溯证据（本地执行）：
  - `pnpm test -- record-generate`（exit 0）
  - `pnpm test && pnpm lint && pnpm typecheck`（exit 0）
