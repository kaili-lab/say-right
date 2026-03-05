# SESSION MEMORY（跨会话记忆）

> 目的：把“跨会话容易丢失但会影响质量/进度”的信息沉淀为单一事实来源。

## 会话启动必读（强制）

每次开始新会话，按顺序阅读：

1. `tasks/hono-migration-tasks/INDEX.md`
2. `tasks/hono-migration-tasks/HANDOFF.md`
3. `tasks/hono-migration-tasks/SESSION-MEMORY.md`（本文件）
4. 当前 task 文档的 `context_files`

## 每个任务结束后的必填项（强制）

完成任一 `HONO-*` 任务后，必须在本文件追加一条记录，至少包含：

- task_id
- 日期时间
- 关键变更
- 测试证据（命令 + 退出码 + 关键通过行）
- 踩坑/教训（WHAT + WHY）
- 新增规则（若有）
- 对后续任务的影响

## 记录模板

```md
## [YYYY-MM-DD HH:mm] HONO-XXX 标题

- 关键变更：
  - ...
- 测试证据：
  - 命令：`...`
  - 退出码：`0`
  - 关键通过行：`...`
- 踩坑/教训：
  - ...（说明 WHY）
- 新增规则：
  - ...
- 对后续任务影响：
  - ...
```

## 固定规则（持续维护）

1. 主线在 `main` 上推进，不做 `feat/hono-cloudflare-migration` 作为主开发线。
2. 上线策略为“全量 Hono + 前端同步改完再上线”，不保留旧 `/auth/login|refresh|logout` 兼容代理。
3. 所有任务必须遵循 TDD：Red -> Green -> Refactor。
4. LLM 测试禁止依赖真实模型，必须使用可复现 fixture/stub。
5. 每个任务完成后，必须先完成 review，再 `commit + push`，然后才能开始下一个任务。

## 经验沉淀区

> 按时间倒序追加，最新在最上方。

## [2026-03-06 06:40] HONO-008 OpenAI 兼容 LLM 适配层与 Stub 替换

- 关键变更：
  - 新增 `backend-hono/src/llm/runtime.ts`，统一解析 `LLM_MODE/LLM_MODEL/OPENAI_*`（含 `LLM_*` 兼容字段）并默认 `deterministic`。
  - 新增 `backend-hono/src/llm/text.ts`，提供模型输出 JSON 提取能力（前后缀容错）。
  - 新增 `backend-hono/src/llm/adapter.ts`，封装 `DeterministicLLMAdapter` 与 `OpenAICompatibleLLMAdapter`，统一 `generateEnglish/scoreReview` 协议。
  - `backend-hono/src/app.ts` 已将 `records/generate` 与 `review ai-score` 迁移为通过 adapter 调用，并统一 `LLMUnavailableError -> 503` 映射。
  - provider 配置异常时回退 deterministic；同时缩小异常捕获范围，避免吞掉非配置类错误。
  - 新增依赖：`openai@6.26.0`。
  - 新增测试：
    - `backend-hono/tests/llm-adapter.test.ts`
    - `backend-hono/tests/llm-record-review-integration.test.ts`
  - review 阶段调用了 claude reviewer subagent，并吸收“避免跨请求缓存 LLM 实例”的建议。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test -- llm record review`
  - 退出码：`0`
  - 关键通过行：`tests/llm-adapter.test.ts (6 tests)`、`tests/llm-record-review-integration.test.ts (2 tests)`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`Test Files  8 passed (8)`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 13.76s`
- 踩坑/教训：
  - OpenAI 兼容调用建议在 adapter 层就完成“超时/不可用/解析失败”统一封装，避免路由层散落 provider 细节导致错误映射不一致。
- 新增规则：
  - LLM 相关路由改造时，必须保留 deterministic 可复现路径（默认模式或明确 fallback），防止 CI 被真实模型波动污染。
- 对后续任务影响：
  - `HONO-009` 与 `HONO-010` 可以复用当前 deterministic 测试基线做回归，不需要引入真实模型访问。

## [2026-03-06 06:27] HONO-007 Review/Dashboard API 平移（Hono）

