# UI-023 通用语音输入组件 `SpeechEnabledTextarea`

## 目标

- 建立可复用的“语言标识 + textarea + 麦克风按钮 + 转写状态”组件，供所有英语学习相关输入框共享。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/contracts/v0.9-speech-transcribe.yaml`
- `tasks/ui-tasks/task-ui-021-speech-api-client.md`
- `tasks/ui-tasks/task-ui-022-speech-recorder-hook.md`
- `frontend/src/pages/RecordPage.tsx`
- `frontend/src/pages/ReviewSessionPage.tsx`
- `frontend/src/pages/DeckListPage.tsx`

## previous_task_output（上一个任务关键产出摘要）

- `UI-021` 提供统一转写 client。
- `UI-022` 提供统一录音 hook。
- 需要一个可组合层，避免 `Record/Review/Deck` 三页各自造一套 UI。

## skill_required

- `-`

## 前置依赖

- `UI-022`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-UI-SPEECH-COMPONENT`

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

1. 新建 `frontend/src/app/SpeechEnabledTextarea.tsx`
2. 接收：
   - `value`
   - `onChange`
   - `language`
   - `scene`
   - `label`
3. 提供状态展示：
   - 录音中
   - 转写中
   - 失败提示
4. 转写成功后的文本写入规则：
   - 空文本直接填入
   - 有光标则插入
   - 有选区则替换
5. 样式需兼容现有暖橙主题

## 不在范围

- 业务提交按钮
- 页面级校验
- 非 textarea 类表单

## 子步骤（执行清单）

1. 先写失败测试（Red）：录音状态、转写状态、错误提示、插入/替换逻辑。
2. 最小实现通用组件（Green）。
3. 补齐边界测试，确保组件无业务耦合（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 组件可在记录页、复习页、卡片编辑页复用。
- 文本插入规则有测试覆盖。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `frontend/src/app/SpeechEnabledTextarea.tsx`，组合 `label + textarea + 语音按钮 + 状态/错误提示`。
  - 内置转写回填规则：
    - 空文本：直接填入。
    - 有光标：按光标位置插入。
    - 有选区：替换选区。
  - 新增 `frontend/src/app/SpeechEnabledTextarea.test.tsx`，覆盖录音状态、转写状态、错误提示、插入/替换逻辑。
- 测试证据：
  - `cd frontend && pnpm test -- SpeechEnabledTextarea` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
