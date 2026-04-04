# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-011/012/013` 已完成，语音后端链路已落地。
- 本次完成：
  - `HONO-011`：语音契约与运行时基线（`scene/language/prompt` 映射、配置解析）。
  - `HONO-012`：STT provider 抽象与 AIHubMix 适配器。
  - `HONO-013`：`POST /speech/transcribe` 路由、鉴权接入、`401/413/422/503` 映射与集成测试。
  - 修复 Windows 本地 `EBUSY` 导致的后端测试清理失败问题（仅测试 cleanup 容错）。
- 本次门禁证据：
  - `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
  - `cd backend-hono && pnpm test`（13 files / 46 tests passed）
  - `cd backend-hono && pnpm lint`（passed）
  - `cd backend-hono && pnpm typecheck`（passed）
- 下一个任务建议：
  1. 联调生产 STT 凭据与限流策略（`STT_TIMEOUT_MS/STT_MAX_FILE_SIZE_BYTES`）。
  2. 按业务需要追加 `/speech/transcribe` 监控告警（4xx/5xx 分桶与 provider 超时统计）。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。

## 语音任务结项（2026-04-04）

- 已完成并收口：
  - `HONO-011`、`HONO-012`、`HONO-013`。
- 语音能力范围约束保持：
  - 仅学习型场景可用（`record_source/record_generated/review_answer/card_front/card_back`）。
  - login/register/deck/group 创建等非学习型表单不接入语音。
