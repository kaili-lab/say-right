# API-026 新增记录页手动分组保存接口 `POST /records/save`

## 目标

- 提供记录页“指定分组保存卡片”的后端接口，替代前端依赖 save-with-agent 的路径

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 4）
- `docs/FastAPI项目固定流程.md`
- `docs/contracts/v0.7-record-save-manual.yaml`
- `backend/app/record/api.py`
- `backend/app/card/service.py`
- `backend/app/card/repository.py`
- `backend/tests/integration/test_save_with_agent_hit.py`
- `backend/tests/integration/test_save_with_agent_fallback.py`
- `tasks/api-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- API-025 已完成性能优化收口。
- 当前仅有 `POST /records/save-with-agent`，缺少“前端指定 deck 保存”的接口。

## skill_required

- `python-pro`

## 前置依赖

- `API-009`

## paired_with

- `UI-017`

## contract_version

- `docs/contracts/v0.7-record-save-manual.yaml`

## sync_point

- `SP-API-RECORD-SAVE`

## execution_context（执行环境约定）

- workdir: `backend`
- runtime: python
- env_activate: `source ../.venv/bin/activate`
- install_commands: 无

## 范围

1. 在 `record/api.py` 新增 `POST /records/save`：
   - 请求：`source_text`、`generated_text`、`deck_id`、`source_lang`、`target_lang`
   - 鉴权：复用当前 `current_user_dependency`
   - 业务：调用 `card_service.create_card(...)`
   - 响应：`{ card_id, deck_id, deck_name }`，状态码 201
2. 错误映射：
   - deck 不存在或不属于当前用户 -> 404
   - payload 非法 -> 422
3. 不额外调用 deck 计数刷新逻辑（`create_card` 内已完成）
4. 新增/更新集成测试覆盖成功与失败路径

## 不在范围

- 改动 `POST /records/save-with-agent`
- 删除 agent 相关 service

## 子步骤（执行清单）

1. 先写失败测试（Red）：成功保存、404 deck 不存在、401 未登录
2. 最小实现接口（Green）
3. 补齐边界测试（文本空白/语言对非法）
4. 运行后端质量门禁（`make -C backend check`）
5. 保留测试证据

## test_scope

- `integration`
- `unit`

## test_commands

- `cd backend && source ../.venv/bin/activate && python -m pytest`
- `make -C backend check`

## DoD

- `POST /records/save` 契约可用并通过鉴权
- 成功返回 `card_id/deck_id/deck_name`，状态 201
- 非法 deck 返回 404
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

