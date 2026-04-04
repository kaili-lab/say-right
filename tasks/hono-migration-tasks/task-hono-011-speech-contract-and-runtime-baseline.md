# HONO-011 语音转文字契约与运行时基线

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- 原因：避免本地 D1 空库影响后端测试与本地联调。

## 目标

- 为语音输入能力建立统一 STT 契约、场景枚举与运行时配置基线，明确“只服务英语学习相关输入”的产品边界。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/contracts/README.md`
- `docs/contracts/v0.9-speech-transcribe.yaml`
- `docs/HONO-009-Postgres-to-D1迁移手册.md`
- `backend-hono/wrangler.toml`
- `backend-hono/src/app.ts`
- `backend-hono/src/llm/runtime.ts`

## previous_task_output（上一个任务关键产出摘要）

- `HONO-010` 已完成迁移收口，当前线上后端主实现为 `backend-hono/`。
- 现有记录、复习、卡片编辑链路均为文本主链路，尚无统一语音接口与 STT provider 抽象。

## skill_required

- `-`

## 前置依赖

- `HONO-010`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-HONO-SPEECH-CONTRACT`

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

1. 新建语音领域类型与运行时配置模块，例如：
   - `src/speech/types.ts`
   - `src/speech/runtime.ts`
2. 固化学习场景枚举：
   - `record_source`
   - `record_generated`
   - `review_answer`
   - `card_front`
   - `card_back`
3. 固化语言映射与默认 provider 参数：
   - 中文学习输入默认 `zh`
   - 英文学习输入默认 `en`
   - 当前 provider 基线为 `AIHubMix + whisper-large-v3`
4. 通过测试锁定以下规则：
   - 非法 `scene` / `language` 拒绝
   - 场景到语言、prompt、模型参数的映射稳定
   - 非英语学习相关输入不在支持范围内

## 不在范围

- 调用 AIHubMix
- 暴露 `/speech/transcribe` 路由
- 前端录音与页面接入

## 子步骤（执行清单）

1. 先写失败测试（Red）：场景映射、非法配置、非学习型表单排除。
2. 最小实现运行时配置与类型模块（Green）。
3. 补齐边界测试与中文注释（Refactor）。
4. 执行后端质量门禁并保留证据。

## test_scope

- `unit`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- 语音场景与语言映射有唯一事实来源。
- 运行时配置不把具体模型名散落到路由层。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `backend-hono/src/speech/types.ts`：统一 `scene/language/provider` 与转写入参出参类型。
  - 新增 `backend-hono/src/speech/runtime.ts`：统一 `scene -> defaultLanguage/prompt` 映射与 STT 运行时配置解析。
  - 新增 `backend-hono/tests/speech-runtime.test.ts`：覆盖场景白名单、默认语言、配置解析与非法输入拒绝。
- 约束落地：
  - 仅允许学习型 `scene`：`record_source/record_generated/review_answer/card_front/card_back`。
  - 运行时复用 `LLM_API_KEY/LLM_BASE_URL`，避免新增重复凭据配置。
- 测试证据：
  - `cd backend-hono && pnpm test -- speech-runtime` 通过。
  - `cd backend-hono && pnpm lint` 通过。
  - `cd backend-hono && pnpm typecheck` 通过。
