# UI-013 首页昵称/洞察与复习总结接口接入

## 目标

- 前端消费新的首页字段与复习总结端点，消除硬编码问候与前端本地总结口径漂移。

## context_files（AI 开始前必读）

- `docs/待实现清单.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/ui-tasks/task-ui-008-review-session-and-summary.md`
- `tasks/api-tasks/task-api-016-review-log-session-summary-and-limits.md`
- `tasks/api-tasks/task-api-017-dashboard-insight-auth-nickname-logout-cors-contract.md`

## previous_task_output（上个任务关键产出摘要）

- UI-012 已完成视觉与关键路径验收，首页与复习流程可用，但首页昵称固定写死、总结数据前端本地计算。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-012`
- `API-016`
- `API-017`

## paired_with

- `API-016`
- `API-017`

## contract_version

- `docs/contracts/v0.5-review-flow-fsrs.yaml`
- `docs/contracts/v0.6-dashboard.yaml`

## sync_point

- `SP-UI-DASHBOARD-REVIEW-SUMMARY`

## 范围

- `homeApi` 增加 `display_name`、`insight`
- 首页问候语改为后端返回 display_name
- 首页洞察卡片改为后端返回 insight
- 复习结束后通过 `/review/session/{session_id}/summary` 渲染总结
- 退出登录流程优先调用 `/auth/logout`（失败不阻断本地清 token）

## 不在范围

- 新视觉主题调整
- 认证流程重构

## 子步骤（执行清单）

1. 先补前端失败测试：首页字段映射与复习总结请求（Red）
2. 最小实现 API 访问层与页面状态流改造（Green）
3. 回归关键 UI 测试与类型检查

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test -- --runInBand`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 首页与复习总结均由后端聚合字段驱动
- 退出登录流程兼容后端 logout 端点
- 前端测试、lint、typecheck 全通过

## output_summary（任务完成后由 AI 填写）

- 首页数据已接入新字段：`frontend/src/pages/homeApi.ts` 新增 `display_name/insight` 映射（含缺省兜底），`HomePage.tsx` 改为显示后端 `displayName` 与 `insight`。
- 复习总结已改为后端聚合：`frontend/src/pages/reviewApi.ts` 新增 `fetchReviewSessionSummary()`，`ReviewSessionPage.tsx` 在会话结束后拉取 `/review/session/{session_id}/summary`。
- 总结页具备降级策略：若 summary 接口失败，页面回退本地统计并展示提示，不阻断用户流程。
- 退出登录已优先调用后端：`frontend/src/pages/authApi.ts` 新增 `logoutAccount()`，`frontend/src/app/AppShell.tsx` 改为“先请求后端、再清本地 token”的容错流程。
- 测试已更新：`frontend/src/review-session.test.tsx`、`frontend/src/home-page.test.tsx`、`frontend/src/auth-ui.test.tsx`、`frontend/src/App.test.tsx`、`frontend/src/app-shell.test.tsx`。
