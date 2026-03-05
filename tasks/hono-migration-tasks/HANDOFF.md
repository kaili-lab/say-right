# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-004` 已完成，准备进入 `HONO-005`。
- 已完成：
  - Better Auth 已接入 Hono 路由，`/api/auth/*` 与 `/api/auth/session` 可用。
  - Better Auth 所需 schema 已落库：`auth_users/auth_sessions/auth_accounts/auth_verifications`。
  - 受保护路由中间件已落位，未登录返回 401，登录会话返回 200。
  - CORS + cookie 链路已验证：显式 origin + credentials + cookie 会话收发。
  - `pnpm test -- auth`、`pnpm test -- auth cors session`、`pnpm check` 全通过。
- 下一个任务建议：执行 `HONO-005`，完成前端 `fetchWithAuth` 与全量 API 模块的会话化改造回归。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
