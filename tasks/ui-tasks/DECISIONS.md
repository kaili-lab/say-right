# UI DECISIONS

## 已决策（2026-03-01）

- 前端框架：`Vite + React + React Router`
- 包管理器：`pnpm`
- 样式体系：`Tailwind CSS + shadcn/ui`
- 通知组件：`Sonner`
- 表单方案：`React Hook Form + Zod + shadcn/ui Form`
- 客户端数据请求：`TanStack Query`
- 测试栈：`Vitest + React Testing Library + Playwright`

## 命令口径（统一）

- 开发：`pnpm dev`
- 单元/集成测试：`pnpm test`
- Lint：`pnpm lint`
- 类型检查：`pnpm typecheck`
- E2E：`pnpm test:e2e`
- 视觉回归：`pnpm test:visual`

## 决策说明

- 选择 Vite 是因为本项目是登录后 SPA 场景，不需要 SSR/SSG。
- 选择 Tailwind + shadcn/ui 可以最快复现已确认的 HTML 视觉基线，并保持组件一致性。
- Sonner 仅用于轻提示；阻断式确认使用 shadcn 的 Dialog/AlertDialog。
- 表单统一 RHF + Zod，降低校验重复代码并保证类型一致。
