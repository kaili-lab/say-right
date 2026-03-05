# HONO-006 Deck/Card/Record API 平移（Hono）

## 目标

- 将 Deck/Card/Record 相关 API 从 FastAPI 平移到 Hono，保证契约兼容。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `backend/app/deck/`
- `backend/app/card/`
- `backend/app/record/`
- `docs/contracts/v0.2-deck-basic.yaml`
- `docs/contracts/v0.3-card-management.yaml`
- `docs/contracts/v0.3.5-record-generate.yaml`
- `docs/contracts/v0.7-record-save-manual.yaml`

## previous_task_output（上个任务关键产出摘要）

- 前后端会话鉴权已迁移至 Better Auth。

## skill_required

- `drizzle-orm`

## 前置依赖

- `HONO-003`
- `HONO-005`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.2-deck-basic.yaml` + `docs/contracts/v0.3-card-management.yaml` + `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.7-record-save-manual.yaml`

## sync_point

- `SP-HONO-CRUD-RECORD`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `@hono/zod-validator`
  version: 最新稳定版
  reason: 请求参数校验
  install_command: `cd backend-hono && pnpm add @hono/zod-validator zod`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. `decks/cards/records` 路由与错误映射平移
2. 参数校验、鉴权、仓储调用链对齐
3. 保持响应结构与状态码兼容
4. `records/generate` 在本任务使用 deterministic stub 跑通（不依赖真实 LLM）

## 不在范围

- review/dashboard
- 数据迁移脚本

## 子步骤（执行清单）

1. 写失败测试（Red）：成功路径 + 404/422/401
2. 最小实现（Green）：路由/服务/仓储接线
3. 补齐边界（长度限制、归属校验）
4. 全量执行 test_commands

## test_scope

- integration
- e2e

## test_commands

- `cd backend-hono && pnpm test -- deck card record`
- `cd backend-hono && pnpm check`

## DoD

- 契约字段与状态码对齐
- 关键异常映射覆盖
- `records/generate` 在 stub 模式下通过，不依赖真实 LLM
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）
