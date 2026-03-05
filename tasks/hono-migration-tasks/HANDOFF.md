# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-003` 已完成，准备进入 `HONO-004`。
- 已完成：
  - D1/SQLite Drizzle schema 已落位（6 张核心表）。
  - 基础迁移文件已生成：`drizzle/0000_*.sql` + `drizzle/meta/*`。
  - `StudyRepository` 已提供最小可用写入链路。
  - `d1` 集成测试已覆盖约束场景：唯一键/外键/级联删除/复合主键。
  - `pnpm test -- d1`、`pnpm drizzle-kit check`、`pnpm check` 全通过。
- 下一个任务建议：执行 `HONO-004`，接入 Better Auth（Hono + D1）并完成 CORS+cookie 端到端验证。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
