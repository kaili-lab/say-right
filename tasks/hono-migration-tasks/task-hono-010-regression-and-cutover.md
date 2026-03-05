# HONO-010 全量回归、切换 Runbook 与上线收口

## 目标

- 完成迁移最终收口：契约回归、前后端联调、上线切换与回滚预案。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`
- `tasks/hono-migration-tasks/HANDOFF.md`
- `tasks/REVIEW-CHECKLIST.md`
- 所有已完成 `task-hono-*` 文件

## previous_task_output（上个任务关键产出摘要）

- Hono API、前端鉴权改造、LLM 适配、数据迁移均已完成。

## skill_required

- `-`

## 前置依赖

- `HONO-008`
- `HONO-009`

## paired_with

- `-`

## contract_version

- 全量契约回归（`docs/contracts/`）

## sync_point

- `SP-HONO-CUTOVER`

## execution_context（执行环境约定）

- workdir: 仓库根目录
- runtime: mixed
- env_activate: 按子项目分别执行
- install_commands:
  - `cd backend-hono && pnpm install`
  - `cd frontend && pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 执行后端全量回归
2. 执行前端全量回归
3. 输出上线 Runbook（切换步骤、监控项、回滚步骤）

## 不在范围

- 新功能开发
- 视觉重构

## 子步骤（执行清单）

1. 按契约执行回归测试（Red 用于暴露剩余缺口）
2. 逐项补齐到 Green
3. 执行全量 check 并固化证据
4. 产出切换/回滚 Runbook

## test_scope

- unit
- integration
- e2e

## test_commands

- `cd backend-hono && pnpm check`
- `cd frontend && pnpm test`
- `cd frontend && pnpm lint && pnpm typecheck`

## DoD

- 前后端全量门禁通过
- 契约回归无阻断问题
- Runbook 可执行且包含回滚步骤

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 回归执行结果：
  - `cd backend-hono && pnpm check`：通过
  - `cd frontend && pnpm test`：通过（`14 files, 45 tests`）
  - `cd frontend && pnpm lint && pnpm typecheck`：通过
  - `make -C backend check`：通过（`122 passed`）
- 新增交付：
  - 上线切换与回滚手册：`docs/HONO-010-Hono切换Runbook.md`
  - 覆盖切换前检查、上线步骤、监控验收、回滚触发条件与回滚流程
- 结论：
  - 前后端全量门禁通过
  - 迁移链路（含 HONO-009 数据校验流程）可作为上线前置检查执行
