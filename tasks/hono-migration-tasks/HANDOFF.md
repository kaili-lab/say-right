# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-008` 已完成，准备进入 `HONO-009`。
- 已完成：
  - 新增 `backend-hono/src/llm` 适配层：`runtime.ts`（配置解析）、`text.ts`（JSON 提取）、`adapter.ts`（deterministic + OpenAI 兼容实现）。
  - `backend-hono/src/app.ts` 已将 `/records/generate` 与 `/review/session/:sessionId/ai-score` 接入统一 LLM adapter。
  - 保留 deterministic fallback，支持 `__FAIL_STUB__` / `__AI_UNAVAILABLE__` 可复现故障注入；provider 错误统一映射到 `503`。
  - 新增测试：
    - `backend-hono/tests/llm-adapter.test.ts`（成功/超时/不可用 + 配置与解析）
    - `backend-hono/tests/llm-record-review-integration.test.ts`（路由接线 + 503 映射）
  - 依赖变更：`backend-hono` 新增 `openai@6.26.0`。
  - 已执行 claude reviewer subagent 复审，并吸收“缩小 fallback 捕获范围、移除跨请求 LLM 缓存”的建议。
  - `cd backend-hono && pnpm test -- llm record review`、`cd backend-hono && pnpm check`、`make -C backend check` 全通过。
- 下一个任务建议：执行 `HONO-009`，推进 Postgres -> D1 数据迁移与一致性校验。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
