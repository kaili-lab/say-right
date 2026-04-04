# UI-036 landing page 文档与作品集叙事对齐

## 目标

- 将 README、showcase 文档和前端说明与新的公开入口及当前真实产品状态对齐，避免代码和对外叙事脱节。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `README.md`
- `README_CN.md`
- `showcase-say-right.md`
- `frontend/README.md`
- `frontend/tests/e2e/critical-path.spec.ts`
- `tasks/ui-tasks/task-ui-035-landing-visual-regression-and-responsive-acceptance.md`

## previous_task_output（上一个任务关键产出摘要）

- landing page 已具备对外展示能力。
- 现有 README / showcase / 局部测试描述仍保留旧的根路径与 `save-with-agent` 叙事，需要统一口径。

## skill_required

- `-`

## 前置依赖

- `UI-035`

## paired_with

- `-`

## contract_version

- `N/A（文档对齐任务）`

## sync_point

- `SP-UI-LANDING-DOCS`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 文档任务无额外上游依赖
- strategy: 以当前真实代码与新 landing page 为唯一事实来源
- rollback_plan: N/A

## 范围

1. 更新 `README.md` / `README_CN.md`
2. 更新 `showcase-say-right.md`
3. 更新 `frontend/README.md`
4. 清理与当前实现不一致的对外叙事，包括但不限于：
   - 根路径仍是登录后首页
   - `save-with-agent` 仍是主保存路径
   - `Group Agent` 仍是当前最强卖点
5. 如测试描述中存在旧流程文本，顺手对齐

## 不在范围

- 新增后端功能
- 新增营销页面
- 真实用户数据统计

## 子步骤（执行清单）

1. 先列出文档与代码的差异点（Red）。
2. 最小更新 README / showcase / 前端说明（Green）。
3. 复查对外卖点、路由和主链路叙事是否一致（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `integration`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`

## DoD

- 公开文档与当前代码实现一致。
- 公开卖点不夸大尚未成为主路径的能力。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 文档叙事已与代码实现对齐：
  - `frontend/README.md`：明确 `/` 为公开 landing，`/app` 为登录后首页；记录保存主链路为 `POST /records/save`。
  - `README.md` / `README_CN.md`：更新公开入口叙事、功能描述与架构说明，不再把 Group Agent 作为当前主路径卖点。
  - `showcase-say-right.md`：展示建议改为“表达生成 + 复习闭环 + landing 展示能力”，并补充 `/` 与 `/app` 的演示路径说明。
- 测试文本对齐：
  - 补充 `frontend/src/routing.test.tsx` 登录态访问 `/auth/login` 的重定向断言（应进入 `/app`）。
- 已执行并通过：
  - `cd frontend && pnpm test`
  - `cd frontend && pnpm test:visual`
  - `cd frontend && pnpm lint`
  - `cd frontend && pnpm typecheck`
