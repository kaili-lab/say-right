# API-025 Deck/Review 首屏查询收敛

## 目标

优化 `/decks` 和 `/review/decks` 的查询路径，确保首屏只走必要查询，减少重复读取，并完成 Phase 0 + Phase 1 的性能基准验收。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/性能优化实施计划-2026-03-03.md`（Phase 1: P1-3 + 验收标准）
- `docs/性能分析综合报告-2026-03-03.md`
- `tasks/api-tasks/HANDOFF.md`
- `tasks/api-tasks/task-api-024-dashboard-sql-aggregation.md`（output_summary）
- `backend/app/deck/api.py`
- `backend/app/deck/service.py`
- `backend/app/deck/repository.py`
- `backend/app/review/api.py`
- `backend/app/review/service.py`
- ~~`backend/app/review/session_service.py`~~（不在本次范围）

## previous_task_output（上个任务关键产出摘要）

- API-022 已完成连接层优化（health check 删除、retry 全覆盖、读 autocommit、计时中间件）。
- API-023 已完成查询次数精简（惰性 ensure、去重复 user 查询、鉴权缓存）。
- API-024 已完成首页聚合 SQL 改造。
- `/decks` 和 `/review/decks` 的查询路径尚未针对性优化。

## skill_required

- `python-pro`（强制）

## 前置依赖

- `API-024`

## paired_with

- 无

## contract_version

- 无（内部优化，不影响 API 契约）

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

1. **审查 `/decks` 查询路径**
   - 当前 `GET /decks` 通过 `deck_service.list_decks()` → `list_by_user()`
   - 确认 API-023 的惰性 ensure 已生效，稳态下只需 1 次查询
   - 如仍存在冗余查询，进一步收敛
2. **审查 `/review/decks` 查询路径**
   - 当前 `GET /review/decks` 通过 `review_service.list_review_decks()` → `deck_service.list_decks()`
   - 确认查询次数，如需合并则调整
3. **新增性能基准脚本**
   - `backend/scripts/bench_tab_latency.py`
   - 对 `/decks`、`/review/decks`、`/dashboard/home-summary` 做基准测试
   - 先 3 次预热，再 20 次采样，输出 avg / P95
4. **运行性能基准验收**
   - 验收标准参见性能优化实施计划 §4

## 不在范围

- 首页聚合改造（已在 API-024 完成）
- `GET /review/decks/{deck_id}/session` 查询优化（不在 Tab 首屏加载路径上，另开后续任务）
- async 仓储迁移
- API 契约变更
- 前端改动
- Phase 2 可选增强（缓存、channel_binding、async 改造）

## 子步骤（执行清单）

1. 读取 context_files，确认 API-024 产出与当前工程状态
2. 分析 `/decks` 和 `/review/decks` 当前实际查询次数（可通过计时中间件日志确认）
3. 写失败测试（Red）：
   - 如有查询优化：验证优化后的行为正确
   - 性能基准脚本：验证脚本可正常运行并输出格式正确的报告
4. 实现查询收敛优化（Green）
5. 编写 `bench_tab_latency.py` 基准脚本
6. 在真实 Postgres 环境运行基准，记录改造后数据
7. 运行全量测试确认无回归
8. 保留 test_commands 和性能基准结果的可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/ tests/integration/`
- `make -C backend check`
- `python scripts/bench_tab_latency.py`（性能验收）

## DoD

- `/decks` 和 `/review/decks` 首屏查询路径已审查并优化（无冗余查询）
- 性能基准脚本 `bench_tab_latency.py` 已就位并可运行
- 性能基准结果满足验收标准（或记录差距与原因）：
  - `/decks` P95 <= 500ms
  - `/review/decks` P95 <= 500ms
  - `/dashboard/home-summary` P95 <= 800ms（含 5000+ logs 用户）
- 响应结构与现有契约一致
- 全量测试无回归（`make -C backend check` 通过）

## output_summary（任务完成后由 AI 填写）

（待填写）
