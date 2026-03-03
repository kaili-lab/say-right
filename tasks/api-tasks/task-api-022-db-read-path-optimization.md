# API-022 数据库读路径优化（连接层）

## 目标

删除连接池冗余 health check、统一瞬时连接重试到所有 Postgres 仓储、读操作改 autocommit、添加请求计时中间件，从连接层面降低每次数据库调用的 RTT 开销。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/性能优化实施计划-2026-03-03.md`（Phase 0: P0-1, P0-1.1, P0-2, P0-6）
- `docs/性能分析综合报告-2026-03-03.md`（根因 B、C）
- `tasks/api-tasks/HANDOFF.md`
- `tasks/api-tasks/task-api-021-connection-pooling.md`（output_summary）
- `backend/app/db/pool.py`
- `backend/app/auth/repository.py`（已有 `_run_with_retry`）
- `backend/app/deck/repository.py`（已有 `_run_with_retry`）
- `backend/app/card/repository.py`（无 retry，裸调 `pool.connection()`）
- `backend/app/review/repository.py`（无 retry，裸调 `pool.connection()`）
- `backend/app/main.py`

## previous_task_output（上个任务关键产出摘要）

- API-021 引入 `psycopg_pool.ConnectionPool`，4 类 Postgres 仓储统一改为 `pool.connection()` 取连接。
- 但 `pool.py` 配置了 `check=ConnectionPool.check_connection`，每次出池多一次 `SELECT 1` 往返。
- `auth` 和 `deck` 有 `_run_with_retry` 处理瞬时连接错误；`card`（8 个方法）和 `review`（7 个方法）无 retry，删掉 health check 后会偶发 503。
- 所有读操作使用默认事务模式，事务收尾带来额外 COMMIT 往返。

## skill_required

- `python-pro`（强制）

## 前置依赖

- `API-021`

## paired_with

- 无

## contract_version

- 无（内部优化，不影响 API 契约）

## sync_point

- `SP-PERF-PHASE0`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy

- upstream_status: ready
- 不需要额外造数，现有测试数据足够覆盖。

## 范围

1. **删除连接池 health check**（P0-1）
   - `pool.py`：删除 `check=ConnectionPool.check_connection` 参数及对应注释
2. **提取公共 retry 辅助并扩展到 card/review 仓储**（P0-1.1）
   - 新增 `backend/app/db/helpers.py`，将 `_run_with_retry` 逻辑提取为可复用函数
   - `card/repository.py`：PostgresCardRepository 所有方法接入 retry
   - `review/repository.py`：PostgresReviewSessionRepository 和 PostgresReviewLogRepository 所有方法接入 retry
   - `auth/repository.py` 和 `deck/repository.py`：改为调用公共辅助（消除重复代码）
3. **读操作使用 autocommit**（P0-2）
   - 4 个 Postgres 仓储的只读方法：取连接后设置 `conn.autocommit = True`
   - 写方法（INSERT/UPDATE/DELETE）保持原事务语义不变
   - **必须在 finally 中恢复 autocommit 为 False** — 经本地验证，`psycopg_pool` 归还连接后不会自动恢复 autocommit 状态，下次取出仍为 True，会污染写事务语义
   - 推荐写法：
     ```python
     with self._pool.connection() as conn:
         conn.autocommit = True
         try:
             with conn.cursor(row_factory=dict_row) as cur:
                 cur.execute(sql, params)
                 return cur.fetchone()
         finally:
             conn.autocommit = False
     ```
4. **添加请求计时中间件**（P0-6）
   - `main.py`：添加 HTTP 中间件，记录每个请求的耗时（毫秒级）

## 不在范围

- `ensure_default_deck` 语义调整（API-023）
- 鉴权缓存（API-023）
- 首页聚合 SQL 改造（API-024）
- async 仓储迁移
- 任何 API 契约变更

## 子步骤（执行清单）

1. 读取 context_files，确认 API-021 产出与当前工程状态
2. 写失败测试（Red）：
   - retry 辅助：模拟 `OperationalError("connection has been closed unexpectedly")`，验证一次重试后成功
   - retry 辅助：非可重试错误直接抛出
   - autocommit：验证读方法设置 autocommit 且 finally 中恢复为 False（可通过 mock connection 检查）
   - 计时中间件：验证响应头或日志输出包含耗时信息
3. 最小实现（Green）：
   - 删除 `pool.py` 中的 `check` 参数
   - 新增 `db/helpers.py` 提取 retry 逻辑
   - 改造 4 个 repository 的读方法加 autocommit
   - 添加计时中间件
4. 补齐边界用例：retry 达到最大次数仍失败、写方法不受 autocommit 影响、读方法异常时 autocommit 仍恢复为 False
5. 运行全量测试确认无回归
6. 保留 test_commands 的可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/ tests/integration/`
- `make -C backend check`

## DoD

- `pool.py` 不再包含 `check=ConnectionPool.check_connection`
- `card/repository.py` 和 `review/repository.py` 所有 Postgres 方法接入 retry
- 4 个 Postgres 仓储的只读方法使用 autocommit，且 finally 中恢复为 False
- retry 逻辑提取为公共辅助，消除 auth/deck 中的重复代码
- `main.py` 包含请求计时中间件
- 全量测试无回归（`make check` 通过）

## output_summary（任务完成后由 AI 填写）

（待填写）
