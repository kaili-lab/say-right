# HONO-013 语音转文字接口 `/speech/transcribe`

## 本地 D1 前置

- 开始本任务前先执行：`cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- 原因：避免本地 D1 空库影响后端测试与本地联调。

## 目标

- 在 `backend-hono` 暴露统一的语音转文字接口，供英语学习相关页面复用。

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
- `tasks/hono-migration-tasks/task-hono-012-speech-provider-abstraction-and-aihubmix-whisper-adapter.md`
- `backend-hono/src/app.ts`
- `backend-hono/tests/auth-session.test.ts`

## previous_task_output（上一个任务关键产出摘要）

- `HONO-011` 定义了 `scene/language` 运行时映射。
- `HONO-012` 提供了可替换的 `SpeechToTextAdapter` 与 `AIHubMix Whisper` 实现。

## skill_required

- `-`

## 前置依赖

- `HONO-012`

## paired_with

- `UI-021`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-HONO-SPEECH-API`

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

1. 在 `src/app.ts` 增加 `POST /speech/transcribe`
2. 使用会话鉴权保护接口
3. 接收 `multipart/form-data`
   - `file`
   - `language`
   - `scene`
4. 路由只做：
   - 参数校验
   - 鉴权
   - 调用 `SpeechToTextAdapter`
   - 错误映射
5. 新增接口测试覆盖：
   - 未登录
   - 缺少文件
   - 非法 `scene`
   - 非法 `language`
   - provider 失败
   - 成功转写

## 不在范围

- 前端上传与录音
- 各业务页面 UI 接入
- 流式转写

## 子步骤（执行清单）

1. 先写失败测试（Red）：认证、校验、成功路径与 provider 错误映射。
2. 最小实现路由（Green）。
3. 补齐边界测试与中文注释（Refactor）。
4. 执行后端质量门禁并保留证据。

## test_scope

- `integration`
- `unit`

## test_commands

- `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
- `cd backend-hono && pnpm test`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`

## DoD

- `/speech/transcribe` 契约与 `docs/contracts/v0.9-speech-transcribe.yaml` 一致。
- 仅允许英语学习相关页面按 `scene` 访问。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 更新 `backend-hono/src/app.ts`：新增 `POST /speech/transcribe`，并将 `/speech/*` 纳入会话鉴权中间件。
  - 路由能力包含：`multipart/form-data` 解析（`file/language/scene`）、`resolveSpeechConfig` + `resolveSpeechInput` + `SpeechToTextAdapter` 调用、`401/413/422/503` 错误映射。
  - 新增 `backend-hono/tests/speech-transcribe.test.ts`：覆盖未登录、缺文件、非法 scene/language、超限、provider 失败、成功路径。
- 额外稳定性修复：
  - 针对 Windows 本地运行，统一修复多处测试清理临时 DB 时的 `EBUSY` 容错，恢复后端全量 `pnpm test` 门禁可执行性。
- 测试证据：
  - `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local` 执行通过。
  - `cd backend-hono && pnpm test` 通过（13 files / 46 tests）。
  - `cd backend-hono && pnpm lint` 通过。
  - `cd backend-hono && pnpm typecheck` 通过。
