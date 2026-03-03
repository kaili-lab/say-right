# AI 协作开发防坑指南 — 性能篇

> 来源：say-right 项目首页/复习/卡片组 Tab 加载 4-5 秒问题的复盘总结。

## 问题本质

AI 生成的每一块代码**单独看都是对的** — repository 模式正确、连接池用法正确、service 层分层正确。但组装在一起就出了性能问题：

- 每个 repository 方法独立拿连接、独立查询 → 一个请求串行 6 次数据库往返
- ChatGPT 建议加连接池 + health check → 治标不治本，还加了新开销
- service 层调 4 个 repository → 没人从"一个请求到底几次网络往返"的角度审视

**AI 擅长写"局部正确"的代码，但缺乏"端到端系统思维"。**

---

## 实践建议

### 1. 在项目规范里写明性能约束

AI 不会主动考虑性能，除非你告诉它。在 CLAUDE.md 或项目规范中明确写出：

```markdown
## 性能约束
- 数据库在 Neon (ap-southeast-1)，单次 RTT ~300ms
- 任何 API 端点的数据库查询不超过 2 次（含 auth）
- 禁止在应用层做可以在 SQL 层完成的聚合
- 读操作使用 autocommit，不开事务
```

有了约束条件，AI 生成的代码就不会是"教科书正确但性能灾难"。

### 2. 第一个接口接通后立即加计时中间件

不需要复杂的 APM 工具，一个中间件就够：

```python
@app.middleware("http")
async def timing_middleware(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    logger.info(f"{request.method} {request.url.path} → {elapsed:.0f}ms")
    return response
```

如果第一个接口就 1.5 秒，你立刻就知道有问题，不会等到三个 Tab 都写完了才发现。

### 3. AI 写完 service 方法后追问一个关键问题

> "这个方法总共发起几次数据库查询？每次查询的网络往返成本是多少？有没有办法合并？"

AI 其实能分析出来，但它不会主动去想 — 你得触发它。这比事后诊断高效得多。

### 4. 对 AI 的"优化建议"保持警惕

AI 给优化建议时有个倾向：**倾向于"加东西"而不是"改设计"** — 加缓存、加连接池、加索引，而不是重新审视查询模式。

收到 AI 的优化建议时，问自己：

- 这个方案治的是根因还是症状？
- 加了之后，原来的 6 次查询变成几次了？如果还是 6 次，那就没治到根上。

### 5. 技术选型切换时让 AI 输出"代价清单"

切换技术栈时（如从 Hono+Drizzle 到 FastAPI+psycopg），让 AI 列出：

> "这两套技术栈在连接管理、事务模型、部署拓扑上的核心差异是什么？我需要额外处理哪些事情？"

在开始前就知道需要管哪些事，而不是踩坑后才发现。

---

## 一句话总结

**AI vibe coding 的核心风险不是代码质量，而是缺少系统级审视。** 每写完一个功能，花 30 秒问"这个请求端到端走了几次网络？"，就能避免大部分性能问题。
