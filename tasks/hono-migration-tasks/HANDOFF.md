# HONO Migration HANDOFF

## 最近一次交接

- 当前阶段：`HONO-001` 已完成，准备进入 `HONO-002`。
- 已完成：
  - 创建 `backend-hono/` 基线目录。
  - 迁移环境变量基线已落位：`backend-hono/.env.example`（可提交）+ 本地 `.env/.dev.vars`（不入库）。
  - 迁移方案文档已补充“迁移期环境变量草案”。
  - 已验证“直接在 `main` 执行迁移”策略在文档中可检索。
- 下一个任务建议：执行 `HONO-002`，完成 Worker 初始化、`/health`、CORS 骨架与质量门禁命令。

## 注意事项

- 迁移阶段不得在 `api-tasks` / `ui-tasks` 中混写 Hono 任务。
- 每个任务必须附可追溯测试证据（命令 + 退出码 + 关键通过行）。
- 每次新会话或执行新 task 前，必须先阅读 `SESSION-MEMORY.md`。
- 每个 task 完成后，必须在 `SESSION-MEMORY.md` 追加经验记录。
- 每个 task 完成后，必须先 review，再 `commit + push`，之后才能进入下一个 task。
