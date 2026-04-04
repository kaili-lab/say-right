# UI-022 录音采集 Hook `useSpeechRecorder`

## 目标

- 封装浏览器录音生命周期，为所有英语学习相关输入框提供统一录音能力。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `frontend/src/test/setup.ts`
- `frontend/package.json`

## previous_task_output（上一个任务关键产出摘要）

- `UI-021` 将提供统一的转写 API client。
- 当前前端没有 `MediaRecorder` 封装层，页面不应各自管理权限、超时和错误。

## skill_required

- `-`

## 前置依赖

- `UI-021`

## paired_with

- `-`

## contract_version

- N/A（前端录音能力）

## sync_point

- `SP-UI-SPEECH-RECORDER`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 浏览器真实麦克风不可在单元测试中稳定依赖
- strategy: 使用可复现的 `MediaRecorder` / `getUserMedia` stub
- rollback_plan: E2E 任务中补充浏览器侧端到端 stub 回归

## 范围

1. 新建 `frontend/src/app/useSpeechRecorder.ts`
2. 封装状态：
   - `idle`
   - `recording`
   - `stopping`
   - `error`
3. 封装行为：
   - 请求麦克风权限
   - 开始录音
   - 停止录音
   - 超时自动停止
4. 输出稳定 `Blob`
5. 提供中文错误信息

## 不在范围

- 调用后端转写接口
- textarea UI
- 页面业务逻辑

## 子步骤（执行清单）

1. 先写失败测试（Red）：开始、停止、权限拒绝、超时、重复点击保护。
2. 最小实现 `useSpeechRecorder`（Green）。
3. 补齐边界测试与必要注释（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `unit`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 录音逻辑不散落到页面层。
- 失败路径可测且可复现。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `frontend/src/app/useSpeechRecorder.ts`，封装录音状态机：`idle/recording/stopping/error`。
  - 覆盖能力：权限申请、开始/停止、超时自动停止、重复点击保护、中文错误提示。
  - 新增 `frontend/src/app/useSpeechRecorder.test.ts`，使用 `MediaRecorder/getUserMedia` stub 可复现测试。
- 测试证据：
  - `cd frontend && pnpm test -- useSpeechRecorder` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
