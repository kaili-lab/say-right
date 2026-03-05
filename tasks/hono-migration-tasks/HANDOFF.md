# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：迁移任务拆分已建立，尚未开始实现（全部 `todo`）。
- 已完成：
  - 新增迁移任务目录：`tasks/hono-migration-tasks/`
  - 明确主线决策：直接在 `main` 上执行全量迁移
  - 明确上线策略：前后端同步改完后一次切换
  - 新增跨会话记忆文件：`tasks/hono-migration-tasks/SESSION-MEMORY.md`
- 下一个任务建议：从 `HONO-001` 开始，先落位 `backend-hono` 工程目录与基线约束。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
