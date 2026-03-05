# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-006` 已完成，准备进入 `HONO-007`。
- 已完成：
  - 在 `backend-hono/src/app.ts` 完成 `decks/cards/records` 路由平移，鉴权方式切到 Better Auth session cookie。
  - 新增会话用户到业务用户表的兜底同步逻辑，打通 `auth_users -> users` 数据链路，避免 D1 外键阻塞。
  - 完成 `records/generate` deterministic stub（含 `__FAIL_STUB__ -> 503`）与 `records/save` 手动入组保存。
  - 兼容 `records/save-with-agent` 路由，保持前端现有保存主路径可用（命中/建组/默认组回退）。
  - 新增集成测试 `backend-hono/tests/deck-card-record-api.test.ts`，覆盖成功路径与 `401/404/409/422/503`。
  - `cd backend-hono && pnpm test -- deck card record`、`cd backend-hono && pnpm check`、`make -C backend check` 全通过。
- 下一个任务建议：执行 `HONO-007`，平移 Review/Dashboard API 并对齐 FSRS 会话与聚合查询行为。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
