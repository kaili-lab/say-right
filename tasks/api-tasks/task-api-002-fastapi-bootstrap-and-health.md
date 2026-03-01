# API-002 FastAPI 骨架与健康检查

## 目标

- 建立最小可运行 FastAPI 工程，交付 `/health` 基线能力。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-001-backend-stack-freeze.md`
- `tasks/api-tasks/DECISIONS.md`
- `docs/contracts/v0.0-bootstrap.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-001 已冻结后端技术栈与测试命令。

## skill_required

- `python-pro`

## 前置依赖

- `API-001`

## paired_with

- `UI-002`

## contract_version

- `docs/contracts/v0.0-bootstrap.yaml`

## sync_point

- `SP-001`

## 范围

- FastAPI 项目目录初始化
- `/health` 路由与最小测试
- pytest 运行基线

## 不在范围

- 业务模型
- 认证逻辑

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：`GET /health` 返回 200（Red）
3. 最小实现健康检查接口（Green）
4. 整理工程结构与测试入口
5. 运行测试并保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit`
- `pytest -q tests/integration/test_health.py`

## DoD

- 服务可启动，`/health` 稳定返回
- 单元/集成测试可执行并通过
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
