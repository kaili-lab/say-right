# API-003 认证领域模型与密码/令牌工具

## 目标

- 提供用户实体、密码哈希工具、JWT 编解码工具，为认证 API 做最小依赖准备。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-002-fastapi-bootstrap-and-health.md`
- `docs/初版需求.md`
- `docs/contracts/v0.1-auth-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-002 已提供可运行服务与测试基线。

## skill_required

- `python-pro`

## 前置依赖

- `API-002`

## paired_with

- 无

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-API-001`

## 范围

- User 模型与基础 schema
- 密码哈希/校验工具
- access/refresh token 生成与校验工具

## 不在范围

- 认证接口路由
- 邮件找回密码

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：密码哈希与 token 工具行为（Red）
3. 最小实现工具与模型（Green）
4. 补齐过期/错误 token 边界用例
5. 保留可追溯证据

## test_scope

- `unit`

## test_commands

- `pytest -q tests/unit/test_auth_utils.py`

## DoD

- 认证基础工具可复用
- 边界行为可预测
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增认证基础工具：`backend/app/auth/passwords.py`（密码哈希/校验）与 `backend/app/auth/tokens.py`（access/refresh token 生成与校验）。
- 已新增认证 schema：`backend/app/auth/schemas.py`，包含 `TokenPayload` 与 `TokenPair`。
- 已新增用户领域模型与基础 schema：`backend/app/domain/models.py`（`User`）与 `backend/app/domain/schemas.py`（`UserCreate`/`UserPublic`）。
- 已完成边界行为测试：过期 token、篡改 token、token 类型不匹配均返回可预测的领域异常。
- 已补充依赖：`PyJWT`、`pwdlib[argon2]`（见 `backend/pyproject.toml`）。
