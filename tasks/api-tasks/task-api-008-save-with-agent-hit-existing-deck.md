# API-008 save-with-agent（命中已有组）

## 目标

- 实现记录保存编排链路的第一阶段：Agent 命中已有组时直接创建卡片。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-007-card-crud-and-move.md`
- `docs/初版需求.md`
- `docs/contracts/v0.4-record-save-agent.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-007 已具备卡片创建能力与分组关系。

## skill_required

- `python-pro`

## 前置依赖

- `API-005`
- `API-007`

## paired_with

- `UI-006`

## contract_version

- `docs/contracts/v0.4-record-save-agent.yaml`

## sync_point

- `SP-004`

## 范围

- `/records/save-with-agent` 基础路由
- Agent 命中已有组分支（stub LLM）
- 创建卡片并返回分组结果

## 不在范围

- 未命中建组逻辑
- 失败兜底逻辑

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：命中已有组分支（Red）
3. 最小实现编排并转绿（Green）
4. 补齐输入校验与空响应边界
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_save_with_agent_hit.py`

## DoD

- 命中已有组分支稳定可用
- 与契约返回字段对齐
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增 `POST /records/save-with-agent` 基础路由，支持鉴权、参数校验与契约返回字段。
- 已实现 API-008 范围内编排：Group Agent 命中已有组时直接创建卡片并返回 `deck_created=false`、`fallback_used=false`。
- 已实现可复现 Group Agent stub（关键词命中），为后续 API-009 的“未命中/兜底”分支预留扩展位。
- 已补充集成测试：`backend/tests/integration/test_save_with_agent_hit.py`（命中成功、参数校验、未命中阶段性 422、未认证 401）。
- 已完成回归：`make -C backend check` 通过（含 test/lint/typecheck）。
