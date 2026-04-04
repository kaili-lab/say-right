# UI HANDOFF

## 最近一次交接（2026-04-04）

- 当前阶段：`UI-028` ~ `UI-036` 已完成，公开 landing page 与登录后工作台已完成路由拆分并收口测试/文档。
- 本批关键产出：
  - 路由与守卫：
    - `frontend/src/App.tsx` 将根路径 `/` 切换为公开 landing，登录后业务首页迁移到 `/app`。
    - 业务私有路由未登录重定向到 `/`，认证路由在已登录态重定向到 `/app`。
  - landing page：
    - 新增 `frontend/src/pages/LandingPage.tsx`
    - 新增 `frontend/src/pages/landingCopy.ts`（中英文文案）
    - 新增 `frontend/src/pages/landingLocale.ts`（语言归一化与本地持久化）
    - 新增静态截图资源：`frontend/public/landing/*`
  - 导航与认证入口一致性：
    - 导航首页路径统一调整为 `/app`
    - 登录成功跳转改为 `/app`
    - 登录页、注册页补充“返回首页”入口
  - 测试与验收：
    - 新增 `frontend/src/landing-page.test.tsx`
    - 新增 `frontend/src/landing-locale.test.ts`
    - 更新多处路由相关测试断言（`/` 与 `/app`）
    - `frontend/tests/visual/visual-regression.spec.ts`：
      - 业务首页视觉回归对比路径改为 `/app`
      - 新增 landing 视觉基线与响应式断言（desktop + iPhone 13）
  - 文档口径对齐：
    - `README.md`、`README_CN.md`、`showcase-say-right.md`、`frontend/README.md`
    - 对外叙事不再把 Group Agent 作为当前主路径卖点，记录保存主链路统一为 `POST /records/save`

## 可追溯测试证据

- `cd frontend && pnpm test`
- `cd frontend && pnpm test:visual`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## 下一步建议

1. 若对 landing 视觉有大改，优先更新视觉基线并保留桌面/移动端对照图。
2. 若后续要恢复 Group Agent 主路径，需先补可用性验证与 A/B 证据，再更新 README 对外口径。
