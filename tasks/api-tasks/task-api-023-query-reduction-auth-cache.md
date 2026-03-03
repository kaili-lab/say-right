# API-023 查询次数精简与鉴权缓存

## 目标

去除稳态冗余查询（ensure_default_deck、重复查 user）、为鉴权结果加短 TTL 缓存，减少每个请求的数据库查询次数。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/性能优化实施计划-2026-03-03.md`（Phase 0: P0-3, P0-4, P0-5）
- `docs/性能分析综合报告-2026-03-03.md`（根因 D、F + 补充 9.2）
- `tasks/api-tasks/HANDOFF.md`
- `tasks/api-tasks/task-api-022-db-read-path-optimization.md`（output_summary）
- `backend/app/deck/service.py`
- `backend/app/dashboard/api.py`
- `backend/app/dashboard/service.py`
- `backend/app/auth/service.py`
- `backend/app/main.py`（`on_user_registered` 回调）

## previous_task_output（上个任务关键产出摘要）

- API-022 已完成连接层优化：删除 health check、retry 全覆盖、读 autocommit、计时中间件。
- 但每个请求的数据库查询次数仍然偏多：
  - `list_decks` 每次调用 `ensure_default_deck`（稳态冗余）
  - 首页 `get_home_summary` 再次查 user（与鉴权重复）
  - 每次 auth 鉴权都查 `users` 表（无缓存）

## skill_required

- `python-pro`（强制）

## 前置依赖

- `API-022`

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

- package: `cachetools`
  version: 最新稳定版
  reason: 为鉴权结果提供 TTL 内存缓存，减少每次请求对 users 表的数据库查询
  install_command: `../.venv/bin/pip install cachetools`

## test_data_strategy

- upstream_status: ready

## 范围

1. **`list_decks` 去除稳态冗余 ensure**（P0-3）
   - `deck/service.py`：改为"先 list；为空再 ensure + 重查"
   - 用户注册时已通过 `on_user_registered` 回调创建默认组，稳态下不会走到 ensure 分支
   - `create_deck` 中的 `ensure_default_deck` 保持不变（不在页面加载热路径上，改动增加回归风险但无性能收益）
2. **首页去掉重复查 user**（P0-4）
   - `dashboard/api.py`：将鉴权得到的 `current_user` 传入 service
   - `dashboard/service.py`：`get_home_summary` 接收 `User` 对象而非 `user_id`，移除对 `user_repository` 的依赖
3. **鉴权结果短 TTL 缓存**（P0-5）
   - `auth/service.py`：对 `get_current_user` 中的 `user_repository.get_by_id()` 结果加 TTL 60s 内存缓存
   - 使用 `cachetools.TTLCache`，加 `threading.Lock` 保证线程安全
   - 仅缓存查到用户的正向结果；用户不存在时不缓存
   - 登录/注册路径不经过此缓存

## 不在范围

- 连接层优化（已在 API-022 完成）
- `create_deck` 中的 `ensure_default_deck` 语义（不在加载热路径，保持原样）
- 首页聚合 SQL 改造（API-024）
- API 契约变更
- 用户密码变更后主动清除缓存（TTL 60s 足够短，token 有独立过期机制）

## 子步骤（执行清单）

1. 读取 context_files，确认 API-022 产出与当前工程状态
2. 写失败测试（Red）：
   - `list_decks`：有 deck 时不触发 ensure；无 deck 时触发 ensure 后返回默认组
   - 首页：`DashboardService.get_home_summary` 接收 `User` 对象，不再调用 `user_repository`
   - 鉴权缓存：首次查库返回用户、TTL 内二次调用命中缓存（不再查库）、用户不存在时不缓存
3. 最小实现（Green）
4. 补齐边界用例：缓存过期后重新查库、并发访问下缓存行为正确
5. 运行全量测试确认无回归
6. 保留 test_commands 的可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/ tests/integration/`
- `make -C backend check`

## DoD

- `list_decks` 稳态下不调用 `ensure_default_deck`（有 deck 直接返回）
- `DashboardService` 不再依赖 `user_repository`，从路由层接收 `current_user`
- `get_current_user` 对 user 查询结果有 TTL 60s 缓存，线程安全
- `/dashboard/home-summary`、`/review/decks`、`/decks` 响应结构与现有契约一致
- `cachetools` 已加入 `pyproject.toml` 依赖
- 全量测试无回归（`make -C backend check` 通过）

## output_summary（任务完成后由 AI 填写）

（待填写）
