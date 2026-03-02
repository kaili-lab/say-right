# API-018 LangChain LLM 适配层与三处 Stub 替换

## 目标

- 将英文生成、AI 评分、分组 Agent 三条链路接入统一 LLM 适配层，保留测试可复现 fallback。

## context_files（AI 开始前必读）

- `docs/FastAPI项目固定流程.md`
- `docs/待实现清单.md`
- `tasks/api-tasks/task-api-007a-record-generate-english.md`
- `tasks/api-tasks/task-api-008-save-with-agent-hit-existing-deck.md`
- `tasks/api-tasks/task-api-011-review-session-and-rate-fsrs.md`
- `tasks/api-tasks/task-api-017-dashboard-insight-auth-nickname-logout-cors-contract.md`
- `backend/app/record/stub.py`
- `backend/app/review/ai_scorer_stub.py`

## previous_task_output（上个任务关键产出摘要）

- API-017 已完善用户与 dashboard 能力，API 主链路稳定；LLM 能力仍为 deterministic stub。

## skill_required

- `python-pro`

## 前置依赖

- `API-017`

## paired_with

- 无

## contract_version

- `docs/contracts/v0.3.5-record-generate.yaml`
- `docs/contracts/v0.4-record-save-agent.yaml`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-LLM-REAL`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: `python`
- env_activate: `source ../.venv/bin/activate`
- install_commands:
  - `../.venv/bin/pip install -e ".[dev]"`

## dependency_changes（新增依赖清单）

- package: `langchain-openai`
  version: `最新稳定版`
  reason: 统一接入 OpenAI-compatible 聊天模型能力
  install_command: `../.venv/bin/pip install -e ".[dev]"`

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: `not_ready`
- gap: CI/本地默认无真实 LLM Key
- strategy: 默认 deterministic fallback；通过 stub client 单测覆盖适配层行为
- rollback_plan: 环境具备 LLM key 后切换 `LLM_MODE=provider` 走真实调用，不改业务接口

## 范围

- 新增统一 LLM 配置与 provider client
- 替换 `POST /records/generate` 的英文生成 stub
- 替换 `POST /review/session/{session_id}/ai-score` 的评分 stub
- 替换 `POST /records/save-with-agent` 内部分组决策 stub
- 保留 deterministic fallback，避免测试依赖外网模型

## 不在范围

- 前端 UI 改造
- 多供应商自动路由与重试编排

## 子步骤（执行清单）

1. 写失败测试：LLM 模式切换、三条链路调用真实适配层接口（Red）
2. 实现 LangChain 适配层与服务注入（Green）
3. 保留 deterministic fallback 并补齐注释/文档
4. 执行后端全量质量门禁

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_record_generate_service.py tests/unit/test_llm_provider.py tests/integration/test_record_generate_api.py tests/integration/test_review_session_api.py tests/integration/test_save_with_agent_hit.py tests/integration/test_save_with_agent_fallback.py`
- `make -C backend check`

## DoD

- 三个原 stub 链路均可通过统一 LLM 适配层运行
- 无 key 场景下保持 deterministic fallback，测试可复现
- 不变更对外 API 契约字段
- 全量测试无回归

## output_summary（任务完成后由 AI 填写）

- 新增统一 LLM 适配层：`backend/app/llm/runtime.py`（配置解析）、`backend/app/llm/client.py`（LangChain Chat 客户端）、`backend/app/llm/text.py`（JSON 提取）。
- 三处链路均支持 provider 模式：
  - `backend/app/record/stub.py` 新增 `LangChainEnglishGenerator`
  - `backend/app/review/ai_scorer.py` 新增 `LangChainReviewAIScorer`
  - `backend/app/record/group_agent_stub.py` 新增 `LangChainGroupAgent`
- 保留 deterministic fallback：默认 `LLM_MODE=deterministic`，无 key/测试环境不触发真实外网调用，保持可复现。
- 应用装配已支持按环境切换：`backend/app/main.py` 新增 `build_ai_dependencies()`，并在 `app.state.llm_mode` 暴露当前模式。
- 依赖已更新：`backend/pyproject.toml` 增加 `langchain-openai>=0.3.0,<1.0`，`.env.example`/README/DEVELOPMENT 补齐 LLM 配置说明。
- 新增单测：`backend/tests/unit/test_llm_provider.py`，覆盖 LLM 配置默认值、provider key 校验与模型输出 JSON 提取。
