# Hono Migration Tasks INDEX

> 状态说明：`todo` / `in-progress` / `done` / `blocked`

## 会话启动必读（强制）

1. `tasks/hono-migration-tasks/INDEX.md`
2. `tasks/hono-migration-tasks/HANDOFF.md`
3. `tasks/hono-migration-tasks/SESSION-MEMORY.md`
4. 当前 task 的 `context_files`

## 任务收尾顺序（强制）

每个 `HONO-*` 任务必须按以下顺序收尾：

1. 完成代码与测试
2. 完成 task review（自审 + 清单审阅）
3. 提交代码（commit）
4. 推送远端（push）
5. 更新 `INDEX/HANDOFF/SESSION-MEMORY` 后，再开始下一个任务

| Task ID | 标题 | 状态 | 前置依赖 | paired_with | contract_version | sync_point |
|---|---|---|---|---|---|---|
| HONO-001 | Hono 迁移基线冻结与工程目录落位 | done | - | - | `docs/contracts/v0.0-bootstrap.yaml` | SP-HONO-STACK |
| HONO-002 | Workers + Hono 工程初始化与质量门禁 | todo | HONO-001 | - | `docs/contracts/v0.0-bootstrap.yaml` | SP-HONO-BOOTSTRAP |
| HONO-003 | D1 + Drizzle Schema 重建与仓储基线 | todo | HONO-002 | - | `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml` | SP-HONO-DATA |
| HONO-004 | Better Auth 后端接入（Hono + D1） | todo | HONO-003 | HONO-005 | `docs/contracts/v0.8-auth-session.yaml` | SP-HONO-AUTH |
| HONO-005 | 前端鉴权切换到 Better Auth 会话模式 | todo | HONO-004 | HONO-004 | `docs/contracts/v0.8-auth-session.yaml` | SP-HONO-AUTH-FE |
| HONO-006 | Deck/Card/Record API 平移（Hono） | todo | HONO-003, HONO-005 | - | `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml` + `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.7-record-save-manual.yaml` | SP-HONO-CRUD-RECORD |
| HONO-007 | Review/Dashboard API 平移（Hono） | todo | HONO-006 | - | `docs/contracts/v0.5-review-flow-fsrs.yaml` + `docs/contracts/v0.6-dashboard.yaml` | SP-HONO-REVIEW-DASHBOARD |
| HONO-008 | OpenAI 兼容 LLM 适配层与 Stub 替换 | todo | HONO-006 | - | `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-HONO-LLM |
| HONO-009 | Postgres -> D1 数据迁移与一致性校验 | todo | HONO-007 | - | N/A（数据迁移任务） | SP-HONO-DATA-MIGRATION |
| HONO-010 | 全量回归、切换 Runbook 与上线收口 | todo | HONO-008, HONO-009 | - | 全量契约回归 | SP-HONO-CUTOVER |
