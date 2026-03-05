# HONO-010 Hono 切换 Runbook（上线与回滚）

## 1. 切换目标

- 将生产流量从 FastAPI 版本切换到 `backend-hono`。
- 保证接口契约不变（`docs/contracts/` 全量回归通过）。
- 具备可在分钟级执行的回滚路径。

## 2. 切换前检查（必过）

1. 后端门禁
   - `cd backend-hono && pnpm check`
   - `make -C backend check`
2. 前端门禁
   - `cd frontend && pnpm test`
   - `cd frontend && pnpm lint && pnpm typecheck`
3. 数据迁移工具
   - `cd backend-hono && pnpm test -- migration`
4. 配置核对
   - Better Auth：`BETTER_AUTH_SECRET`、`BETTER_AUTH_URL`
   - D1：`D1_DATABASE_ID`、`D1_DATABASE_NAME`
   - LLM：`LLM_MODE`、`OPENAI_API_KEY/OPENAI_BASE_URL`（或 deterministic）

## 3. 上线步骤

1. 进入维护窗口（建议 10~20 分钟），暂停高风险写入入口（record save / review rate）。
2. 执行数据迁移（参考 `docs/HONO-009-Postgres-to-D1迁移手册.md`）：
   - 导出 Postgres 快照
   - 导入 D1
   - 执行校验并确认 `ok=true`
3. 部署 `backend-hono` 到目标环境（保持与前端同源 cookie 策略）。
4. 发布前端（确保 API 基地址与会话模式指向 Hono 版本）。
5. 进行 smoke 验证：
   - 鉴权：注册/登录/读取 session
   - 记录链路：`/records/generate`、`/records/save`
   - 复习链路：`/review/decks`、`/review/session/*`
   - 仪表盘：`/dashboard/home-summary`
6. 开启全量流量。

## 4. 监控与验收

- 错误率：
  - 5xx 总体错误率
  - `401/422/503` 占比异常波动
- 性能：
  - 关键接口 P95（record/review/dashboard）
- 业务：
  - 新增卡片写入成功率
  - review 评级日志写入成功率
  - dashboard 指标更新延迟

验收标准：

- 连续 30 分钟无持续性 5xx 异常
- 关键链路成功率与切换前基线一致（允许短时抖动）

## 5. 回滚步骤

触发条件（任一满足即回滚）：

- 持续 5 分钟以上关键接口 5xx 激增
- 鉴权会话异常导致大面积不可用
- 数据写入一致性异常（review_logs/cards/decks 计数错位）

回滚流程：

1. 立即将流量切回 FastAPI 基线（`legacy/fastapi-main-2026-03-05` 对应部署版本）。
2. 前端回滚到切换前稳定构建（避免请求到新接口行为差异）。
3. 若已写入新 D1 数据：
   - 保留故障现场快照用于排查
   - 恢复切换前 D1 备份（如有）
4. 发布事故记录（时间线、影响面、根因、修复计划）。

## 6. 切换后收口

1. 固化本次迁移校验报告与门禁日志（归档到变更记录）。
2. 关闭维护窗口，恢复全部写入入口。
3. 将本 Runbook 与实际执行偏差回填到任务文档，作为下一次发布模板。
