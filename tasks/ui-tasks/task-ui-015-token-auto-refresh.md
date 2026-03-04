# UI-015 Token 自动刷新与 401 跳转登录

## 目标

- access token 过期时自动使用 refresh token 刷新并重试原请求
- refresh token 失效或缺失时，清理会话并跳转登录页
- 前端 API 访问层统一接入 `fetchWithAuth`

## context_files（AI 开始前必读）

- `docs/需要改进的点和计划.md`（问题 7）
- `frontend/src/pages/authApi.ts`
- `frontend/src/pages/homeApi.ts`
- `frontend/src/pages/recordApi.ts`
- `frontend/src/pages/decksApi.ts`
- `frontend/src/pages/reviewApi.ts`
- `backend/app/auth/api.py`
- `docs/contracts/v0.1-auth-basic.yaml`

## previous_task_output（上个任务关键产出摘要）

- UI-014 已完成滚动与 viewport 样式改造。
- 当前 API 请求均直接调用 `fetch`，401 时仅抛错。
- 后端刷新接口为 `POST /auth/refresh`，通过 `Authorization: Bearer <refresh_token>` 传参。

## skill_required

- `vercel-react-best-practices`

## 前置依赖

- `UI-014`

## paired_with

- 无（后端接口已完成）

## contract_version

- `docs/contracts/v0.1-auth-basic.yaml`

## sync_point

- `SP-UI-AUTH-REFRESH`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands: 无

## 范围

1. 在 `authApi.ts` 新增 `refreshAccessToken()`：
   - 无 refresh token：立即 `clearSession()` + 跳转登录
   - 有 refresh token：调用 `POST /auth/refresh`，成功后更新 access token
   - refresh 返回 401：`clearSession()` + 跳转登录
2. 在 `authApi.ts` 新增 `fetchWithAuth()`：
   - 请求若返回 401，自动刷新并仅重试一次
   - 避免无限重试（refresh 请求自身失败时直接退出）
   - 并发 401 场景下使用 single-flight，确保只触发一次 refresh
3. `homeApi/recordApi/decksApi/reviewApi` 全部切换到 `fetchWithAuth`

## 不在范围

- token 提前刷新
- refresh token rotation
- 修改后端过期时间配置

## 子步骤（执行清单）

1. 写失败测试（Red）：
   - 401->refresh 成功->原请求重试成功
   - refresh 401->清会话并跳登录
   - 无 refresh token->清会话并跳登录
   - 并发 401 仅一次 refresh
2. 实现 `refreshAccessToken` 与 `fetchWithAuth`（Green）
3. 改造各 API 模块统一接入
4. 补齐边界测试并回归
5. 运行全量测试并保留证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- access token 过期可自动刷新并完成重试
- refresh 失效/缺失时统一退出到登录页
- 并发 401 仅触发一次 refresh 请求
- 所有 API 模块统一通过 `fetchWithAuth` 鉴权
- 所有 test_commands 通过

## output_summary（任务完成后由 AI 填写）

