# HONO-001 Hono 迁移基线冻结与工程目录落位

## 目标

- 建立 Hono 迁移的执行基线：工程目录、命名约定、环境变量清单、切换边界（直接在 main 执行）。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/hono-migration-tasks/INDEX.md`
- `tasks/hono-migration-tasks/DECISIONS.md`

## previous_task_output（上个任务关键产出摘要）

- 新建 `tasks/hono-migration-tasks/` 目录并完成初始任务拆分。

## skill_required

- `-`

## 前置依赖

- `-`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.0-bootstrap.yaml`

## sync_point

- `SP-HONO-STACK`

## execution_context（执行环境约定）

- workdir: 仓库根目录
- runtime: mixed
- env_activate: N/A
- install_commands:
  - `corepack enable`

## dependency_changes（新增依赖清单）

- 无（仅做基线落位）

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 明确并创建迁移目录（`backend-hono/` 预留）
2. 输出迁移期环境变量草案（D1、Better Auth、OpenAI 兼容端点）
3. 明确“直接在 main 执行”的流程约束写入文档

## 不在范围

- 实现业务 API
- 改造前端鉴权代码

## 子步骤（执行清单）

1. 读取 context_files，确认迁移边界
2. 写失败检查（Red）：目录/配置文件不存在
3. 最小落位（Green）：创建目录与基础配置说明
4. 校验目录与说明一致性
5. 保留 test_commands 证据

## test_scope

- integration

## test_commands

- `test -d backend-hono`
- `test -f docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
- `rg -n "直接在 .*main.* 执行迁移" docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`

## DoD

- `backend-hono/` 目录存在
- 迁移基线文档包含 main 分支执行策略
- test_commands 可通过并留存证据

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 完成时间：2026-03-05 21:54 +0800
- 关键变更：
  - 创建 `backend-hono/` 基线目录。
  - 新增 `backend-hono/.env.example`（Hono + Cloudflare + Better Auth + OpenAI 兼容口径）。
  - 本地生成 `backend-hono/.env` 与 `backend-hono/.dev.vars`，值同步自现有 `backend/.env`（密钥文件不入库）。
  - 在迁移方案文档新增“迁移期环境变量草案”章节。
- 测试证据：
  - `test -d backend-hono` -> 退出码 `0`
  - `test -f docs/Hono-Cloudflare迁移整改方案-2026-03-05.md` -> 退出码 `0`
  - `rg -n "直接在 .*main.* 执行迁移" docs/Hono-Cloudflare迁移整改方案-2026-03-05.md` -> 命中 `已确认采用“直接在 main 执行迁移”的策略。`
- 结论：
  - DoD 已满足，可进入 `HONO-002`。
