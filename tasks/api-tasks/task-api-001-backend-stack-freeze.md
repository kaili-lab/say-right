# API-001 后端技术栈冻结与工程约定

## 目标

- 冻结后端关键技术选型与工程约定，统一后续 API 任务执行口径。

## context_files（AI 开始前必读）

- `docs/初版需求.md`
- `tasks/任务拆分说明-final.md`
- `tasks/api-tasks/DECISIONS.md`

## previous_task_output（上个任务关键产出摘要）

- 初始任务，无前置产出。

## skill_required

- `python-pro`
- `supabase-postgres-best-practices`

## 前置依赖

- 无

## paired_with

- 无

## contract_version

- 无

## sync_point

- `SP-STACK`

## 范围

- 冻结数据库、ORM、迁移工具、测试数据库策略
- 冻结后端测试命令口径
- 更新 `tasks/api-tasks/DECISIONS.md`

## 不在范围

- 业务接口实现
- 认证流程实现

## 子步骤（执行清单）

1. 读取 context_files，确认当前工程状态与待决策项
2. 汇总待决策项及影响范围
3. 给出候选方案并完成决策（Red: 未决策即阻塞）
4. 更新 `DECISIONS.md` 并记录理由（Green）
5. 回填 API 任务的 `skill_required/test_commands`
6. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`

## test_commands

- `rg -n "数据库|ORM|迁移|JWT|包管理" tasks/api-tasks/DECISIONS.md`
- `rg -n "已决策" tasks/api-tasks/DECISIONS.md`

## DoD

- 后端关键技术选型已冻结并可执行
- 后续 API task 的命令口径可统一
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已冻结后端技术栈：PostgreSQL(Neon) + SQLAlchemy 2.0 async + Alembic。
- 已冻结认证与质量工具：FastAPI Security + pwdlib[argon2] + PyJWT；pytest + ruff + mypy。
- 已回填全部 API tasks 的 `skill_required` 与 `test_commands` 占位符。
