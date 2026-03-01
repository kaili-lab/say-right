# API-009 save-with-agent（未命中建组 + 默认组兜底）

## 目标

- 完成记录保存编排链路第二阶段：未命中时自动建组，失败时回退默认组。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-008-save-with-agent-hit-existing-deck.md`
- `docs/初版需求.md`
- `docs/contracts/v0.4-record-save-agent.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-008 已实现命中已有组分支。

## skill_required

- `python-pro`

## 前置依赖

- `API-008`

## paired_with

- `UI-006`

## contract_version

- `docs/contracts/v0.4-record-save-agent.yaml`

## sync_point

- `SP-004`

## 范围

- 未命中自动建组分支
- 建组失败或 Agent 失败时回退默认组
- 返回 `deck_created` / `fallback_used` 标记

## 不在范围

- Agent 提示词优化
- 复杂多轮工具调用观测平台

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：未命中建组与失败兜底两条分支（Red）
3. 最小实现分支逻辑并转绿（Green）
4. 补齐并发创建与重复组名边界
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_save_with_agent_fallback.py`

## DoD

- 未命中建组与默认组兜底均可用
- 关键返回字段稳定
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
