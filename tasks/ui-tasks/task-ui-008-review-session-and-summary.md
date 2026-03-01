# UI-008 复习 Session 与总结页状态流

## 目标

- 实现 Deck 内复习 Session 主流程与总结页，支持 AI 评分与手动评级并行交互。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-007-review-deck-list-page.md`
- `docs/初版需求.md`
- `docs/UI设计规范.md`
- `mock-ui/v3-c-warm-orange-session.html`
- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-007 已完成复习 Deck 列表入口。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-007`

## paired_with

- `API-011`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`

## sync_point

- `SP-006`

## 范围

- 单卡展示（正面/背面/输入区）
- AI 评分与手动评级二选一并行入口
- 下一张推进
- Session 结束总结页

## 不在范围

- FSRS 算法细节实现
- 真实 AI 打分逻辑

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：单卡到下一张的流程（Red）
3. 最小实现 Session 状态机（Green）
4. 加入 AI/手动评级并行入口与冲突处理
5. 实现总结页并保留可追溯证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- review-session`

## DoD

- Session 主流程完整且可回放
- AI/手动评级并行入口可用
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据

## output_summary（任务完成后由 AI 填写）

- （待填写）
