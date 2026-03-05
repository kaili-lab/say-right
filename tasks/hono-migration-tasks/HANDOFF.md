# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-005` 已完成，准备进入 `HONO-006`。
- 已完成：
  - 前端认证切换为 Better Auth 会话模型：`fetchWithAuth` 统一 `credentials: include`，401 触发本地会话清理并跳转登录。
  - `auth-refresh` 测试已按 session 模型重写，覆盖会话失效、并发 401 单次跳转、登录/注册端点 401 不跳转。
  - 全量 UI/API mock 回归门禁已通过；测试基线改为 session marker（`say_right_session_active`）。
  - `me-page` 测试请求体已对齐 `/api/auth/session` 契约，并补齐退出登录会话清理断言。
  - `pnpm test -- auth`、`pnpm test -- auth-refresh`、`pnpm test -- home record decks review`、`pnpm lint`、`pnpm typecheck` 全通过。
- 下一个任务建议：执行 `HONO-006`，在已完成的前端会话链路基础上推进 Deck/Card/Record API Hono 平移。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
