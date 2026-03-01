# API HANDOFF

## 最近一次交接

- 当前阶段：API-010 已完成，复习入口 deck 列表与到期统计查询已可用
- 本次变更：新增 `GET /review/decks`，返回 `deck_id/deck_name/due_count` 并按 `due_count` 降序排序
- 关键产出：`backend/app/review/api.py`、`backend/app/review/service.py`、`backend/tests/integration/test_review_decks_api.py`
- 可追溯证据：`pytest -q tests/integration/test_review_decks_api.py`（3 passed）；`make -C backend check`（58 passed + lint/typecheck passed）
- 下一步建议：执行 API-011（Session 拉取、AI 评分与评级提交）
