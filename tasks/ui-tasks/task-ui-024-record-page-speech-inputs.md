# UI-024 记录页学习型输入框语音接入

## 目标

- 为记录页中所有英语学习相关输入框接入语音能力，包括中文原文输入与生成后的英文结果编辑区。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/ui-tasks/task-ui-023-speech-enabled-textarea.md`
- `frontend/src/pages/RecordPage.tsx`
- `frontend/src/pages/recordApi.ts`
- `frontend/src/record-generate.test.tsx`
- `frontend/src/record-save-feedback.test.tsx`

## previous_task_output（上一个任务关键产出摘要）

- `UI-023` 已提供通用语音输入组件。
- 记录页当前有两个学习相关 textarea：
  - 中文原文输入
  - 生成后的英文结果编辑区

## skill_required

- `-`

## 前置依赖

- `UI-023`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-UI-RECORD-SPEECH`

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

1. 记录页“中文内容”输入框接入语音：
   - `scene=record_source`
   - `language=zh`
2. 记录页“英文结果”编辑框接入语音：
   - `scene=record_generated`
   - `language=en`
3. 转写结果仅回填输入框，不自动触发：
   - 生成英文
   - 保存卡片
4. 保持现有生成/保存链路行为不变

## 不在范围

- 保存弹窗改造
- 新增语言自由切换
- 非学习型表单语音入口

## 子步骤（执行清单）

1. 先写失败测试（Red）：中文回填、英文回填、原流程不被自动提交、转写失败可重试。
2. 最小接入记录页两个学习相关输入框（Green）。
3. 补齐边界测试：插入已有文本、保存后再次编辑、英文框只读/可编辑状态不回归（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `integration`
- `unit`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 记录页两个学习型 textarea 均有语音入口。
- 转写不会绕过用户确认直接提交后端业务接口。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 更新 `frontend/src/pages/RecordPage.tsx`：
    - 中文输入接入语音：`scene=record_source`、`language=zh`。
    - 英文编辑区接入语音：`scene=record_generated`、`language=en`。
  - 保持既有生成/保存链路：语音回填后不会自动触发 `生成英文` 或 `保存卡片`。
  - 新增回归覆盖见 `frontend/src/speech-page-integration.test.tsx` 与既有记录页测试。
- 测试证据：
  - `cd frontend && pnpm test -- record-generate record-save-feedback speech-page-integration` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