- 关键变更：
  - 在 `backend-hono/src/app.ts` 新增 review/dashboard 全链路路由：`/review/decks`、`/review/decks/:deckId/session`、`/review/session/:sessionId/ai-score`、`/review/session/:sessionId/rate`、`/review/session/:sessionId/summary`、`/dashboard/home-summary`。
  - 复习会话按 `due_at <= now` 取卡，沿用默认每日上限（新卡 20、复习卡 100），并基于当日 `review_logs` 抵扣配额。
  - 评分链路接 deterministic AI 评分器（保留 `__AI_UNAVAILABLE__ -> 503` 可复现故障注入），评级链路实现 FSRS again/hard/good/easy 更新并落 review log。
  - dashboard 聚合返回 `display_name/insight/study_days/mastered_count/total_cards/total_due/recent_decks`，口径与 FastAPI 对齐。
  - 新增集成测试 `backend-hono/tests/review-dashboard-api.test.ts`，覆盖主链路与 `401/404/422/503` 边界、配额抵扣与统计行为。
  - 在复审阶段调用了 claude reviewer subagent，采纳其“每日配额统计合并为单查询”的优化建议。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test -- review dashboard`
  - 退出码：`0`
  - 关键通过行：`tests/review-dashboard-api.test.ts (5 tests)`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`Test Files  6 passed (6)`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 12.49s`
- 踩坑/教训：
  - review/dashboard 场景下若测试直接插入 `cards`，`decks` 计数字段不会自动刷新，需在测试 fixture 中显式重算，否则会误判 dashboard 统计回归。
- 新增规则：
  - 涉及“每日上限 + 抵扣”逻辑时，优先合并为单条聚合查询，避免随业务扩展产生多次 count 查询。
- 对后续任务影响：
  - `HONO-008` 可直接复用 `__FAIL_STUB__` / `__AI_UNAVAILABLE__` 现有故障注入约定，平滑替换为 OpenAI 兼容适配层并保持测试可复现。

## [2026-03-06 06:05] HONO-006 Deck/Card/Record API 平移（Hono）

- 关键变更：
  - 在 `backend-hono/src/app.ts` 增加 `decks/cards/records` 路由，统一走 Better Auth session 鉴权，不再依赖 Bearer token。
  - 新增业务用户兜底同步：每次业务请求按会话信息 `upsert users`，解决 `auth_users` 与业务 `users` 分离导致的外键写入失败。
  - 完成 Deck/Card/Record 核心行为平移：默认组初始化、组名冲突、删除约束、卡片编辑/移动/删除、组计数刷新。
  - `records/generate` 接 deterministic stub，支持稳定失败注入（`__FAIL_STUB__` -> 503）。
  - 保留并平移 `records/save-with-agent`，维持前端保存主路径与 fallback 行为。
  - 新增集成测试 `backend-hono/tests/deck-card-record-api.test.ts` 覆盖契约关键路径与异常映射。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test -- deck card record`
  - 退出码：`0`
  - 关键通过行：`tests/deck-card-record-api.test.ts (4 tests)`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`Test Files  5 passed (5)`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 14.34s`
- 踩坑/教训：
  - `@hono/zod-validator` 的 hook 类型在严格模式下与项目自定义 `Context` 容易冲突，需要在 hook 层做宽松参数接收，再在内部格式化错误体。
- 新增规则：
  - Hono 路由接入 `zValidator` 时，若项目使用自定义 `Env` 泛型，优先把 hook 封装成通用函数并在内部做类型收窄，避免在门禁阶段出现批量类型错误。
- 对后续任务影响：
  - `HONO-007` 可直接复用会话鉴权 + D1 业务用户同步机制，不需要再处理 auth/business 用户表断层问题。

## [2026-03-05 22:40] HONO-005 前端鉴权切换到 Better Auth 会话模式

- 关键变更：
  - 前端认证请求统一走 cookie 会话：`fetchWithAuth` 强制 `credentials: include`，401 时清理本地会话并跳转登录页。
  - 回归测试基线从 token 切换为 session marker：`frontend/src/test/setup.ts` 统一注入 `say_right_session_active` 与 `say_right_user_email`。
  - `me-page` 用例对齐 `/api/auth/session` 契约响应结构，并将登出断言改为 session 清理校验。
  - 修复 `authApi.ts` 遗留未使用类型，打通 lint 门禁。
