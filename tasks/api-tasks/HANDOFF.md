# API HANDOFF

## 最近一次交接

- 当前阶段：API-016 ~ API-018 已完成，复习数据闭环与 LLM 适配层已落地。
- 本次变更：
  - 复习链路新增 `review_sessions/review_session_cards/review_logs` 持久化结构
  - 新增 `GET /review/session/{session_id}/summary`
  - 首页聚合新增 `display_name`、`insight`，统计口径切换为 review_logs
  - 认证链路新增 `nickname` 字段与 `POST /auth/logout`
  - CORS 支持 `APP_CORS_ALLOW_ORIGINS` 环境化配置
  - 新增 LangChain 适配层，三处历史 stub 支持 provider 模式替换
- 关键产出：
  - `backend/app/review/repository.py`
  - `backend/app/review/session_service.py`
  - `backend/app/dashboard/service.py`
  - `backend/app/auth/api.py`
  - `backend/app/llm/runtime.py`
  - `backend/app/main.py`
  - `backend/db/schema.sql`
  - `docs/contracts/v0.6-dashboard.yaml`
- 可追溯证据：
  - `make -C backend check`（91 passed + ruff/mypy 通过）
- 下一步建议：
  1. 进入 API-019，评估同步仓储向 async 仓储迁移方案（架构债）
  2. 若准备上线真实模型，将 `LLM_MODE` 切换为 `provider` 并配置 `LLM_API_KEY`
