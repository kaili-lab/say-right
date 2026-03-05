# HONO-008 OpenAI 兼容 LLM 适配层与 Stub 替换

## 目标

- 在 Hono 后端接入 OpenAI 兼容客户端，替换记录生成/评分等链路中的 stub。

## context_files（AI 开始前必读）

- `tasks/hono-migration-tasks/SESSION-MEMORY.md`
- `tasks/hono-migration-tasks/task-hono-006-deck-card-record-api-parity.md`
- `tasks/hono-migration-tasks/task-hono-007-review-dashboard-api-parity.md`
- `docs/contracts/v0.3.5-record-generate.yaml`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- 业务 API 已平移到 Hono，可在 stub 下跑通。

## skill_required

- `-`

## 前置依赖

- `HONO-006`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-HONO-LLM`

## execution_context（执行环境约定）

- workdir: `backend-hono`
- runtime: node
- env_activate: N/A
- install_commands:
  - `cd backend-hono && pnpm install`

## dependency_changes（新增依赖清单）

- package: `openai`
  version: 最新稳定版
  reason: OpenAI 兼容客户端
  install_command: `cd backend-hono && pnpm add openai`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 线上模型不可用于测试
- strategy: 全部测试使用可复现 fixture/stub，不直连真实模型
- rollback_plan: 运行态 provider 开关切到真实端点，测试继续固定 fixture

## 范围

1. 封装 OpenAI 兼容客户端 adapter
2. 记录生成与评分链路接入 adapter
3. 保留 deterministic fallback 保障可用性

## 不在范围

- prompt 工程重构
- 多 provider 编排

## 子步骤（执行清单）

1. 写失败测试（Red）：成功/超时/供应商不可用
2. 最小实现（Green）：adapter + service 接线
3. 补齐 fallback 与错误映射
4. 执行 test_commands

## test_scope

- unit
- integration

## test_commands

- `cd backend-hono && pnpm test -- llm record review`
- `cd backend-hono && pnpm check`

## DoD

- 运行态可配置 OpenAI 兼容端点
- 测试不依赖真实模型
- test_commands 全通过

- 已在 `tasks/hono-migration-tasks/SESSION-MEMORY.md` 追加本任务经验记录
- 已完成本任务 review，并执行 `commit + push` 后再进入下一个任务

## output_summary（任务完成后由 AI 填写）

- 关键产出文件：
  - `backend-hono/src/llm/runtime.ts`
  - `backend-hono/src/llm/text.ts`
  - `backend-hono/src/llm/adapter.ts`
  - `backend-hono/src/app.ts`
  - `backend-hono/tests/llm-adapter.test.ts`
  - `backend-hono/tests/llm-record-review-integration.test.ts`
- 新增能力：
  - 封装 `LLM_MODE` 运行态配置解析（`deterministic` / `provider`），支持 `OPENAI_*` 与迁移兼容字段 `LLM_*`。
  - 封装 OpenAI 兼容 adapter（`openai` SDK），统一 `generateEnglish` 与 `scoreReview` 两条业务协议。
  - 保留 deterministic adapter 作为可复现 fallback，并保留 `__FAIL_STUB__` / `__AI_UNAVAILABLE__` 故障注入。
  - `records/generate` 与 `review ai-score` 已接入统一 adapter，并完成 `LLMUnavailableError -> 503` 错误映射。
- 测试覆盖：
  - 新增单测 `tests/llm-adapter.test.ts`：成功、超时、供应商不可用、配置解析与 JSON 解析。
  - 新增集成测试 `tests/llm-record-review-integration.test.ts`：验证路由接线与 503 映射。
  - 原有 `record/review` 集成测试保持通过，确保对外契约未回归。
