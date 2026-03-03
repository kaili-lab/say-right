# API-021 数据库连接池化

## 目标

- 消除当前每次查询都新建 TCP/TLS/Auth 连接的性能瓶颈，引入 `psycopg_pool.ConnectionPool` 复用连接。

## 问题背景

当前所有 `Postgres*Repository` 的每个方法都调用 `psycopg.connect(self._database_url)`，没有连接池。每次查询都经历完整的 DNS → TCP 三次握手 → TLS 握手 → PostgreSQL 认证 → 执行 → 断开。

实测数据（国内 → 新加坡 Neon）：
- **单次连接建立：~750ms**
- Dashboard 一次请求 5 个串行连接：**~3.7 秒**（还不含 SQL 执行时间）

即使网络延迟较低的环境（同区域部署），无池化仍会带来 100-200ms/连接 的不必要开销。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `tasks/api-tasks/task-api-015-runtime-storage-cutover-postgres.md`
- `tasks/api-tasks/HANDOFF.md`
- `backend/app/db/runtime.py`
- `backend/app/auth/repository.py`
- `backend/app/deck/repository.py`
- `backend/app/card/repository.py`
- `backend/app/review/repository.py`
- `backend/app/dashboard/service.py`
- `backend/app/main.py`

## previous_task_output（上个任务关键产出摘要）

- API-015 已完成 PostgreSQL 仓储实现，但每个方法内部独立调用 `psycopg.connect()`，无连接复用。

## skill_required

- `python-pro`

## 前置依赖

- `API-015`

## paired_with

- 无

## contract_version

- 无（内部优化，不影响 API 契约）

## sync_point

- `SP-CONNECTION-POOL`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: `psycopg-pool` — psycopg 官方连接池库

## 范围

### 必须做

1. **引入 `psycopg_pool.ConnectionPool`**
   - 在 `create_app()` 启动时创建全局连接池（`min_size=2, max_size=10`，可通过环境变量覆盖）
   - 应用关闭时正确释放连接池
2. **改造所有 Postgres Repository**
   - 构造函数接收连接池实例而非 URL 字符串
   - 每个方法从池中获取连接（`pool.getconn()` / `with pool.connection()`），用完归还
   - `auth/repository.py`、`deck/repository.py`、`card/repository.py`、`review/repository.py`
3. **改造 `build_repositories_from_env()`**
   - 先创建连接池，再把池实例注入各 repository
4. **测试保持稳定**
   - 内存仓储路径不受影响
   - Postgres 仓储的集成测试（如有）适配新签名

### 顺便修复的性能问题

5. **`create_session` 批量插入**
   - 将 N 条 `INSERT INTO review_session_cards` 合并为一条多行 `VALUES` 或 `executemany`

## 不在范围

- `ensure_default_deck` 语义调整（单独拆到后续任务，避免行为变化）
- 异步化（async psycopg）— 留给后续独立任务
- SQLAlchemy ORM 迁移
- review_logs 聚合 SQL 优化（归入 Dashboard 优化任务）
- LLM 接入

## 子步骤（执行清单）

1. 安装 `psycopg-pool`，加入 `pyproject.toml` 依赖
2. 在 `app/db/runtime.py` 或新模块中封装连接池创建/关闭逻辑
3. 改造 4 个 Postgres Repository 构造函数：接收 pool 而非 URL
4. 改造所有方法：`psycopg.connect(url)` → `pool.connection()`
5. 改造 `create_app()` 中的 `build_repositories_from_env()`：创建池并注入
6. 添加 `lifespan` 或 shutdown hook 释放连接池
7. `create_session` 改为批量插入
8. 新增 PostgreSQL 路径测试（连接池装配、仓储注入）
9. 跑全量测试确认无回归

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_storage_runtime.py tests/unit/test_connection_pool_runtime.py`
- `make -C backend check`

## DoD

- 所有 Postgres Repository 共享同一个连接池，不再逐次 `psycopg.connect()`
- 应用启动日志中打印连接池配置信息（不输出敏感 DSN）
- 应用关闭时连接池正确释放
- `create_session` 使用批量插入
- 全量测试无回归

## output_summary（任务完成后由 AI 填写）

- 已新增连接池模块：`backend/app/db/pool.py`，使用 `psycopg_pool.ConnectionPool` 创建并输出脱敏池配置日志（仅 `min/max`）。
- `backend/app/db/runtime.py` 新增 `resolve_db_pool_size()`，支持 `APP_DB_POOL_MIN_SIZE` / `APP_DB_POOL_MAX_SIZE`（默认 `2/10`，含非法值校验）。
- `build_repositories_from_env()` 已改为先创建池再注入仓储，并把 `ConnectionPool | None` 作为返回值，供应用生命周期管理。
- `create_app()` 已改为 `lifespan` 关闭连接池，避免进程退出时连接泄漏；`app.state.db_connection_pool` 暴露当前池实例。
- 4 个 Postgres 仓储已完成改造（auth/deck/card/review）：`psycopg.connect()` 全量替换为 `with pool.connection()`。
- `PostgresReviewSessionRepository.create_session()` 已改为 `executemany` 批量写入 `review_session_cards`。
- `ensure_default_deck` 语义未改（方案A）：`list_decks` 保持原行为，规避历史数据行为变化风险。
- 新增测试：`backend/tests/unit/test_connection_pool_runtime.py`（池注入一致性、应用关闭释放池、session 批量插入）。
- 扩展测试：`backend/tests/unit/test_storage_runtime.py`（连接池尺寸配置解析与错误分支）。
