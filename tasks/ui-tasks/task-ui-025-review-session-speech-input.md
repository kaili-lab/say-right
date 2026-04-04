# UI-025 复习页英文答案语音接入

## 目标

- 为复习页“你的英文答案”输入框接入语音，保持 AI 评分与手动评分链路稳定。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/ui-tasks/task-ui-023-speech-enabled-textarea.md`
- `frontend/src/pages/ReviewSessionPage.tsx`
- `frontend/src/pages/reviewApi.ts`
- `frontend/src/review-session.test.tsx`

## previous_task_output（上一个任务关键产出摘要）

- `UI-023` 已提供通用语音输入组件。
- 复习页只有一个学习型文本输入框：英文答案。

## skill_required

- `-`

## 前置依赖

- `UI-023`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-UI-REVIEW-SPEECH`

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

1. 复习页英文答案输入框接入语音：
   - `scene=review_answer`
   - `language=en`
2. 保持以下行为不变：
   - AI 评分按钮逻辑
   - 手动评分逻辑
   - 显示参考答案逻辑
3. 转写结果可编辑，用户仍有最终确认权

## 不在范围

- 改动评分 prompt
- 增加发音评估
- 改动复习统计

## 子步骤（执行清单）

1. 先写失败测试（Red）：英文回填、编辑后 AI 评分、手动评分不回归、转写失败。
2. 最小接入复习页输入框（Green）。
3. 补齐边界测试与状态恢复逻辑（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `integration`
- `unit`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 英文答案输入支持语音。
- 评分链路无回归。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 更新 `frontend/src/pages/ReviewSessionPage.tsx`：
    - 英文答案输入接入语音：`scene=review_answer`、`language=en`。
  - 保持 AI 评分、手动评级、参考答案显示逻辑不变。
  - 新增语音回填后继续评分回归：`frontend/src/speech-page-integration.test.tsx`。
- 测试证据：
  - `cd frontend && pnpm test -- review-session speech-page-integration` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
