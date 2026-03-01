# UI-002 前端工程初始化与测试基线

## 目标

- 建立可运行的 React 前端工程与测试基线，确保后续页面任务可持续迭代。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/task-ui-001-frontend-stack-freeze.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/INDEX.md`
- `tasks/任务拆分说明-final.md`

## previous_task_output（上个任务关键产出摘要）

- UI-001 冻结前端技术栈与统一命令口径。

## skill_required

- `vercel-react-best-practices`
- `tailwind-css`

## 前置依赖

- `UI-001`

## paired_with

- `API-002`

## contract_version

- `docs/contracts/v0.0-bootstrap.yaml`

## sync_point

- `SP-001`

## 范围

- 初始化工程目录与脚本
- 建立测试运行基线
- 提供最小入口页（应用已启动占位）

## 不在范围

- 四 Tab 路由
- 业务页面与业务状态

## 子步骤（执行清单）

1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试：入口页面渲染“应用已启动”标识（Red）
3. 最小实现入口页面使测试通过（Green）
4. 配置 lint/typecheck/test 脚本并可执行
5. 运行全量测试并记录证据

## test_scope

- `unit`
- `integration`

## test_commands

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`

## DoD

- 本地开发环境可启动
- 测试、lint、typecheck 命令可执行
- 全量测试无回归（不只是本任务的测试）
- 保留可追溯证据（命令、退出码、关键通过行）

## output_summary（任务完成后由 AI 填写）

- （待填写）
