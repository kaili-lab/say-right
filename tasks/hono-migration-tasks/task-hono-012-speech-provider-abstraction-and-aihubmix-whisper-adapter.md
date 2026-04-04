# HONO-012 STT Provider 抽象与 AIHubMix Whisper 适配器

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- 原因：避免本地 D1 空库影响后端测试与本地联调。

## 目标

- 建立可替换的语音转文字 provider 抽象层，并落地当前可用的 `AIHubMix Whisper` 适配器实现。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/contracts/v0.9-speech-transcribe.yaml`
- `docs/HONO-009-Postgres-to-D1迁移手册.md`
- `backend-hono/wrangler.toml`
- `tasks/hono-migration-tasks/task-hono-011-speech-contract-and-runtime-baseline.md`
- `backend-hono/src/llm/adapter.ts`
- `backend-hono/src/llm/runtime.ts`

## previous_task_output（上一个任务关键产出摘要）

- `HONO-011` 将提供稳定的 `scene/language/provider config` 映射。
- 当前项目已有 LLM 兼容抽象经验，但 STT 尚无独立 adapter 层。

## skill_required

- `-`

## 前置依赖

- `HONO-011`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-HONO-SPEECH-PROVIDER`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- install_commands:
  - `pnpm install`
  - `pnpm exec wrangler d1 migrations apply say-right --local`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 新建 STT provider 抽象模块，例如：
   - `src/speech/adapter.ts`
   - `src/speech/aihubmix-adapter.ts`
2. 定义统一接口：
   - 输入：音频文件、`scene`、`language`
   - 输出：`text`、`language`、`providerModel`
3. 实现 AIHubMix `POST /v1/audio/transcriptions` 调用：
   - 使用 `multipart/form-data`
   - 处理 `language`
   - 处理 `prompt`
   - 固定当前默认模型 `whisper-large-v3`
4. 统一错误归一化：
   - 上游 4xx/5xx
   - 空文本
   - 超时
   - 网络异常

## 不在范围

- 暴露 Hono 路由
- 前端上传逻辑
- 页面 UI

## 子步骤（执行清单）

1. 先写失败测试（Red）：成功转写、上游异常、空文本、超时。
2. 最小实现 `SpeechToTextAdapter` 与 `AiHubMixSpeechAdapter`（Green）。
3. 补齐边界测试，确保后续更换模型时只改 adapter 层（Refactor）。
4. 执行后端质量门禁并保留证据。

## test_scope

- `unit`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- Hono 路由不直接依赖 AIHubMix 请求细节。
- `whisper-large-v3` 只出现在 provider 层与运行时配置层。
- provider 异常被统一映射。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `backend-hono/src/speech/adapter.ts`：`SpeechToTextAdapter` 抽象与 provider 工厂。
  - 新增 `backend-hono/src/speech/aihubmix-adapter.ts`：AIHubMix/OpenAI-compatible `/audio/transcriptions` 实现。
  - 新增 `backend-hono/tests/speech-adapter.test.ts`：覆盖成功、空文本、超时、4xx/5xx 映射与配置异常。
- 约束落地：
  - 路由层不直接依赖第三方模型参数与请求细节。
  - provider 失败统一抛出 `SpeechProviderUnavailableError`，供路由层映射 `503`。
- 测试证据：
  - `cd backend-hono && pnpm test -- speech-adapter` 通过。
  - `cd backend-hono && pnpm lint` 通过。
  - `cd backend-hono && pnpm typecheck` 通过。
