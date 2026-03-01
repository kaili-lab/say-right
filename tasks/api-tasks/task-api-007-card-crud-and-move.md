# API-007 Card 查询/编辑/删除与跨组移动

## 目标

- 交付卡片最小管理能力：列表、编辑、删除、移动分组。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-005-deck-list-create-and-default-bootstrap.md`
- `docs/初版需求.md`
- `docs/contracts/v0.3-card-management.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-005 已具备 Deck 基础能力。

## skill_required

- `python-pro`

## 前置依赖

- `API-005`

## paired_with

- `UI-010`

## contract_version

- `docs/contracts/v0.3-card-management.yaml`

## sync_point

- `SP-007`

## 范围

- `GET /decks/{deck_id}/cards`
- `PATCH /cards/{card_id}`
- `DELETE /cards/{card_id}`
- `POST /cards/{card_id}/move`
- Card 模型包含 FSRS 调度字段（`due_at`、`stability`、`difficulty`、`reps`、`lapses`）

## 不在范围

- 独立 `POST /cards`（创建由 API-008/API-009 的 Agent 编排链路负责）
- 复习调度重算优化
- 批量导入导出

## 子步骤（执行清单）

1. 读取 context_files，确认 Card 模型与 FSRS 字段前置约束
2. 写失败测试：查询/编辑/删除/move 主路径（Red）
3. 最小实现 API 与仓储（Green）
4. 补齐越权访问与非法目标组边界
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_card_api.py`

## test_data_strategy（前置模块未就绪时）

- upstream_status: `not_ready`
- gap: API-008/API-009 的 Agent 创建链路尚未交付，本任务范围内也不包含独立 `POST /cards`。
- strategy: 在集成测试里通过 `app.state.card_repository.create_card(...)` 造数，聚焦验证查询/编辑/删除/移动契约。
- rollback_plan: API-008/API-009 完成后，替换为“通过保存链路创建卡片 -> 再执行管理操作”的真实链路回归测试。

## DoD

- Card 管理能力可用
- 跨组移动正确且受权限约束
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增 Card 领域模型与内存仓储：支持列表、编辑、删除、跨组移动，并包含 FSRS 字段（`due_at`、`stability`、`difficulty`、`reps`、`lapses`）。
- 已新增接口并完成权限约束：`GET /decks/{deck_id}/cards`、`PATCH /cards/{card_id}`、`DELETE /cards/{card_id}`、`POST /cards/{card_id}/move`。
- 已实现关键业务规则：编辑不重置 FSRS 状态、跨用户操作返回 404、目标组不存在返回 404。
- 已补充测试：`backend/tests/integration/test_card_api.py`（7 用例）与 `backend/tests/unit/test_card_repository.py`（4 用例）。
- 已声明 `test_data_strategy`：在 API-008/API-009 未就绪前通过仓储造数，后续回归真实创建链路。
