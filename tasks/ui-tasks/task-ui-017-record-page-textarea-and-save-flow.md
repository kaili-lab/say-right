# UI-017 记录页 textarea 自动增长与手动分组保存（前端）

## 目标

- 中文/英文 textarea 改为自动增长（1 行到 4 行）
- 英文结果区去除冗余展示信息
- 保存卡片改为“先选分组再保存”，并接入新接口 `POST /records/save`
- 保存成功后英文只读、按钮禁用、提示明确

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 2、3、4、5）
- `frontend/src/pages/RecordPage.tsx`
- `frontend/src/pages/recordApi.ts`
- `frontend/src/pages/decksApi.ts`
- `docs/contracts/v0.7-record-save-manual.yaml`
- `tasks/ui-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- UI-016 已完成“我的”页与导航入口。
- 当前记录页保存仍调用 `saveRecordWithAgent`，并存在“保存后再调分组”的交互。
- `POST /records/save` 由 API-026 提供。

## skill_required

- `vercel-react-best-practices`
- `tailwind-css`

## 前置依赖

- `UI-016`
- `API-026`

## paired_with

- `API-026`

## contract_version

- `docs/contracts/v0.7-record-save-manual.yaml`

## sync_point

- `SP-UI-RECORD-SAVE`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. 新增可复用 `useAutoResize`（中文/英文 textarea 共用）
2. 中文 textarea：`rows=1` + 自动增长到 4 行，清空后回缩
3. 英文结果区：
   - 删除“原文”展示行
   - 删除 model/trace 展示（开发态可保留）
   - 英文 textarea 同步自动增长
4. 保存流程重构：
   - 点击“保存卡片”先打开分组弹窗
   - 默认选择 `isDefault=true` 的分组
   - 确认后调用 `saveRecordToDeck`
   - 去除“保存后立即调整分组”流程
5. 保存后行为：
   - `saveStatus === "saved"` 时英文只读、保存按钮禁用
   - 显示“已保存到 {deckName}”
   - 新一轮生成后恢复可编辑

## 不在范围

- 删除 `save-with-agent` 后端接口
- 新建分组功能（仍在卡片组页）

## 子步骤（执行清单）

1. 写失败测试（Red）：textarea 自增长、手动选组保存、保存后只读
2. 实现 `useAutoResize` 与 RecordPage 重构（Green）
3. 更新 `recordApi.ts` 接入新保存接口
4. 补齐边界测试（清空回缩、保存失败可重试）
5. 运行全量测试并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 中英文 textarea 自动增长符合 1~4 行预期
- 保存流程改为先选分组再保存
- 保存成功后英文只读、按钮禁用、提示正确
- 保存失败仍可编辑并重试
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

### Bug 修复（2026-03-05）

**问题**：保存卡片后，"保存卡片"按钮正确禁用，但"生成英文"按钮仍可点击，与"保存后完成"的交互预期不符。

**原因**：`canGenerate` 未检查 `isSaved`，且 `handleSourceTextChange` 未在已保存状态下重置 `saveStatus`。

**修复**：
1. `canGenerate` 增加 `!isSaved` 条件——保存后"生成英文"禁用
2. `handleSourceTextChange` 在 `saveStatus === "saved"` 时重置状态——用户修改源文本后可重新生成
