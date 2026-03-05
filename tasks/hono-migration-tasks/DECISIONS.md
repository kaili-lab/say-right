# HONO Migration DECISIONS

## 已决策（2026-03-05）

- 迁移主线：`React + Hono(Cloudflare Workers)`
- 鉴权：`better-auth`（会话机制）
- 数据库：Cloudflare `D1`
- ORM：`drizzle-orm` + `drizzle-kit`
- LLM：`openai` SDK（OpenAI 兼容端点，可切 `baseURL`）
- 开发分支策略：直接在 `main` 执行迁移，不以 `feat/hono-cloudflare-migration` 作为主开发线
- 上线策略：前后端同步切换后再上线（不做旧 `/auth/login|refresh|logout` 兼容代理）
- 质量红线：所有任务遵循 TDD（Red -> Green -> Refactor）

## 版本基线（当前稳定）

- `hono`: 4.12.5
- `wrangler`: 4.70.0
- `drizzle-orm`: 0.45.1
- `zod`: 4.3.6（npm `latest`，核验日期：2026-03-05）
- `better-auth`: 1.5.3
- `openai`: 6.25.0

## 责任归属（防散落）

- CORS + Cookie 全链路：
  - `HONO-002` 负责 CORS 骨架（显式 origin + credentials）
  - `HONO-004` 负责鉴权端到端验证（`credentials: include` + cookie 收发）
- Better Auth schema：
  - `HONO-004` 负责 Better Auth 所需表结构落位（D1 + Drizzle）
- Review Session 存储策略：
  - `HONO-003` 负责 `review_session_cards` 表结构迁移
  - `HONO-007` 负责每日限额与复习摘要逻辑等价迁移

## 命令口径（统一）

- Hono 后端：
  - `cd backend-hono && pnpm test`
  - `cd backend-hono && pnpm lint`
  - `cd backend-hono && pnpm typecheck`
- 前端：
  - `cd frontend && pnpm test`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm typecheck`

## 待决策

- D1 生产数据导入窗口（是否允许短暂停机）
- 是否需要保留 `legacy/fastapi-main-2026-03-05` 受保护策略（建议保留）
