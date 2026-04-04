# UI-026 卡片编辑弹窗语音接入

## 目标

- 为卡片编辑弹窗中的中英文学习内容输入框接入语音，同时明确排除 Deck 名称创建等非学习型表单。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/ui-tasks/task-ui-023-speech-enabled-textarea.md`
- `frontend/src/pages/DeckListPage.tsx`
- `frontend/src/pages/decksApi.ts`
- `frontend/src/deck-card-management.test.tsx`
- `frontend/src/deck-list-create.test.tsx`

## previous_task_output（上一个任务关键产出摘要）

- `UI-023` 已提供通用语音输入组件。
- 卡片编辑弹窗含两个学习型 textarea：`front/back`
- Deck 创建弹窗是非学习型表单，应明确排除语音入口。

## skill_required

- `-`

## 前置依赖

- `UI-023`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-UI-DECK-CARD-SPEECH`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 编辑弹窗中文输入框接入语音：
   - `scene=card_front`
   - `language=zh`
2. 编辑弹窗英文输入框接入语音：
   - `scene=card_back`
   - `language=en`
3. 明确不为以下输入增加语音：
   - Deck 名称创建
   - 登录/注册
   - 删除确认文案
4. 保持卡片保存、移动、删除链路不回归

## 不在范围

- Deck 创建表单语音
- 详情弹窗语音
- 批量编辑

## 子步骤（执行清单）

1. 先写失败测试（Red）：front/back 回填、保存不回归、Deck 创建框无麦克风入口。
2. 最小接入编辑弹窗两个学习型输入框（Green）。
3. 补齐边界测试：切换弹窗、关闭重开、错误恢复（Refactor）。
4. 执行前端质量门禁并保留证据。

## test_scope

- `integration`
- `unit`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 卡片编辑弹窗 front/back 均有语音入口。
- Deck 创建等非学习型表单没有被误加语音。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 更新 `frontend/src/pages/DeckListPage.tsx` 编辑弹窗：
    - front 输入接入语音：`scene=card_front`、`language=zh`。
    - back 输入接入语音：`scene=card_back`、`language=en`。
  - 明确保持 Deck 创建弹窗无语音入口（非学习型表单排除）。
  - 新增回归覆盖：`frontend/src/speech-page-integration.test.tsx`。
- 测试证据：
  - `cd frontend && pnpm test -- deck-card-management deck-list-create speech-page-integration` 通过。
  - 已在前端全量门禁中通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
