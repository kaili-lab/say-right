# API-024 首页聚合改 SQL 计算与索引补齐

## 目标

将首页 `/dashboard/home-summary` 的统计指标从"拉全量数据到 Python 聚合"改为 SQL 层聚合，消除数据量增长导致的响应退化，并根据 EXPLAIN 结果补齐索引。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/性能优化实施计划-2026-03-03.md`（Phase 1: P1-1, P1-2）
- `docs/性能分析综合报告-2026-03-03.md`（根因 A、E）
- `tasks/api-tasks/HANDOFF.md`
- `tasks/api-tasks/task-api-023-query-reduction-auth-cache.md`（output_summary）
- `backend/app/dashboard/service.py`（当前全量拉取逻辑）
- `backend/app/dashboard/api.py`
- `backend/app/card/repository.py`（`list_by_user` 查询）
- `backend/app/review/repository.py`（`list_by_user` 查询）
- `backend/db/schema.sql`（现有索引）

## previous_task_output（上个任务关键产出摘要）

- API-022 + API-023 已完成 Phase 0 全部优化：连接层优化、查询次数精简、鉴权缓存。
- 但首页仍然通过 `card_repository.list_by_user()` + `review_log_repository.list_by_user()` 拉全量数据到 Python 聚合。
- 实测 5000+ review_logs 时首页从 2.84s 涨到 3.9s，数据量增长会持续退化。
- `DashboardService` 已在 API-023 中移除对 `user_repository` 的依赖，接收 `User` 对象。

## skill_required

- `python-pro`（强制）
- `supabase-postgres-best-practices`（强制）

## 前置依赖

- `API-023`

## paired_with

- 无

## contract_version

- 无（响应结构不变，内部实现优化）

## sync_point

- `SP-PERF-PHASE1`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy

- upstream_status: ready

## 范围

1. **新增 `backend/app/dashboard/repository.py`**（P1-1）
   - 实现 `PostgresDashboardRepository`，包含 1-2 条聚合 SQL
   - 聚合指标：`study_days`、`mastered_count`、`total_cards`、`total_due`、`recent_decks`
   - SQL 在数据库层完成聚合，不拉全量 review_logs 到应用层
   - `mastered_count`：基于每卡最新评分判定（`DISTINCT ON` 或窗口函数）
   - 实现 `InMemoryDashboardRepository` 供内存后端使用（保持现有 Python 聚合逻辑）
2. **改造 `backend/app/dashboard/service.py`**
   - `DashboardService` 改为调用 `DashboardRepository` 获取聚合数据
   - 移除对 `card_repository` 和 `review_log_repository` 的直接依赖
3. **索引补齐**（P1-2）
   - 先写好聚合 SQL，在真实数据库上跑 EXPLAIN ANALYZE
   - 根据 EXPLAIN 结果决定补什么索引，更新 `backend/db/schema.sql`
   - 候选方向：`review_logs (user_id, card_id, rated_at DESC)`
4. **改造 `backend/app/main.py`**
   - `build_repositories_from_env` 或 `create_app` 中装配 `DashboardRepository`

## 不在范围

- `/decks`、`/review/decks` 查询优化（API-025）
- async 仓储迁移
- API 契约变更（`HomeSummaryResponse` 结构不变）
- 前端改动

## 子步骤（执行清单）

1. 读取 context_files，确认 API-023 产出与当前 `DashboardService` 状态
2. 写失败测试（Red）：
   - `PostgresDashboardRepository`：聚合查询返回正确的 `study_days`、`mastered_count`、`total_cards`、`total_due`、`recent_decks`
   - 边界用例：无卡片用户、无复习记录用户、大量 review_logs 用户
   - 集成测试：`/dashboard/home-summary` 响应结构与现有契约一致
3. 最小实现（Green）：编写聚合 SQL，实现 repository
4. 在真实数据库上 EXPLAIN ANALYZE，根据结果补齐索引
5. 改造 `DashboardService` 使用新 repository
6. 运行全量测试确认无回归
7. 保留 test_commands 和 EXPLAIN 结果的可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/ tests/integration/`
- `make -C backend check`

## DoD

- 首页统计指标由 SQL 聚合计算，不再拉全量 `review_logs` / `cards` 到 Python
- `DashboardService` 不再直接依赖 `card_repository` 和 `review_log_repository`
- `/dashboard/home-summary` 响应结构与现有契约一致
- 索引补齐并已同步到 `schema.sql`
- EXPLAIN ANALYZE 结果留档（写入 output_summary 或附录）
- 全量测试无回归（`make -C backend check` 通过）

## output_summary（任务完成后由 AI 填写）

（待填写）
