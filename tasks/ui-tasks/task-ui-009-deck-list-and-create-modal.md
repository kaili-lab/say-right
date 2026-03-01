# UI-009 卡片组列表与创建组弹窗

## 目标

- 实现卡片组页面基础能力：列表展示、创建组弹窗、默认组禁删态展示。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-003-app-shell-and-main-tabs.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-decks.html`
- `docs/contracts/v0.2-deck-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-003 已完成卡片组路由壳层。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-003`

## paired_with

- `API-005`

## contract_version

- `docs/contracts/v0.2-deck-basic.yaml`

## sync_point

- `SP-003`

## 范围

- 卡片组列表展示
- 创建组弹窗与表单校验
- 默认组不可删除的禁用态提示
- 页面空状态

## 不在范围

- 组内卡片编辑/移动/删除
- 后端真实删除策略处理

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：列表渲染、创建弹窗开关、禁删态（Red）
3. 实现最小交互并转绿（Green）
4. 补齐空状态与错误提示展示
5. 保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- deck-list-create`

## DoD

- 列表/创建/禁删态完整
- 与 `v0.2-deck-basic` 字段对齐
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
