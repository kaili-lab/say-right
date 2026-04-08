# Hono Migration Tasks INDEX

> 状态说明：`todo` / `in-progress` / `done` / `blocked`

## 会话启动必读（强制）

1. `tasks/hono-migration-tasks/INDEX.md`
2. `tasks/hono-migration-tasks/HANDOFF.md`
3. `tasks/hono-migration-tasks/SESSION-MEMORY.md`
4. 当前 task 的 `context_files`

## 本地 D1 前置（强制）

- 开始任何 `backend-hono` 任务前，先在 `backend-hono` 目录执行：
  - `pnpm exec wrangler d1 migrations apply say-right --local`
- 目的：
  - 确保本地 D1 schema 已创建，避免测试或本地联调连接到空库。
  - 该命令可重复执行，适合作为后端 task 的固定前置步骤。

## 任务收尾顺序（强制）

每个 `HONO-*` 任务必须按以下顺序收尾：

1. 完成代码与测试
2. 完成 task review（自审 + 清单审阅）
3. 提交代码（commit）
4. 推送远端（push）
5. 更新 `INDEX/HANDOFF/SESSION-MEMORY` 后，再开始下一个任务

## `app.ts` 增量重构批次（新增）

- 目标：将 `backend-hono/src/app.ts` 从“混合了 bootstrap / middleware / repository helper / domain helper / route handler”的超大文件，逐步收敛为真正的 composition root。
- 执行方式：**分批顺序执行，不并行落码**。原因：绝大多数任务都会改动 `backend-hono/src/app.ts`，若多人并行修改，冲突成本过高。
- 批次划分：
  - **Batch A**：`HONO-014 ~ HONO-017`（安全网 + auth/current-user/middleware 抽离）
  - **Batch B**：`HONO-018 ~ HONO-021`（repository helper + pure domain helper 抽离）
  - **Batch C**：`HONO-022 ~ HONO-024`（auth/speech/deck-card/record 路由模块化）
  - **Batch D**：`HONO-025 ~ HONO-026`（review/dashboard 路由模块化 + `app.ts` 最终收口）
- **每个批次结束后必须停止，不得直接进入下一批。**
- 批次复核门禁（全部通过后才能继续下一批）：
  - `cd backend-hono && pnpm exec wrangler d1 migrations apply say-right --local`
  - `cd backend-hono && pnpm check`
  - `cd frontend && pnpm test`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm typecheck`
  - `cd frontend && pnpm build`
- 若任一门禁失败：
  - 先完成 review，记录失败现象 / 根因判断 / 修复建议
  - 不得进入下一批

| Task ID | 标题 | 状态 | 前置依赖 | paired_with | contract_version | sync_point |
|---|---|---|---|---|---|---|
| HONO-001 | Hono 迁移基线冻结与工程目录落位 | done | - | - | `docs/contracts/v0.0-bootstrap.yaml` | SP-HONO-STACK |
| HONO-002 | Workers + Hono 工程初始化与质量门禁 | done | HONO-001 | - | `docs/contracts/v0.0-bootstrap.yaml` | SP-HONO-BOOTSTRAP |
| HONO-003 | D1 + Drizzle Schema 重建与仓储基线 | done | HONO-002 | - | `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml` | SP-HONO-DATA |
| HONO-004 | Better Auth 后端接入（Hono + D1） | done | HONO-003 | HONO-005 | `docs/contracts/v0.8-auth-session.yaml` | SP-HONO-AUTH |
| HONO-005 | 前端鉴权切换到 Better Auth 会话模式 | done | HONO-004 | HONO-004 | `docs/contracts/v0.8-auth-session.yaml` | SP-HONO-AUTH-FE |
| HONO-006 | Deck/Card/Record API 平移（Hono） | done | HONO-003, HONO-005 | - | `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml` + `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.7-record-save-manual.yaml` | SP-HONO-CRUD-RECORD |
| HONO-007 | Review/Dashboard API 平移（Hono） | done | HONO-006 | - | `docs/contracts/v0.5-review-flow-fsrs.yaml` + `docs/contracts/v0.6-dashboard.yaml` | SP-HONO-REVIEW-DASHBOARD |
| HONO-008 | OpenAI 兼容 LLM 适配层与 Stub 替换 | done | HONO-006 | - | `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-HONO-LLM |
| HONO-009 | Postgres -> D1 数据迁移与一致性校验 | done | HONO-007 | - | N/A（数据迁移任务） | SP-HONO-DATA-MIGRATION |
| HONO-010 | 全量回归、切换 Runbook 与上线收口 | done | HONO-008, HONO-009 | - | 全量契约回归 | SP-HONO-CUTOVER |

| HONO-011 | 语音转文字契约与运行时基线 | done | HONO-010 | - | docs/contracts/v0.9-speech-transcribe.yaml | SP-HONO-SPEECH-CONTRACT |

| HONO-012 | STT Provider 抽象与 AIHubMix Whisper 适配器 | done | HONO-011 | - | docs/contracts/v0.9-speech-transcribe.yaml | SP-HONO-SPEECH-PROVIDER |

| HONO-013 | 语音转文字接口 /speech/transcribe | done | HONO-012 | UI-021 | docs/contracts/v0.9-speech-transcribe.yaml | SP-HONO-SPEECH-API |
| HONO-014 | `app.ts` 重构安全网：组合层表征测试 | todo | HONO-013 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-A |
| HONO-015 | 抽离验证辅助函数到 `src/http/validation.ts` | todo | HONO-014 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-A |
| HONO-016 | 抽离当前用户解析与业务用户桥接 | todo | HONO-015 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-A |
| HONO-017 | 抽离 `requireSession` 中间件并完成 Batch A 复核 | todo | HONO-016 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-A |
| HONO-018 | 抽离 deck/card repository helper | todo | HONO-017 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-B |
| HONO-019 | 抽离 review repository helper | todo | HONO-018 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-B |
| HONO-020 | 抽离 FSRS 纯领域逻辑 | todo | HONO-019 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-B |
| HONO-021 | 抽离 dashboard / record 支撑 helper 并完成 Batch B 复核 | todo | HONO-020 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-B |
| HONO-022 | 模块化 auth / speech 路由 | todo | HONO-021 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-C |
| HONO-023 | 模块化 deck / card 路由 | todo | HONO-022 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-C |
| HONO-024 | 模块化 record 路由并完成 Batch C 复核 | todo | HONO-023 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-C |
| HONO-025 | 模块化 review 路由 | todo | HONO-024 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-D |
| HONO-026 | 模块化 dashboard 路由并收口 `app.ts` 组合层 | todo | HONO-025 | - | N/A（refactor-only） | SP-HONO-APP-REF-BATCH-D |
