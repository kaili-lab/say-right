# API-012 契约回归与关键链路集成测试收口

## 目标

- 对已交付 API 做契约一致性回归与关键链路集成收口，确保无回归可联调。

## context_files（AI 开始前必读）

- `tasks/api-tasks/INDEX.md`
- `docs/contracts/v0.1-auth-basic.yaml`
- `docs/contracts/v0.4-record-save-agent.yaml`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- 认证、记录保存、复习流程接口均已实现。

## skill_required

- `python-pro`

## 前置依赖

- `API-004`
- `API-009`
- `API-011`

## paired_with

- `UI-012`

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`
- `docs/contracts/v0.4-record-save-agent.yaml`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-FINAL`

## 范围

- 契约一致性校验
- 关键链路集成测试（auth -> record save -> review）
- 回归结果归档

## 不在范围

- 新需求开发
- 性能压测

## 子步骤（执行清单）

1. 读取 context_files，确认收口契约版本与关键链路
2. 编写/完善契约回归测试（Red）
3. 修正不一致实现并转绿（Green）
4. 运行关键链路全量测试
5. 输出回归报告并保留可追溯证据

## test_scope

- `integration`
- `e2e`

## test_commands

- `pytest -q tests/integration`
- `pytest -q tests/e2e/test_main_flow.py`

## DoD

- 关键契约版本无漂移
- 关键链路可复现且无阻断缺陷
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
