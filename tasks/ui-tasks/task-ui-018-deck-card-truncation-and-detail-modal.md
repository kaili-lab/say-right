# UI-018 卡片组页卡片内容截断与详情弹窗

## 目标

- 解决手机端卡片列表长文本溢出问题
- 增加“查看”详情弹窗展示完整内容与操作入口

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 6）
- `frontend/src/pages/DeckListPage.tsx`
- `frontend/src/deck-card-management.test.tsx`
- `tasks/ui-tasks/HANDOFF.md`

## previous_task_output（上个任务关键产出摘要）

- UI-017 已完成记录页保存流改造。
- DeckListPage 当前仍为 table 全文展示，长文本在小屏下可读性差。

## skill_required

- `vercel-react-best-practices`
- `tailwind-css`

## 前置依赖

- `UI-016`

## paired_with

- 无

## contract_version

- N/A（纯前端交互）

## sync_point

- `SP-UI-CARD-TRUNCATE`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. 表格容器增加 `overflow-x-auto`
2. 中文/英文列增加截断样式（小屏优先）
3. 扩展 `CardModalState`：新增 `detail` 模式
4. 行操作新增固定“查看”按钮（单一入口，不走整行点击）
5. 详情弹窗展示完整中文、英文、下次复习时间
6. 详情弹窗内可触发编辑/移动/删除，采用“先关详情再开目标弹窗”避免嵌套冲突
7. 更新相关测试

## 不在范围

- 卡片列表改为卡片式布局
- 独立详情页路由

## 子步骤（执行清单）

1. 写失败测试（Red）：截断、详情弹窗、详情到操作弹窗切换
2. 实现截断与详情弹窗（Green）
3. 补齐边界测试（极长文本）
4. 运行全量测试并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 小屏下卡片文本不撑破布局
- “查看”能打开详情并展示完整内容
- 详情可进入编辑/移动/删除流程且无弹窗冲突
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

