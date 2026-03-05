# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-002` 已完成，准备进入 `HONO-003`。
- 已完成：
  - `backend-hono` 已完成 Hono Worker 工程初始化。
  - `GET /health` 已实现并通过契约测试。
  - CORS 骨架已落位：显式 origin（非 `*`）+ `credentials=true`。
  - 质量门禁命令已落位并通过：`pnpm test/lint/typecheck/check`。
  - `wrangler dev` 已验证可启动（`Ready on http://localhost:8787`）。
- 下一个任务建议：执行 `HONO-003`，落位 D1 + Drizzle schema 与 repository 基线。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
