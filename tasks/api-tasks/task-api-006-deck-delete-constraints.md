# API-006 Deck 删除约束与校验规则

## 目标

- 实现 Deck 删除规则：默认组不可删，非默认组有卡片时不可删。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-005-deck-list-create-and-default-bootstrap.md`
- `docs/初版需求.md`
- `docs/contracts/v0.2-deck-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-005 已具备 Deck 基础能力与默认组存在性。

## skill_required

- `python-pro`

## 前置依赖

- `API-005`

## paired_with

- `UI-010`

## contract_version

- `docs/contracts/v0.2-deck-basic.yaml`

## sync_point

- `SP-007`

## 范围

- Deck 删除接口或删除逻辑
- 规则校验与错误码

## 不在范围

- 卡片编辑/移动

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：默认组删除失败、有卡组删除失败（Red）
3. 最小实现删除校验（Green）
4. 补齐空组可删边界与并发冲突处理
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_deck_delete_rules.py`

## DoD

- 删除规则符合需求
- 错误码与提示可预测
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
