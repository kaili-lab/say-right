# HONO-002 Workers + Hono 工程初始化与质量门禁

## 目标

- 初始化 `backend-hono` 工程，并建立最小可运行 Hono Worker 与测试/静态检查门禁。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/hono-migration-tasks/task-hono-001-stack-and-cutover-baseline.md`
- `docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
- `docs/contracts/v0.0-bootstrap.yaml`

## previous_task_output（上个任务关键产出摘要）

- 已完成迁移目录基线与执行约束。

## skill_required

- `-`

## 前置依赖

- `HONO-001`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.0-bootstrap.yaml`

## sync_point

- `SP-HONO-BOOTSTRAP`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `hono`
  version: 最新稳定版
  reason: Worker 框架
  install_command: `cd backend-hono && pnpm add hono`
- package: `wrangler`
  version: 最新稳定版
  reason: Cloudflare 构建与部署
  install_command: `cd backend-hono && pnpm add -D wrangler`
- package: `vitest`
  version: 最新稳定版
  reason: TDD 测试运行器
  install_command: `cd backend-hono && pnpm add -D vitest @cloudflare/vitest-pool-workers`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 初始化 Worker 工程（含 `wrangler.toml`）
2. 提供 `GET /health` 最小接口
3. 建立 `test/lint/typecheck/check` 命令
4. 完成 CORS 骨架配置（显式 `origin`，禁止 `*`；允许 `credentials`）

## 不在范围

- 鉴权
- D1 表结构

## 子步骤（执行清单）

1. 写失败测试（Red）：`/health` 返回 200 与契约体
2. 最小实现（Green）：Hono 路由与入口
3. 写失败测试（Red）：CORS 响应头满足 cookie 会话前提
4. 配置 CORS 骨架、lint/typecheck 与 `pnpm check`
5. 全量执行 test_commands

## test_scope

- unit
- integration

## test_commands

- `cd backend-hono && pnpm test`
- `cd backend-hono && pnpm lint`
- `cd backend-hono && pnpm typecheck`
- `cd backend-hono && pnpm check`
- `cd backend-hono && pnpm test -- cors`

## DoD

- `/health` 测试通过
- `pnpm check` 可一次通过
- 工程可被 `wrangler dev` 正常启动
- CORS 配置满足会话要求：`Access-Control-Allow-Origin` 为显式前端域名且 `Access-Control-Allow-Credentials=true`

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）
