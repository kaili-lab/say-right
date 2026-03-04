# API-020 密码找回（v2 Backlog）

## 目标

- 记录 v2 密码找回任务的边界与前置条件。

## context_files（AI 开始前必读）

- `docs/初版需求.md`
- `docs/待实现清单.md`

## previous_task_output（上个任务关键产出摘要）

- 无

## skill_required

- `python-pro`

## 前置依赖

- 无

## paired_with

- `UI-020`（待创建）

## contract_version

- 待定义

## sync_point

- `SP-AUTH-RESET`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: 待评估（邮件服务）

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `not_ready`
- gap: 邮件通道与安全策略未冻结
- strategy: 任务后置
- rollback_plan: 无

## 范围

- backlog 记录

## 不在范围

- 本轮实现

## 子步骤（执行清单）

1. 明确安全与邮件依赖
2. 冻结契约后再拆分实现 task

## test_scope

- `N/A`

## test_commands

- `N/A`

## DoD

- backlog 信息完整可追踪

## output_summary（任务完成后由 AI 填写）

- 待执行（本轮不实现）