- 测试证据：
  - 命令：`cd frontend && pnpm test -- auth`
  - 退出码：`0`
  - 关键通过行：`Test Files  14 passed (14)`
  - 命令：`cd frontend && pnpm test -- auth-refresh`
  - 退出码：`0`
  - 关键通过行：`Test Files  14 passed (14)`
  - 命令：`cd frontend && pnpm test -- home record decks review`
  - 退出码：`0`
  - 关键通过行：`Tests  45 passed (45)`
  - 命令：`cd frontend && pnpm lint`
  - 退出码：`0`
  - 关键通过行：`eslint .`
  - 命令：`cd frontend && pnpm typecheck`
  - 退出码：`0`
  - 关键通过行：`tsc --noEmit`
- 踩坑/教训：
  - `vitest run -- auth*` 会匹配大量业务测试；若 `test/setup.ts` 仍注入旧 token，测试会统一跌回登录页并出现“批量假失败”。
- 新增规则：
  - 鉴权模型迁移时，必须先更新测试基线（setup fixture）再跑聚合关键字测试，避免误判业务回归。
- 对后续任务影响：
  - `HONO-006` 可直接复用会话化 `fetchWithAuth` 与已稳定的前端测试基线，无需再维护 token/refresh 兼容路径。

## [2026-03-05 22:18] HONO-004 Better Auth 后端接入（Hono + D1）

- 关键变更：
  - 新增 `src/auth.ts`，基于 `better-auth + @better-auth/drizzle-adapter` 完成会话鉴权配置。
  - 扩展 `src/db/schema.ts`：新增 `auth_users/auth_sessions/auth_accounts/auth_verifications` 四张表。
  - 改造 `src/app.ts`：挂载 `/api/auth/*` 与 `/api/auth/session`，新增 `/protected/*` 会话中间件。
  - 新增 `tests/auth-session.test.ts`，覆盖注册/会话查询/登出/受保护路由/CORS cookie 断言。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test -- auth`
  - 退出码：`0`
  - 关键通过行：`tests/auth-session.test.ts (2 tests)`
  - 命令：`cd backend-hono && pnpm test -- auth cors session`
  - 退出码：`0`
  - 关键通过行：`Test Files  4 passed (4)`
  - 命令：`cd backend-hono && pnpm drizzle-kit check`
  - 退出码：`0`
  - 关键通过行：`Everything's fine`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`pnpm test && pnpm lint && pnpm typecheck`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 18.86s`
- 踩坑/教训：
  - Better Auth 的字段映射会按“映射后的字段名”校验 Drizzle schema key，schema key 与字段映射必须同口径。
  - `drizzle/meta/_journal.json` 若缺少某次迁移条目，`migrate()` 不会执行对应 SQL，容易出现“表不存在”假故障。
- 新增规则：
  - 变更 `drizzle/meta/_journal.json` 后必须立即执行一次 `migrate + auth` 用例，确认迁移链条未断。
- 对后续任务影响：
  - `HONO-005` 可直接对接 `/api/auth/*` + `/api/auth/session`，并以 cookie session 完成前端改造。

## [2026-03-05 22:06] HONO-003 D1 + Drizzle Schema 重建与仓储基线

- 关键变更：
  - 新增 `src/db/schema.ts`，落地 6 张核心表与关键约束。
  - 新增 `src/repositories/core-repositories.ts`（`StudyRepository` 最小实现）。
  - 新增 `drizzle.config.ts` 并生成迁移文件 `drizzle/0000_*.sql`。
  - 新增 `tests/d1-schema-repository.test.ts`，覆盖 CRUD + 唯一键/外键/级联删除/复合主键。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test -- d1`
  - 退出码：`0`
  - 关键通过行：`tests/d1-schema-repository.test.ts (4 tests)`
  - 命令：`cd backend-hono && pnpm drizzle-kit check`
  - 退出码：`0`
  - 关键通过行：`Everything's fine`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`pnpm test && pnpm lint && pnpm typecheck`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 14.75s`
