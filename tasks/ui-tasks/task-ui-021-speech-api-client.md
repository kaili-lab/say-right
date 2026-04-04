# UI-021 语音转文字 API Client

## 目标

- 为前端建立统一的语音转文字客户端，屏蔽 `multipart/form-data` 与错误解析细节。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/contracts/v0.9-speech-transcribe.yaml`
- `frontend/src/pages/authApi.ts`
- `frontend/src/pages/apiBaseUrl.ts`
- `frontend/src/pages/recordApi.ts`
- `frontend/src/pages/reviewApi.ts`

## previous_task_output（上一个任务关键产出摘要）

- 前端已有 `fetchWithAuth` 统一鉴权请求能力。
- 语音上传尚无共享 client，页面不应直接拼接 `FormData` 和错误处理。

## skill_required

- `-`

## 前置依赖

- `HONO-013`

## paired_with

- `HONO-013`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-HONO-SPEECH-API`

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

1. 新建 `frontend/src/pages/speechApi.ts`
2. 封装 `transcribeSpeech(...)`
3. 定义前端枚举：
   - `record_source`
   - `record_generated`
   - `review_answer`
   - `card_front`
   - `card_back`
4. 统一错误类与错误解析
5. 为后续页面提供稳定返回结构

## 不在范围

- 录音采集
- 通用语音 UI
- 页面接入

## 子步骤（执行清单）

1. 先写失败测试（Red）：成功响应、422、401、503、非 JSON 错误体。
2. 最小实现 `speechApi.ts`（Green）。
3. 补齐边界测试，保证场景枚举与接口契约一致（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `unit`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 前端页面不直接调用 `/speech/transcribe` 原始细节。
- 场景枚举与后端契约一致。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `frontend/src/pages/speechApi.ts`，封装 `transcribeSpeech(...)`，统一 `FormData` 构造与响应字段映射。
  - 新增前端枚举 `SPEECH_SCENES` 与类型 `SpeechScene/SpeechLanguage`，与后端契约对齐。
  - 新增 `SpeechApiError` 与错误解析（支持 `detail` 字符串、`detail[]`、非 JSON 兜底）。
  - 新增 `frontend/src/pages/speechApi.test.ts`，覆盖成功、`422/401/503`、非 JSON 错误体。
- 测试证据：
  - `cd frontend && pnpm test -- speechApi` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
