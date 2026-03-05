# HONO-007 Review/Dashboard API 平移（Hono）

## 目标

- 平移复习链路与首页统计接口到 Hono，保持 FSRS 与统计口径一致。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `backend/app/review/`
- `backend/app/dashboard/`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`
- `docs/contracts/v0.6-dashboard.yaml`

## previous_task_output（上个任务关键产出摘要）

- Deck/Card/Record API 已在 Hono 跑通。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-006`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml` + `docs/contracts/v0.6-dashboard.yaml`

## sync_point

- `SP-HONO-REVIEW-DASHBOARD`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `-`
  version: `-`
  reason: 复用既有依赖
  install_command: `-`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. review deck list / session / rate / summary 接口平移
2. dashboard home-summary 平移
3. 保留每日限额与复习摘要口径（与现有行为等价）
4. 基于 `review_session_cards` 迁移 session 存储策略（不降级）
5. 查询性能与统计口径回归

## 不在范围

- LLM provider 切换
- 数据迁移

## 子步骤（执行清单）

1. 写失败测试（Red）：复习主链路 + 统计接口
2. 最小实现（Green）
3. 补齐边界（每日上限、权限、空状态）
4. 执行 test_commands

## test_scope

- integration
- e2e

## test_commands

- `cd backend-hono && pnpm test -- review dashboard`
- `cd backend-hono && pnpm check`

## DoD

- review/dashboard 契约回归通过
- 关键统计口径一致
- 每日限额与复习摘要行为与现有版本等价
- `review_session_cards` 存储策略已照移并通过测试
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 关键产出文件：
  - `backend-hono/src/app.ts`
  - `backend-hono/tests/review-dashboard-api.test.ts`
- 已完成接口平移：
  - `GET /review/decks`（`due_count = due_count + new_count`，按 `due_count` 降序）
  - `GET /review/decks/{deck_id}/session`（仅取到期卡；默认每日上限新卡 20、复习卡 100；按当日 `review_logs` 抵扣；写入 `review_sessions` + `review_session_cards`）
  - `POST /review/session/{session_id}/ai-score`（会话/卡片归属校验；deterministic AI 评分；`__AI_UNAVAILABLE__ -> 503`）
  - `POST /review/session/{session_id}/rate`（again/hard/good/easy FSRS 调度；更新卡片状态；写 `review_logs`）
  - `GET /review/session/{session_id}/summary`（`reviewed_count/accuracy/rating_distribution`）
  - `GET /dashboard/home-summary`（`display_name/insight/study_days/mastered_count/total_cards/total_due/recent_decks`）
- 关键约定：
  - 复习配额按 UTC 自然日统计（与 FastAPI 口径一致）。
  - `display_name` 优先会话昵称，否则回退邮箱前缀。
  - `insight` 使用 `user_id + 当日` 的稳定哈希抽样，避免刷新抖动。
- 测试覆盖：
  - 新增集成测试 `backend-hono/tests/review-dashboard-api.test.ts`，覆盖主链路与 `401/404/422/503` 边界、每日配额抵扣、dashboard 聚合。
