# API-019 异步数据库仓储迁移评估（架构债跟踪）

## 目标

- 评估从同步 psycopg 仓储迁移到 async 仓储（或 SQLAlchemy async）的改造边界与风险。

## context_files（AI 开始前必读）

- `docs/待实现清单.md`
- `tasks/api-tasks/DECISIONS.md`
- `backend/app/main.py`

## previous_task_output（上个任务关键产出摘要）

- API-018 已完成真实 LLM 适配，运行态仍为同步仓储 + 同步路由。

## skill_required

- `python-pro`

## 前置依赖

- `API-018`

## paired_with

- 无

## contract_version

- 无

## sync_point

- `SP-DB-ASYNC`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: 待评估

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `ready`
- gap: 无
- strategy: 基于基准压测与 PoC 验证
- rollback_plan: 保留同步实现为回退路径

## 范围

- 方案评估与技术设计，不做生产代码改造

## 不在范围

- 全量仓储/路由重写

## 子步骤（执行清单）

1. 输出迁移方案与影响面
2. 给出 PoC 与切换步骤建议

## test_scope

- `N/A`

## test_commands

- `N/A`

## DoD

- 完成迁移评估文档并形成可执行计划

## output_summary（任务完成后由 AI 填写）

- 待执行（本轮未实现）
