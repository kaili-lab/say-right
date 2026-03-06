# SayRight · AI 英语表达教练

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=flat&logo=hono&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat&logo=cloudflare&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=flat&logo=drizzle&logoColor=black)

> 用你的中文想法，学地道英语表达 — 再用间隔重复把它记住。

[🔗 在线体验](#demo) · [English](./README.md)

---

<!-- SCREENSHOT: 录制 5–8 秒 GIF，展示核心流程：在输入框输入中文 → 点击"生成英文" → AI 返回地道英文表达 → 点击"保存" → 卡片自动归入卡片组并弹出提示。保存至 public/demo.gif 后替换此注释为：![Demo](./public/demo.gif) -->
> **截图待补充** — 部署后添加。

---

## ✨ 核心亮点

**1. 市面上没有的完整学习闭环**
输入中文 → AI 改写为地道英文 → 保存为闪卡 → FSRS 间隔重复复习。大多数词汇 App 止步于单词列表，SayRight 打通了从"表达"到"记忆"的完整链路。

**2. Group Agent：AI 自动整理卡片**
保存卡片时，AI Agent 读取已有卡片组并判断归属 — 没有合适的组就自动新建一个。无需手动打标签，卡片自己找到家。

**3. FSRS + AI 评分复习**
复习时可选输入自己的英文，系统给出 0–100 分并映射到 Anki 四档（Again / Hard / Good / Easy）。FSRS 算法根据实际记忆保持率调度下次复习时间，而非固定间隔。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、TypeScript、Tailwind CSS v4、Vite |
| 状态与数据 | TanStack Query、React Hook Form、Zod |
| 后端 | Hono on Cloudflare Workers |
| 数据库 | Cloudflare D1（SQLite）via Drizzle ORM |
| 认证 | better-auth（Session Cookie） |
| AI | Claude / GPT-4o（OpenAI 兼容协议） |

---

## 功能

- **记录** — 输入中文（上限 200 字），生成地道英文，支持编辑后保存
- **自动归组** — Group Agent 将卡片分配到最合适的卡片组，必要时自动新建
- **复习** — FSRS 调度，四档手动评级，可选 AI 评分与改进建议
- **卡片组管理** — 按组查看卡片，支持跨组移动与删除空组
- **首页看板** — 今日待复习数量、最近卡片组、学习连续天数
- **响应式布局** — 手机端底部导航，桌面端顶部导航（暖橙主题）
- **Session 认证** — 基于 Cookie 的会话认证，多租户数据隔离

---

## 系统架构

```
┌─────────────────────────────────────────────┐
│  React 19 SPA（Vite）                       │
│  TanStack Query · React Hook Form · Zod     │
└──────────────────────┬──────────────────────┘
                       │ HTTP / JSON
┌──────────────────────▼──────────────────────┐
│  Hono  ·  Cloudflare Workers                │
│  better-auth  ·  Drizzle ORM                │
│  Group Agent（AI 编排）                     │
└──────────────────────┬──────────────────────┘
                       │
          ┌────────────▼────────────┐
          │  Cloudflare D1（SQLite）│
          └─────────────────────────┘
```

---

## 本地启动

### 前置要求

- Node.js 20+，pnpm
- Cloudflare 账号（用于 D1 和 Workers）
- Wrangler CLI：`pnpm install -g wrangler`

### 前端

```bash
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

### 后端

```bash
cd backend-hono
pnpm install

# 首次创建 D1 数据库
wrangler d1 create say-right
# 将 database_id 填入 wrangler.toml

# 执行迁移
wrangler d1 migrations apply say-right --local

# 启动本地开发服务器
pnpm dev          # http://localhost:8787
```

### 环境变量

在 `backend-hono/` 目录下复制 `.dev.vars.example` 为 `.dev.vars` 并填写：

```
BETTER_AUTH_SECRET=your_secret
LLM_MODE=deterministic
# 若切到 provider 模式，再补充下面两项：
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1   # 或任何 OpenAI 兼容端点
```

---

## 路线图

- [ ] 接入真实 LLM 生成英文 — API 契约已定义，Provider 待接入
- [ ] Group Agent 接入真实 AI — Stub 已完成，待连接 Provider
- [ ] 复习 AI 评分接入真实模型 — Stub 已完成，待连接
- [ ] 部署到 Cloudflare Workers + D1（生产环境）
- [ ] 语音输入：说中文 → 自动转文字 → 生成英文（v2）
- [ ] 发音练习：朗读英文 → AI 评估发音准确度（v2）

---

## 许可证

MIT

---

<a name="demo"></a>
> **在线 Demo 即将上线。** 部署到 Cloudflare Workers 后在此处添加链接。
