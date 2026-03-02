# API-017 Dashboard 洞察、昵称/登出、CORS 环境化与契约补齐

## 目标

- 补齐首页洞察与用户显示名能力，完善登出端点与部署必需的 CORS 环境化配置。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/初版需求.md`
- `docs/待实现清单.md`
- `tasks/api-tasks/task-api-014-dashboard-home-summary.md`
- `tasks/api-tasks/task-api-016-review-log-session-summary-and-limits.md`
- `backend/app/main.py`
- `backend/app/auth/api.py`

## previous_task_output（上个任务关键产出摘要）

- API-016 已补齐复习日志与会话总结，Dashboard 核心统计可从日志聚合。

## skill_required

- `python-pro`

## 前置依赖

- `API-016`

## paired_with

- `UI-013`

## contract_version

- `docs/contracts/v0.6-dashboard.yaml`

## sync_point

- `SP-DASHBOARD-IDENTITY`

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
- strategy: 集成测试覆盖 `/me`、`/auth/logout`、`/dashboard/home-summary`
- rollback_plan: 无

## 范围

- 用户模型新增 `nickname`（可空，默认展示值由邮箱前缀推导）
- 注册接口可选传入 nickname
- `/me` 返回 nickname 与 display_name
- 新增 `POST /auth/logout`（JWT v1 无状态登出）
- `GET /dashboard/home-summary` 增加 `display_name` 与 `insight`
- CORS origins 支持环境变量配置
- 新增 `docs/contracts/v0.6-dashboard.yaml`

## 不在范围

- 密码找回流程
- token 黑名单机制

## 子步骤（执行清单）

1. 写失败测试：昵称字段、登出端点、dashboard 新字段、CORS 配置（Red）
2. 最小实现与向后兼容处理（Green）
3. 补齐 dashboard 契约 YAML 与回归测试
4. 执行后端全量质量门禁

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_auth_api.py tests/integration/test_dashboard_api.py tests/unit/test_storage_runtime.py`
- `make -C backend check`

## DoD

- `/me`、注册与首页概览返回昵称/展示名相关字段
- `/auth/logout` 可用且幂等
- CORS 可通过环境变量配置生产域名
- dashboard 契约文件补齐并与实现一致
- 全量测试无回归

## output_summary（任务完成后由 AI 填写）

- 用户模型已扩展昵称：`backend/app/domain/models.py` 新增 `nickname` 与 `display_name` 推导属性；`users` 表通过 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS nickname` 对齐。
- 认证链路已支持昵称：`/auth/register` 可选 `nickname`，`/me` 返回 `nickname + display_name`，并新增 `POST /auth/logout`（JWT 无状态登出校验）。
- CORS 已支持环境变量：`backend/app/db/runtime.py` 新增 `resolve_cors_allow_origins()`，`backend/app/main.py` 改为运行时读取 `APP_CORS_ALLOW_ORIGINS`。
- Dashboard 已新增 `display_name` 与 `insight` 字段：`backend/app/dashboard/service.py`、`backend/app/dashboard/api.py`。
- 新增契约文件：`docs/contracts/v0.6-dashboard.yaml`，并同步更新 `docs/contracts/README.md`、`docs/contracts/v0.1-auth-basic.yaml`。
- 关键测试已覆盖：`backend/tests/integration/test_auth_api.py`、`backend/tests/integration/test_dashboard_api.py`、`backend/tests/integration/test_contract_regression.py`、`backend/tests/unit/test_storage_runtime.py`。
