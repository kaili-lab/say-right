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