- 踩坑/教训：
  - `eslint` 在 TS 参数属性场景会被基础 `no-unused-vars` 误判，需要显式切换到 `@typescript-eslint/no-unused-vars`。
  - `drizzle.config.ts` 需加入 `tsconfig.include`，否则 lint/typecheck 链路不一致。
- 新增规则：
  - 数据层任务新增 TS 配置文件时，必须同步纳入 `tsconfig.include`，避免门禁阶段才暴露解析错误。
- 对后续任务影响：
  - `HONO-004` 可直接复用现有 schema 与 migration，补充 Better Auth 所需扩展表即可。

## [2026-03-05 22:00] HONO-002 Workers + Hono 工程初始化与质量门禁

- 关键变更：
  - 初始化 `backend-hono` 工程与脚手架：`wrangler.toml`、`package.json`、`tsconfig.json`、`eslint.config.js`、`vitest.config.ts`。
  - 落地 `GET /health` 与 CORS 骨架（显式 origin、`credentials=true`）。
  - 新增测试：`tests/health.test.ts`、`tests/cors.test.ts`。
  - 建立并打通 `pnpm test/lint/typecheck/check`。
- 测试证据：
  - 命令：`cd backend-hono && pnpm test`
  - 退出码：`0`
  - 关键通过行：`Test Files  2 passed (2)`
  - 命令：`cd backend-hono && pnpm test -- cors`
  - 退出码：`0`
  - 关键通过行：`tests/cors.test.ts (1 test)`
  - 命令：`cd backend-hono && pnpm check`
  - 退出码：`0`
  - 关键通过行：`pnpm test && pnpm lint && pnpm typecheck`
  - 命令：`cd backend-hono && timeout 15s pnpm dev`
  - 退出码：`124`（timeout 触发，属于预期）
  - 关键通过行：`Ready on http://localhost:8787`
  - 命令：`make -C backend check`
  - 退出码：`0`
  - 关键通过行：`122 passed in 16.10s`
- 踩坑/教训：
  - 依赖安装与测试不能并行触发，否则会出现 `vitest: not found` 假失败，必须串行保证安装先完成。
  - CORS 回调里直接读取 `c.env` 会在无 env 上下文测试中触发 500，需要 `c.env?` 兜底。
- 新增规则：
  - `app.request()` 的单测必须覆盖“无 env 上下文”场景，避免仅在 Worker 运行时才暴露问题。
- 对后续任务影响：
  - `HONO-003` 可直接复用当前测试/静态检查门禁与 Worker 入口结构。

## [2026-03-05 21:55] HONO-001 Hono 迁移基线冻结与工程目录落位

- 关键变更：
  - 创建 `backend-hono/` 目录。
  - 新增 `backend-hono/.env.example`，统一 Hono/Cloudflare/Better Auth/OpenAI 兼容变量口径。
  - 本地生成 `backend-hono/.env` 与 `backend-hono/.dev.vars`，值来自现有 `backend/.env`，用于迁移期本地联调。
  - 迁移方案文档新增“迁移期环境变量草案”章节。
- 测试证据：
  - 命令：`test -d backend-hono`
  - 退出码：`0`
  - 关键通过行：`test -d backend-hono => 0`
  - 命令：`test -f docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
  - 退出码：`0`
  - 关键通过行：`test -f Hono方案文档 => 0`
  - 命令：`rg -n "直接在 .*main.* 执行迁移" docs/Hono-Cloudflare迁移整改方案-2026-03-05.md`
  - 退出码：`0`
  - 关键通过行：`已确认采用“直接在 main 执行迁移”的策略。`
- 踩坑/教训：
  - `.dev.vars` 默认不会被 `.env` 规则覆盖，需要单独加入 `.gitignore`，否则容易把本地密钥误提交。
- 新增规则：
  - 迁移期统一使用 `backend-hono/.env.example` 作为变量口径文档，真实值仅放本地 `.env/.dev.vars`。
- 对后续任务影响：
  - `HONO-002` 可以直接复用当前环境变量基线与 CORS origin 变量，不需要再次定义。
