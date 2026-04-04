# UI-034 landing page 路由与语言切换测试

## 目标

- 为公开页路由拆分、登录态分流和语言切换补齐测试，确保 landing page 改造有稳定回归面。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `docs/React项目固定流程.md`
- `frontend/src/App.test.tsx`
- `frontend/src/routing.test.tsx`
- `frontend/src/auth-ui.test.tsx`
- `tasks/ui-tasks/task-ui-028-public-landing-route-split.md`
- `tasks/ui-tasks/task-ui-029-landing-bilingual-copy-and-locale-toggle.md`
- `tasks/ui-tasks/task-ui-033-auth-entry-coherence.md`

## previous_task_output（上一个任务关键产出摘要）

- landing page 改造已完成主要交互。
- 公开页、认证页、受保护页的边界变多，需要单独的回归任务兜底。

## skill_required

- `-`

## 前置依赖

- `UI-033`

## paired_with

- `-`

## contract_version

- `N/A（前端路由与公开页状态测试）`

## sync_point

- `SP-UI-LANDING-TESTS`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: N/A
- strategy: N/A
- rollback_plan: N/A

## 范围

1. 新增或更新以下测试：
   - landing page 渲染测试
   - 语言切换测试
   - 路由分流测试
   - 认证成功跳转测试
2. 关键场景至少覆盖：
   - 未登录访问 `/`
   - 未登录访问 `/app`
   - 已登录访问 `/`
   - 已登录访问 `/auth/login`
   - 浏览器语言为英文时的默认文案
3. 命名与断言要尽量面向行为，而不是实现细节

## 不在范围

- Playwright 视觉截图
- 真实后端联调

## 子步骤（执行清单）

1. 先写失败测试（Red）：公开/私有路由、登录态分流、语言切换恢复。
2. 最小补齐测试文件与辅助方法（Green）。
3. 收敛重复断言与测试夹具（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `unit`
- `integration`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- landing page 关键路由与语言切换均有测试覆盖。
- 公开页改造不会轻易被后续路由调整破坏。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 新增测试文件：
  - `frontend/src/landing-page.test.tsx`（根路由展示、语言切换、登录态 CTA）
  - `frontend/src/landing-locale.test.ts`（语言归一化与持久化）
- 更新既有路由测试：
  - `frontend/src/routing.test.tsx`、`frontend/src/App.test.tsx` 等将业务首页入口统一到 `/app`。
- 路由与语言切换链路的基础回归已形成，后续路由重构会被测试及时捕获。
