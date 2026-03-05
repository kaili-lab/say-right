# SESSION MEMORY（跨会话记忆）

> 目的：把“跨会话容易丢失但会影响质量/进度”的信息沉淀为单一事实来源。

## 会话启动必读（强制）

每次开始新会话，按顺序阅读：

1. `tasks/hono-migration-tasks/INDEX.md`
2. `tasks/hono-migration-tasks/HANDOFF.md`
3. `tasks/hono-migration-tasks/SESSION-MEMORY.md`（本文件）
4. 当前 task 文档的 `context_files`

## 每个任务结束后的必填项（强制）

完成任一 `HONO-*` 任务后，必须在本文件追加一条记录，至少包含：

- task_id
- 日期时间
- 关键变更
- 测试证据（命令 + 退出码 + 关键通过行）
- 踩坑/教训（WHAT + WHY）
- 新增规则（若有）
- 对后续任务的影响

## 记录模板

```md
## [YYYY-MM-DD HH:mm] HONO-XXX 标题

- 关键变更：
  - ...
- 测试证据：
  - 命令：`...`
  - 退出码：`0`
  - 关键通过行：`...`
- 踩坑/教训：
  - ...（说明 WHY）
- 新增规则：
  - ...
- 对后续任务影响：
  - ...
```

## 固定规则（持续维护）

1. 主线在 `main` 上推进，不做 `feat/hono-cloudflare-migration` 作为主开发线。
2. 上线策略为“全量 Hono + 前端同步改完再上线”，不保留旧 `/auth/login|refresh|logout` 兼容代理。
3. 所有任务必须遵循 TDD：Red -> Green -> Refactor。
4. LLM 测试禁止依赖真实模型，必须使用可复现 fixture/stub。
5. 每个任务完成后，必须先完成 review，再 `commit + push`，然后才能开始下一个任务。

## 经验沉淀区

> 按时间倒序追加，最新在最上方。

## [2026-03-05 21:55] HONO-001 Hono 迁移基线冻结与工程目录落位

- 关键变更：
  - 创建 `backend-hono/` 目录。
  - 新增 `backend-hono/.env.example`，统一 Hono/Cloudflare/Better Auth/OpenAI 兼容变量口径。
  - 本地生成 `backend-hono/.env` 与 `backend-hono/.dev.vars`，值来自现有 `backend/.env`，用于迁移期本地联调。
  - 迁移方案文档新增“迁移期环境变量草案”章节。
- 测试证据：
  - 命令：`test -d backend-hono`
  - 退出码：`0`
  - 关键通过行：`test -d backend-hono => 0`
  - 命令：`test -f docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
  - 退出码：`0`
  - 关键通过行：`test -f Hono方案文档 => 0`
  - 命令：`rg -n "直接在 .*main.* 执行迁移" docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
  - 退出码：`0`
  - 关键通过行：`已确认采用“直接在 main 执行迁移”的策略。`
- 踩坑/教训：
  - `.dev.vars` 默认不会被 `.env` 规则覆盖，需要单独加入 `.gitignore`，否则容易把本地密钥误提交。
- 新增规则：
  - 迁移期统一使用 `backend-hono/.env.example` 作为变量口径文档，真实值仅放本地 `.env/.dev.vars`。
- 对后续任务影响：
  - `HONO-002` 可以直接复用当前环境变量基线与 CORS origin 变量，不需要再次定义。
