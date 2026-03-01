# API-004 注册/登录/刷新/当前用户接口

## 目标

- 交付 v1 必需认证接口：注册、登录、刷新令牌、当前用户信息。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-003-auth-domain-and-token-utils.md`
- `docs/初版需求.md`
- `docs/contracts/v0.1-auth-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-003 已提供用户模型与认证工具。

## skill_required

- `python-pro`

## 前置依赖

- `API-003`

## paired_with

- `UI-011`

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-002`

## 范围

- `/auth/register`
- `/auth/login`
- `/auth/refresh`
- `/me`

## 不在范围

- OAuth 第三方登录
- 找回密码

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败集成测试：四个认证接口核心路径（Red）
3. 最小实现路由与依赖注入（Green）
4. 补齐重复邮箱/非法凭证/过期 token 边界
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_auth_api.py`

## DoD

- 四个认证接口满足契约
- 多租户基础用户上下文可用
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已实现认证接口：`POST /auth/register`、`POST /auth/login`、`POST /auth/refresh`、`GET /me`，见 `backend/app/auth/api.py`。
- 已新增认证服务与用户仓储：`AuthService` + `InMemoryUserRepository`，支持注册、登录、令牌刷新与当前用户解析。
- 已覆盖契约边界：重复邮箱返回 409、非法凭证返回 401、过期 refresh token 返回 401、参数校验返回 422。
- 已形成多租户基础用户上下文：`/me` 通过 access token 解析到当前用户（user_id/email）。
- 已完成集成测试：`backend/tests/integration/test_auth_api.py`。
