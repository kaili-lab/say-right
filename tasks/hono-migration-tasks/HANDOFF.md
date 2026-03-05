# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-009` 已完成，准备进入 `HONO-010`。
- 已完成：
  - 新增迁移核心模块 `backend-hono/src/migration/snapshot.ts`：快照解析、D1 重复导入、逐表一致性校验（行数 + 哈希）。
  - 新增迁移脚本：
    - `backend-hono/scripts/migration/export-postgres.ts`
    - `backend-hono/scripts/migration/import-d1.ts`
    - `backend-hono/scripts/migration/verify-d1.ts`
  - 新增迁移测试 `backend-hono/tests/migration-tools.test.ts`，覆盖“重复导入成功”与“数据漂移校验失败（Red）”。
  - 新增迁移执行手册：`docs/HONO-009-Postgres-to-D1迁移手册.md`。
  - 为迁移脚本补充运行入口：`package.json` 新增 `migration:export/import/verify`，`tsconfig` 纳入 `scripts` 并启用 `allowImportingTsExtensions`。
  - 已执行 claude reviewer subagent 复审，确认核心风险点并完成自审收口。
  - `cd backend-hono && pnpm test -- migration`、`cd backend-hono && pnpm check`、`make -C backend check` 全通过。
- 下一个任务建议：执行 `HONO-010`，完成全量回归与上线 Runbook 收口。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
