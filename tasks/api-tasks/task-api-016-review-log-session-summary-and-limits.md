# API-016 复习日志持久化、会话总结与每日上限

## 目标

- 为复习链路补齐可追踪数据基线：会话持久化、复习日志、会话总结与每日新卡/复习上限。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/初版需求.md`
- `docs/待实现清单.md`
- `tasks/api-tasks/HANDOFF.md`
- `tasks/api-tasks/task-api-011-review-session-and-rate-fsrs.md`
- `tasks/api-tasks/task-api-015-runtime-storage-cutover-postgres.md`
- `backend/db/schema.sql`

## previous_task_output（上个任务关键产出摘要）

- API-015 已完成运行态仓储切换，users/decks/cards 可使用 PostgreSQL 持久化，但 review session 仍为内存态，且无复习历史日志。

## skill_required

- `python-pro`

## 前置依赖

- `API-015`

## paired_with

- `UI-013`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-REVIEW-PERSISTENCE`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `ready`
- gap: 无
- strategy: 通过内存仓储测试行为，通过集成测试验证 API 契约与聚合口径
- rollback_plan: 若后续改为 SQLAlchemy async，保留本任务测试作为行为回归基线

## 范围

- 新增 `review_logs`、`review_sessions`（及明细）持久化结构
- `POST /review/session/{session_id}/rate` 写入复习日志
- 新增 `GET /review/session/{session_id}/summary`
- 复习会话改为仓储驱动，移除纯内存 dict 单点丢失风险
- `GET /review/decks/{deck_id}/session` 增加每日新卡/复习上限（v1 默认值）
- Dashboard 指标改为基于复习日志计算（study_days、mastered_count）

## 不在范围

- 前端页面改造
- LLM 模型供应商接入
- PostgreSQL 全异步化改造

## 子步骤（执行清单）

1. 写失败测试：会话总结端点、日志写入、每日上限与 dashboard 口径（Red）
2. 实现 review 相关仓储与 service 编排（Green）
3. 更新 schema 与契约覆盖测试
4. 运行后端全量质量门禁并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_review_session_api.py tests/integration/test_dashboard_api.py`
- `make -C backend check`

## DoD

- 复习会话支持持久化读取，不依赖进程内存字典
- 每次 rate 均有 review log，且 session summary 可按日志聚合
- 每日新卡/复习上限生效（默认值）
- Dashboard 的 `study_days` 与 `mastered_count` 基于 review_logs 计算
- 全量测试无回归（不只是本任务测试）

## output_summary（任务完成后由 AI 填写）

- 新增复习持久化仓储：`backend/app/review/repository.py`（`review_sessions`、`review_session_cards`、`review_logs` 的内存/PG 双实现）。
- `ReviewSessionService` 已改为仓储驱动：会话创建不再依赖进程内 dict，`rate` 会写入 review_log，新增 `get_session_summary()` 聚合能力。
- `GET /review/session/{session_id}/summary` 已落地到 `backend/app/review/api.py`，并完成鉴权/404 映射。
- `GET /review/decks/{deck_id}/session` 已增加默认上限：新卡 20、复习卡 100（按当日已评级日志扣减后生效）。
- Dashboard 指标口径已切换到 review_logs：`study_days` 按复习日去重，`mastered_count` 按卡片最近一次评级是否 Good/Easy 统计。
- 关键测试补齐：`backend/tests/integration/test_review_session_api.py`、`backend/tests/integration/test_dashboard_api.py`、`backend/tests/unit/test_schema_sync.py`。
