# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-007` 已完成，准备进入 `HONO-008`。
- 已完成：
  - 在 `backend-hono/src/app.ts` 完成 review + dashboard 路由平移，保持 Better Auth session cookie 鉴权。
  - 平移 `GET /review/decks`、`GET /review/decks/{deck_id}/session`、`POST /review/session/{session_id}/ai-score`、`POST /review/session/{session_id}/rate`、`GET /review/session/{session_id}/summary`、`GET /dashboard/home-summary`。
  - 会话拉取实现到期筛选 + 每日上限（新卡 20/复习卡 100）+ 当日 `review_logs` 抵扣，并落 `review_sessions/review_session_cards`。
  - 评分与调度实现 deterministic AI scorer（`__AI_UNAVAILABLE__ -> 503`）和 FSRS again/hard/good/easy 更新链路，写入 `review_logs`。
  - 新增集成测试 `backend-hono/tests/review-dashboard-api.test.ts`，覆盖主链路与 `401/404/422/503` 边界、配额抵扣、dashboard 统计口径。
  - 已执行 claude reviewer subagent 复审，并吸收“每日配额统计合并查询”优化。
  - `cd backend-hono && pnpm test -- review dashboard`、`cd backend-hono && pnpm check`、`make -C backend check` 全通过。
- 下一个任务建议：执行 `HONO-008`，接入 OpenAI 兼容 LLM 适配层并替换当前 deterministic stub。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
