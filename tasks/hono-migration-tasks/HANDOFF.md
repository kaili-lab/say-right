# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-010` 已完成，Hono 迁移任务链路已全部收口。
- 已完成：
  - 执行并通过后端全量门禁：`cd backend-hono && pnpm check`。
  - 执行并通过前端全量门禁：`cd frontend && pnpm test`、`cd frontend && pnpm lint && pnpm typecheck`。
  - 执行并通过项目后端强制门禁：`make -C backend check`。
  - 新增上线切换文档：`docs/HONO-010-Hono切换Runbook.md`（含切换步骤、监控项、回滚步骤）。
  - 结合 `HONO-009` 的迁移脚本与校验流程，形成可执行的上线前置清单与证据链。
- 下一个任务建议：进入发布窗口演练（staging 实跑一次 Runbook），确认后再执行生产切换。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
