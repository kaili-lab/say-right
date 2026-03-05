# HONO-007 Review/Dashboard API 平移（Hono）

## 目标

- 平移复习链路与首页统计接口到 Hono，保持 FSRS 与统计口径一致。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `backend/app/review/`
- `backend/app/dashboard/`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`
- `docs/contracts/v0.6-dashboard.yaml`

## previous_task_output（上个任务关键产出摘要）

- Deck/Card/Record API 已在 Hono 跑通。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-006`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml` + `docs/contracts/v0.6-dashboard.yaml`

## sync_point

- `SP-HONO-REVIEW-DASHBOARD`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `-`
  version: `-`
  reason: 复用既有依赖
  install_command: `-`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. review deck list / session / rate / summary 接口平移
2. dashboard home-summary 平移
3. 保留每日限额与复习摘要口径（与现有行为等价）
4. 基于 `review_session_cards` 迁移 session 存储策略（不降级）
5. 查询性能与统计口径回归

## 不在范围

- LLM provider 切换
- 数据迁移

## 子步骤（执行清单）

1. 写失败测试（Red）：复习主链路 + 统计接口
2. 最小实现（Green）
3. 补齐边界（每日上限、权限、空状态）
4. 执行 test_commands

## test_scope

- integration
- e2e

## test_commands

- `cd backend-hono && pnpm test -- review dashboard`
- `cd backend-hono && pnpm check`

## DoD

- review/dashboard 契约回归通过
- 关键统计口径一致
- 每日限额与复习摘要行为与现有版本等价
- `review_session_cards` 存储策略已照移并通过测试
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）
