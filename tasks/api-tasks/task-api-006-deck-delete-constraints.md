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

## test_data_strategy（前置模块未就绪时）

- upstream_status: `not_ready`
- gap: API-007（Card 模块）尚未交付，当前无法通过真实卡片接口制造“组内有卡片”状态。
- strategy: 在集成测试中通过 `app.state.deck_repository.update_counts(...)` 注入计数，验证删除约束与错误码映射。
- rollback_plan: API-007 完成后，替换为“创建卡片 -> 删除 deck”真实链路测试，并移除直接注入计数步骤。

## DoD

- 删除规则符合需求
- 错误码与提示可预测
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增删除能力：`DELETE /decks/{deck_id}`，并在路由层映射业务约束错误码。
- 已实现删除规则：默认组不可删（409）、有卡组不可删（409）、空组可删（204）。
- 已补充并发重复删除场景：第一次删除成功后，第二次删除返回 404（资源不存在）。
- 已补充测试：`backend/tests/integration/test_deck_delete_rules.py` 与 `backend/tests/unit/test_deck_repository.py`。
- 已声明 `test_data_strategy`：在 API-007 未就绪前，使用 `update_counts(...)` 进行可复现造数；API-007 完成后回归真实链路测试。
- 为后续卡片模块联动预留计数更新能力：`InMemoryDeckRepository.update_counts(...)`（用于临时造数与后续模块衔接）。
