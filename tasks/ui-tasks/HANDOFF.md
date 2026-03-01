# UI HANDOFF

## 最近一次交接

- 当前阶段：UI-007 已完成，复习 Deck 列表页已可用
- 本次变更：接入 `GET /review/decks`，实现按待复习数降序展示、空状态与进入 Deck Session 入口（过渡占位路由）
- 关键产出：`frontend/src/pages/ReviewDeckListPage.tsx`、`frontend/src/pages/reviewApi.ts`、`frontend/src/review-deck-list.test.tsx`
- 可追溯证据：`pnpm test -- review-deck-list`（passed）；`pnpm test/lint/typecheck`（passed）
- 下一步建议：执行 UI-008（复习 Session 与总结页状态流）
