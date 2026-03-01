# API-007A 记录生成英文（LLM stub）

## 目标

- 提供记录页“生成英文”后端能力，按契约返回可复现结果（stub/fixture）。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-007-card-crud-and-move.md`
- `docs/初版需求.md`
- `docs/contracts/v0.3.5-record-generate.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-007 已完成 Card 领域基础能力。

## skill_required

- `python-pro`

## 前置依赖

- `API-007`

## paired_with

- `UI-005`

## contract_version

- `docs/contracts/v0.3.5-record-generate.yaml`

## sync_point

- `SP-0035`

## 范围

- `POST /records/generate`
- 参数校验（source_text/source_lang/target_lang）
- LLM stub/fixture 输出（可复现）

## 不在范围

- 真实模型供应商接入
- 保存卡片与分组逻辑

## 子步骤（执行清单）

1. 读取 context_files，确认生成英文契约与输入输出字段
2. 写失败测试：请求校验与成功响应（Red）
3. 最小实现接口与 stub 调用（Green）
4. 补齐模型不可用与空输入边界
5. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行）

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_record_generate_service.py`
- `pytest -q tests/integration/test_record_generate_api.py`

## DoD

- 生成英文接口满足契约并可稳定复现
- LLM 测试不依赖真实模型调用
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
