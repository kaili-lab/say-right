# backend 开发启动说明（Python/FastAPI 新手向）

这份文档专门写给第一次接触 Python + FastAPI 的同学，目标是：
- 知道如何一条命令启动后端
- 知道为什么这样启动
- 知道虚拟环境（venv）自动激活/手动激活各怎么做

## 1. 当前项目约定（先看这个）

- 仓库是 monorepo：前后端分目录，后端在 `backend/`
- Python 虚拟环境放在仓库根：`../.venv`（从 `backend/` 看）
- 环境变量用：`backend/.env`（本地）+ `backend/.env.example`（模板）
- 当前阶段默认共用一套数据库连接（后续任务继续沿用）

## 2. 一分钟启动（推荐）

1) 确认你在仓库根创建了虚拟环境并安装依赖（首次一次）：

```bash
python3 -m venv .venv
./.venv/bin/pip install -e "./backend[dev]"
```

2) 准备环境变量（首次一次）：

```bash
cp backend/.env.example backend/.env
```

3) 启动后端（每次开发）：

```bash
make -C backend dev
```

启动后访问：`http://127.0.0.1:8000/health`

## 3. 为什么推荐 `make -C backend dev`

因为它把“手动三步”封装成了一个命令：
- 通过 `uvicorn --env-file .env` 自动加载 `backend/.env`
- 使用固定虚拟环境里的 `uvicorn`（`../.venv/bin/uvicorn`）
- 进入 `--reload` 开发模式

这和 Node.js 里 `npm run dev` 的体验是同一个思路：
- 不要求你每次手动 `source venv`
- 不依赖系统全局 Python 包
- 团队里每个人启动方式一致，可复现

## 4. 手动启动方式（理解原理用）

如果你想看“拆开后”的真实步骤：

```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload --env-file .env
```

上面 3 行就是 `make dev` 做的事情，只是手动版。

## 5. venv 自动激活（你现在的场景）

你提到已安装 venv 的 Codex 插件，会自动激活新 shell。这个是可行的。

### 5.1 如何确认“已自动激活”

在 `backend/` 或仓库根执行：

```bash
echo "$VIRTUAL_ENV"
which python
python -V
```

如果自动激活成功，`$VIRTUAL_ENV` 会指向项目 `.venv`，`which python` 也会落在 `.venv/bin/python`。

### 5.2 自动激活后还需要手动 `source` 吗？

- 如果你用 `make -C backend dev`：**不需要**。
- 如果你手动 `uvicorn ...`：通常也不需要，但前提是确认当前 shell 已激活正确 venv。

### 5.3 为什么仍然保留 `../.venv/bin/...` 的写法

因为这是“最不依赖 shell 状态”的写法：
- 不管插件有没有生效，命令都可跑
- CI/脚本环境更稳定
- 避免“我本地好好的，别人机器不行”的问题

## 6. 环境变量说明（`.env`）

`backend/.env.example` 中当前有：

- `APP_ENV`：环境标识（如 `dev`）
- `APP_STORAGE_BACKEND`：运行态存储后端（`memory` / `postgres`）
- `JWT_SECRET_KEY`：JWT 签名密钥（生产必须长随机串）
- `DATABASE_URL`：数据库连接串（当前阶段全任务共用）

### 6.1 存储后端如何生效

- `APP_STORAGE_BACKEND=postgres`：API 读写直接走 PostgreSQL（可持久化）
- `APP_STORAGE_BACKEND=memory`：API 读写走内存仓储（重启会丢失）
- 若未设置 `APP_STORAGE_BACKEND`，系统会自动判断：
  - 有 `DATABASE_URL` -> 使用 `postgres`
  - 无 `DATABASE_URL` -> 使用 `memory`

## 7.1 schema 同步到 Neon / PostgreSQL（新增）

虽然当前 API 运行态还在用内存仓储，但数据库结构已经提供了可执行同步命令，便于你先把 Neon 侧 schema 建好：

```bash
make -C backend db-sync
```

它会做两件事：
- 读取 `backend/.env` 里的 `DATABASE_URL`
- 执行 `backend/db/schema.sql`（`CREATE TABLE IF NOT EXISTS ...`，可重复执行）

> 若 `DATABASE_URL` 是 `postgresql+asyncpg://...`，脚本会自动转换为 `psycopg` 可识别的 `postgresql://...`。

建议：
- `.env.example` 提供模板并提交 Git
- `.env` 只放本地真实值，不提交

## 7. 常用命令（后端）

在仓库根执行：

```bash
make -C backend dev     # 启动开发服务
make -C backend test    # 运行后端测试
make -C backend lint    # Ruff 代码规范检查
make -C backend typecheck  # mypy 类型检查
make -C backend check   # 一键执行 test + lint + typecheck
make -C backend db-sync # 同步 schema 到 Neon/PostgreSQL
```

## 8. 常见问题

### Q1: `bash: .venv/bin/activate: No such file or directory`

原因：你在 `backend/` 下执行了 `source .venv/bin/activate`，但 `.venv` 在仓库根。  
正确命令是：`source ../.venv/bin/activate`

### Q2: 端口被占用（8000）

改端口启动：

```bash
../.venv/bin/uvicorn app.main:app --reload --port 8011
```

### Q3: 改了 `.env` 后没生效

`make dev` 会通过 `--env-file` 读取 `.env`，改完后重启服务即可。

### Q4: 前端请求后端报 405 Method Not Allowed（OPTIONS 请求）

这是 CORS 预检失败。前端（`localhost:5173`）与后端（`localhost:8000`）端口不同，属于跨域。浏览器会先发 OPTIONS 预检请求，后端必须配置 `CORSMiddleware` 才能正确响应。

当前已在 `app/main.py` 的 `create_app()` 中配置。如果部署到生产环境，需要把 `allow_origins` 改为实际域名。

---

如果你是 Java/Node.js 背景，可以把它类比为：
- `venv` ≈ 项目独立运行时（避免全局污染）
- `Makefile` 目标 ≈ `npm scripts` / Maven profile 快捷命令
- `.env` ≈ Spring/Node 的本地配置文件
