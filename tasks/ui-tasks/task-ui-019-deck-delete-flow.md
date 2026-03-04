# UI-019 卡片组删除功能落地

## 目标

- 在卡片组页实现“删除组”完整交互，替换当前禁用占位按钮
- 严格遵循后端删除约束：默认组不可删、非空组不可删、空非默认组可删

## context_files（AI 开始前必读）

- `frontend/src/pages/DeckListPage.tsx`
- `frontend/src/pages/decksApi.ts`
- `frontend/src/deck-list-create.test.tsx`
- `frontend/src/deck-card-management.test.tsx`
- `backend/app/deck/api.py`
- `docs/contracts/v0.2.1-deck-delete.yaml`
- `tasks/ui-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- UI-018 已改善卡片列表可读性，但“删除卡片组”仍是禁用按钮。
- 后端删除接口已存在，前端尚未接入调用和反馈。

## skill_required

- `vercel-react-best-practices`
- `tailwind-css`

## 前置依赖

- `UI-018`

## paired_with

- 无（后端能力已具备）

## contract_version

- `docs/contracts/v0.2.1-deck-delete.yaml`

## sync_point

- `SP-UI-DECK-DELETE`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. `decksApi.ts` 新增 `deleteDeck(deckId)` 调用
2. `DeckListPage.tsx`：
   - 默认组：删除按钮禁用并给出原因提示
   - 非默认组：可点击删除，弹确认框
   - 删除成功后刷新列表并切换选中组（优先默认组）
   - 删除失败时展示后端错误文案（如非空组 409）
3. 更新测试覆盖：成功删除、默认组删除被禁、非空组删除失败提示

## 不在范围

- 删除组前自动迁移卡片
- 批量删除组

## 子步骤（执行清单）

1. 写失败测试（Red）：删除成功、删除失败、默认组禁用
2. 实现 API 与页面交互（Green）
3. 补边界测试并回归
4. 运行全量测试并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 空且非默认组可成功删除
- 默认组始终不可删除
- 非空组删除失败时提示明确
- 删除后列表与选中态一致
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）
