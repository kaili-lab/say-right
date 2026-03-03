# API HANDOFF

## 最近一次交接

- 当前阶段：API-021 已完成，PostgreSQL 运行态已切换为连接池复用。
- 本次变更：
  - 新增 `psycopg_pool.ConnectionPool` 装配：启动创建池、应用关闭释放池
  - `auth/deck/card/review` 四类 Postgres 仓储统一改为 `pool.connection()` 取连接
  - `build_repositories_from_env()` 改为共享单池注入，`app.state.db_connection_pool` 暴露池实例
  - `PostgresReviewSessionRepository.create_session()` 改为 `executemany` 批量插入
  - 新增池配置环境变量：`APP_DB_POOL_MIN_SIZE` / `APP_DB_POOL_MAX_SIZE`
- 关键产出：
  - `backend/app/db/pool.py`
  - `backend/app/db/runtime.py`
  - `backend/app/main.py`
  - `backend/app/auth/repository.py`
  - `backend/app/deck/repository.py`
  - `backend/app/card/repository.py`
  - `backend/app/review/repository.py`
  - `backend/tests/unit/test_connection_pool_runtime.py`
- 可追溯证据：
  - `pytest -q tests/unit/test_storage_runtime.py tests/unit/test_connection_pool_runtime.py`（14 passed）
  - `make -C backend check`（96 passed + ruff/mypy 通过）
- 下一步建议：
  1. 进入 API-019，评估同步仓储向 async 仓储迁移方案（架构债）
  2. 新开任务处理 `ensure_default_deck` 的行为优化（含历史数据回填方案）
