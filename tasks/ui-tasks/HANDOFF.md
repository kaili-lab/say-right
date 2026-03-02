# UI HANDOFF

## 最近一次交接

- 当前阶段：UI-013 已完成，首页与复习总结已对齐后端聚合字段。
- 本次变更：
  - 首页问候改为后端 `display_name`
  - “你知道吗？”洞察改为后端 `insight`
  - 复习完成页接入 `/review/session/{session_id}/summary`
  - 退出登录改为“优先调用后端 `/auth/logout`，失败时本地兜底清 token”
- 关键产出：
  - `frontend/src/pages/homeApi.ts`
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/pages/reviewApi.ts`
  - `frontend/src/pages/ReviewSessionPage.tsx`
  - `frontend/src/pages/authApi.ts`
  - `frontend/src/app/AppShell.tsx`
- 可追溯证据：
  - `pnpm test`（23 passed）
  - `pnpm lint`（passed）
  - `pnpm typecheck`（passed）
- 下一步建议：
  1. 可补一轮 Playwright e2e，验证前后端联调下会话总结与登出行为
  2. 若 API-019 确认异步化改造，再评估前端请求超时/重试策略
