# backend

FastAPI 后端子项目。

## 快速入口

- 开发启动：`make dev`
- 运行测试：`make test`
- 代码规范检查：`make lint`
- 类型检查：`make typecheck`
- 一键质量检查：`make check`
- 同步 schema 到 Neon/PostgreSQL：`make db-sync`
- 健康检查：`GET /health`
- 首页概览：`GET /dashboard/home-summary`
- 运行态存储：`APP_STORAGE_BACKEND=postgres`（默认可由 `DATABASE_URL` 自动推断）

> 以上命令默认在 `backend/` 目录执行；若在仓库根执行，请使用 `make -C backend dev` / `make -C backend check`。

## 文档导航

- 详细开发/环境说明（含 venv 自动激活、.env、常见报错）：`backend/DEVELOPMENT.md`
- 环境变量模板：`backend/.env.example`
