# API-010 复习 Deck 列表与到期统计查询

## 目标

- 提供复习入口所需数据：Deck 列表与各组到期数量。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-007-card-crud-and-move.md`
- `docs/初版需求.md`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-007 已具备卡片及分组关系数据基础。

## skill_required

- `python-pro`

## 前置依赖

- `API-007`

## paired_with

- `UI-004`
- `UI-007`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-005`

## 范围

- `GET /review/decks`
- 每组 due_count 统计
- 结果排序（按待复习数量降序）

## 不在范围

- Session 内评级提交
- FSRS 状态更新

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：Deck 到期列表与排序（Red）
3. 最小实现查询与聚合（Green）
4. 补齐空列表与跨用户隔离边界
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/integration/test_review_decks_api.py`

## DoD

- 复习入口查询接口可用
- 排序与隔离规则正确
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
