# API-005 Deck 列表与创建（含默认组存在性）

## 目标

- 交付 Deck 列表与创建接口，并确保“每用户默认组存在”。

## context_files（AI 开始前必读）

- `tasks/api-tasks/task-api-004-auth-register-login-refresh-me.md`
- `docs/初版需求.md`
- `docs/contracts/v0.2-deck-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- API-004 已提供用户身份上下文。

## skill_required

- `python-pro`
- `supabase-postgres-best-practices`

## 前置依赖

- `API-004`

## paired_with

- `UI-009`

## contract_version

- `docs/contracts/v0.2-deck-basic.yaml`

## sync_point

- `SP-003`

## 范围

- `GET /decks`
- `POST /decks`
- 默认组存在性策略（账号创建时创建；认证未接入场景用 seed/fixture 兜底）

## 不在范围

- Deck 删除策略
- 卡片接口

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：list/create + 默认组存在性（Red）
3. 最小实现仓储与 API（Green）
4. 补齐重复名称与非法输入边界
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pytest -q tests/unit/test_deck_repository.py`
- `pytest -q tests/integration/test_deck_api.py`

## DoD

- Deck list/create 可用
- 默认组存在性得到保证
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- 已新增 Deck 模块：`backend/app/deck/repository.py`、`backend/app/deck/service.py`、`backend/app/deck/api.py`，实现 `GET /decks` 与 `POST /decks`。
- 已实现默认组存在性策略：账号注册成功后通过回调立即创建默认组；列表/创建流程中也有 `ensure_default_deck` 兜底。
- 已覆盖重复名称与非法输入边界：重复 deck 名称返回 409、空白名称返回 422。
- 已补充测试：`backend/tests/unit/test_deck_repository.py`、`backend/tests/integration/test_deck_api.py`。
- 当前 Deck 数据采用内存仓储，后续可无缝替换为数据库仓储实现。
