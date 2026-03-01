# API-011 Session 拉取、AI 评分与评级提交（FSRS）

## 目标

- 实现复习 Session 卡片拉取、AI 评分建议与评级提交，更新 FSRS 调度字段。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-010-review-deck-list-and-due-query.md`
- `docs/初版需求.md`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-010 已提供 Deck 级复习入口数据。

## skill_required

- `python-pro`

## 前置依赖

- `API-010`

## paired_with

- `UI-008`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-006`

## 范围

- `GET /review/decks/{deck_id}/session`
- `POST /review/session/{session_id}/ai-score`
- `POST /review/session/{session_id}/rate`
- 评级来源（AI/手动）并行写入
- FSRS 字段更新

## 不在范围

- 发音评分
- 语音输入
- 真实模型供应商接入（按 stub/fixture）

## 子步骤（执行清单）

1. 读取 context_files，确认 Session、AI 评分与评级提交契约
2. 写失败测试：session 拉取 + ai-score + rate 提交（Red）
3. 最小实现 session、评分建议与评级写入（Green）
4. 引入 FSRS 更新并补边界用例
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_fsrs_scheduler.py`
- `pytest -q tests/integration/test_review_session_api.py`

## DoD

- Session、AI 评分建议、评级提交流程完整
- FSRS 更新可复现且可测试
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增复习 session 主链路接口：`GET /review/decks/{deck_id}/session`、`POST /review/session/{session_id}/ai-score`、`POST /review/session/{session_id}/rate`。
- 已实现可复现 AI 评分 stub：返回 `score/feedback/suggested_rating`，并支持 `__AI_UNAVAILABLE__` 触发 503。
- 已实现最小 FSRS 调度器与评级提交更新：`again/hard/good/easy` 可更新 `due_at/stability/difficulty/reps/lapses`。
- 已补充测试：`backend/tests/unit/test_fsrs_scheduler.py`、`backend/tests/integration/test_review_session_api.py`。
- 已完成回归：`make -C backend check` 通过（含 test/lint/typecheck）。
