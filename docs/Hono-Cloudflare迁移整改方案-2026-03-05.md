# Hono + Cloudflare 迁移整改方案（2026-03-05）

## 1. 目标与范围

- 目标：将当前 `React + FastAPI` 架构迁移为 `React + Hono(Cloudflare Workers)`，以降低部署复杂度并提升边缘部署适配性。
- 保持：业务功能与接口契约尽量与现有版本一致（尤其是 auth / record / decks / review 主链路）。
- 本期约束：
  - 鉴权：`better-auth`
  - 数据库：Cloudflare `D1`
  - LLM：OpenAI 兼容客户端（`openai` SDK + 可配置 `baseURL`）

## 2. 技术方案（主流栈）

### 2.1 后端（Cloudflare Workers）

- Web 框架：`hono`（建议 4.x 当前稳定线）
- 运行与部署：`wrangler` + Workers
- 输入校验：`zod` + `@hono/zod-validator`
- ORM 与迁移：`drizzle-orm` + `drizzle-kit`（SQLite/D1 方言）
- 鉴权：`better-auth`（Hono 集成）
- LLM：`openai` SDK（OpenAI 兼容端点）
- 存储扩展（按需）：
  - `KV`：轻量缓存（例如会话读优化、幂等键）
  - `R2`：对象存储（未来音频/附件场景）

### 2.2 前端（React）

- 维持现有 React 技术栈
- 认证接入改造：从“access/refresh token + localStorage”迁移为 Better Auth 会话机制
- API 层改造：统一基于 `credentials: "include"` 的请求封装

## 3. 鉴权方案：Better Auth 落地

## 3.1 后端改造

- 接入 Better Auth 路由（如 `/api/auth/*`）
- 会话存储落在 D1（通过 Drizzle schema）
- 不保留旧 `FastAPI` 风格 `/auth/login`、`/auth/refresh`、`/auth/logout` 兼容代理，按 Better Auth 会话接口一次切换

## 3.2 前端是否需要改？

需要，且是必改项。

主要变化：

1. 删除本地 token 持久化逻辑（`localStorage access_token/refresh_token`）
2. `fetchWithAuth` 改为：
   - 默认携带 `credentials: "include"`
   - 401 时通过 Better Auth 客户端状态判断与引导登录，不再自己做 refresh 重试链
3. 登录/注册/退出流程改为 Better Auth 客户端 API
4. 鉴权态来源改为会话查询接口/客户端 hooks，而不是解析 JWT

## 3.3 安全配置要点

- Cookie：`HttpOnly + Secure + SameSite`（生产建议 `Lax` 或按跨站需求调整）
- CORS：仅允许前端域名，且允许携带凭据
- CSRF：按 Better Auth 推荐配置启用

## 4. 数据库方案：PostgreSQL -> D1（SQLite）

## 4.1 迁移原则

- 以“业务语义不变”为第一优先，不做跨模块重构
- 使用 Drizzle 重建 schema，保留现有核心实体：`users / decks / cards / review_sessions / review_logs`
- UUID 继续用字符串字段存储

## 4.2 D1 注意点

- 类型系统与 Postgres 不同：`TEXT/INTEGER` 为主
- 无 JSONB/部分高级 SQL 能力，需要在查询层做等价改写
- 事务能力相对受限，跨表复杂写入要拆分并保证幂等

## 4.3 数据迁移策略

1. 定义 Drizzle D1 schema（新库）
2. 编写一次性导入脚本（从现有数据导出 -> D1 导入）
3. 校验：行数、关键字段一致性、抽样业务回放

## 5. LLM 方案：OpenAI 兼容客户端

- 使用 `openai` SDK
- 通过配置切换 `baseURL`：
  - OpenAI 官方
  - Cloudflare Workers AI 兼容端点
  - AI Gateway 兼容端点
- 保持当前“可替换 provider”的抽象边界：
  - `LLMClient` 接口不暴露具体厂商细节
  - 服务层只依赖统一 `generate()` 协议

