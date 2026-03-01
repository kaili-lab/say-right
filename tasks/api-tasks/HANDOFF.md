# API HANDOFF

## 最近一次交接

- 当前阶段：API-015 已完成，运行态已支持切换 PostgreSQL 仓储
- 本次变更：新增 Postgres 仓储实现（users/decks/cards）与存储后端自动装配逻辑
- 关键产出：`backend/app/main.py`、`backend/app/db/runtime.py`、`backend/app/auth/repository.py`、`backend/app/deck/repository.py`、`backend/app/card/repository.py`
- 可追溯证据：`pytest -q tests/unit/test_storage_runtime.py`（7 passed）；`make -C backend check`（80 passed + lint/typecheck passed）
- 下一步建议：进入 API-016，接入 LangChain 统一 LLM 适配层并替换当前生成/评分/分组 stub。
