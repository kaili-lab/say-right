# API-014 首页概览聚合接口（去静态数据）

## 目标

- 提供首页概览聚合接口，让首页 UI 不再依赖前端静态示例数据。

## context_files（AI 开始前必读）

- `docs/初版需求.md`
- `tasks/api-tasks/task-api-012-contract-regression-and-integration-closure.md`
- `tasks/api-tasks/task-api-013-neon-schema-sync.md`

## previous_task_output（上个任务关键产出摘要）

- API-013 已具备 Neon schema 同步基线与统一 `db-sync` 命令。

## skill_required

- `python-pro`

## 前置依赖

- `API-012`

## paired_with

- 无

## contract_version

- 无（新增聚合接口，先以实现与测试收口）

## sync_point

- `SP-HOME-DASHBOARD`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `ready`
- gap: 无
- strategy: 通过 `app.state.card_repository` 注入测试卡片数据
- rollback_plan: 无

## 范围

- 新增 `GET /dashboard/home-summary`
- 聚合字段：`study_days`、`mastered_count`、`total_cards`、`total_due`、`recent_decks`
- 补齐接口集成测试

## 不在范围

- 替换运行态为数据库仓储
- 接入真实 LLM 供应商

## 子步骤（执行清单）

1. 写失败测试：首页聚合接口返回结构与鉴权约束（Red）
2. 实现 dashboard service 与 API 路由（Green）
3. 接入应用装配并补注释
4. 执行后端全量质量门禁

## test_scope

- `integration`

## test_commands

- `pytest -q tests/integration/test_dashboard_api.py`
- `make -C backend check`

## DoD

- 首页聚合接口可用且鉴权正确
- 前端可通过该接口替换首页静态数据
- 全量测试无回归（不只是本任务的测试）

## output_summary（任务完成后由 AI 填写）

- 已新增 dashboard 模块：`backend/app/dashboard/service.py`、`backend/app/dashboard/api.py`
- 已新增接口：`GET /dashboard/home-summary`
- 已在应用装配中注册 dashboard 路由：`backend/app/main.py`
- 已新增集成测试：`backend/tests/integration/test_dashboard_api.py`