## 5.1 迁移期环境变量草案（基于现有 `.env` 同步）

- 本地迁移目录：`backend-hono/`
- 本地密钥文件（不入库）：
  - `backend-hono/.env`
  - `backend-hono/.dev.vars`
- 可提交示例文件：
  - `backend-hono/.env.example`

建议变量口径：

- 基础：`APP_ENV`、`APP_CORS_ALLOW_ORIGINS`
- Better Auth：`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`
- Cloudflare/D1：`CLOUDFLARE_ACCOUNT_ID`、`D1_DATABASE_ID`、`D1_DATABASE_NAME`
- LLM（OpenAI 兼容）：`LLM_MODE`、`LLM_MODEL`、`OPENAI_API_KEY`、`OPENAI_BASE_URL`
- 兼容过渡字段：`LLM_API_KEY`、`LLM_BASE_URL`

## 6. 接口迁移策略（契约优先）

- 原则：先保路径和响应结构，再替换内部实现
- 优先迁移顺序：
  1. `auth` 主链路
  2. `decks/cards`
  3. `records`（含 `generate/save`）
  4. `review/dashboard`

建议每个模块采用：
- 契约回归测试（请求/响应字段、状态码）
- 关键异常映射测试（401/404/422/503）

## 7. 前端改造清单

1. `authApi.ts`
   - 重写为 Better Auth 客户端调用
2. 全部 API 模块（`homeApi / recordApi / decksApi / reviewApi`）
   - 请求封装改为 cookie 会话模式
3. 路由守卫
   - 改为会话态检查
4. 测试
   - 新增会话态用例
   - 更新 401/重定向断言

## 8. 分阶段落地计划

## Phase 0：基线冻结

- 固化当前主干为“遗留稳定分支”（见第 9 节）
- 明确对外“迁移期契约不变”

## Phase 1：Hono 基础设施

- 建立 Hono Worker 项目骨架
- 接入 Drizzle + D1 + 基础健康检查
- 建立 CI：lint/typecheck/test

## Phase 2：鉴权迁移

- Better Auth + D1 会话跑通
- 前端完成登录态切换

## Phase 3：业务 API 平移

- 按模块迁移并通过契约回归

## Phase 4：联调与压测

- 关键链路 e2e
- 延迟/错误率对比 FastAPI 版本

## Phase 5：主分支切换

- 完成默认分支与部署切换
- 保留旧分支作为回滚基线

## 9. 分支治理策略（你提的方案）

已确认采用“直接在 `main` 执行迁移”的策略。

执行建议：

1. 保留 `legacy/fastapi-main-2026-03-05`
   - 保存当前 `React + FastAPI` 可运行基线
   - 仅承接紧急修复，不承接新特性
2. 所有迁移任务直接在 `main` 推进
   - 每个 task 使用原子 commit
   - 每个 task 完成后执行全量门禁
3. 关键阶段打 tag（例如 `hono-phase1-done`）
   - 便于回滚定位

切换顺序建议：

- 在 `main` 按任务顺序推进迁移
- 每个阶段完成后做回归 + 打 tag
- 需要回滚时回到最近稳定 tag，`legacy/*` 作为最终兜底

## 10. 风险与决策点

1. Better Auth 会话模型与现有 token 模型差异较大，前端改动不可避免
2. D1 SQL 能力与 Postgres 差异会影响少量复杂查询写法
3. 若要“零停机切换”，需要双写或短期只读窗口策略

需你确认的关键决策：

1. 迁移期是否保留旧 `/auth/*` 接口兼容层
2. 生产环境切换策略：一次性切换 vs 灰度
3. 历史数据迁移窗口与回滚预案

## 11. 验收标准（DoD）

- 功能：现有主链路功能等价
- 契约：核心接口回归测试全通过
- 质量：`lint + typecheck + test` 全绿
- 部署：Cloudflare 环境可一键发布并可回滚
