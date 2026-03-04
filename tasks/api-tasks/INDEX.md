# API Tasks INDEX

> 状态说明：`todo` / `in-progress` / `done` / `blocked`

| Task ID | 标题 | 状态 | 前置依赖 | paired_with | contract_version | sync_point |
|---|---|---|---|---|---|---|
| API-001 | 后端技术栈冻结与工程约定 | done | - | - | - | SP-STACK |
| API-002 | FastAPI 骨架与健康检查 | done | API-001 | UI-002 | `docs/contracts/v0.0-bootstrap.yaml` | SP-001 |
| API-003 | 认证领域模型与密码/令牌工具 | done | API-002 | - | `docs/contracts/v0.1-auth-basic.yaml` | SP-API-001 |
| API-004 | 注册/登录/刷新/当前用户接口 | done | API-003 | UI-011 | `docs/contracts/v0.1-auth-basic.yaml` | SP-002 |
| API-005 | Deck 列表与创建（含默认组存在性） | done | API-004 | UI-009 | `docs/contracts/v0.2-deck-basic.yaml` | SP-003 |
| API-006 | Deck 删除约束与校验规则 | done | API-005 | UI-010 | `docs/contracts/v0.2-deck-basic.yaml` | SP-007 |
| API-007 | Card 查询/编辑/删除与跨组移动 | done | API-005 | UI-010 | `docs/contracts/v0.3-card-management.yaml` | SP-007 |
| API-007A | 记录生成英文（LLM stub） | done | API-007 | UI-005 | `docs/contracts/v0.3.5-record-generate.yaml` | SP-0035 |
| API-008 | save-with-agent（命中已有组） | done | API-005, API-007 | UI-006 | `docs/contracts/v0.4-record-save-agent.yaml` | SP-004 |
| API-009 | save-with-agent（未命中建组 + 默认组兜底） | done | API-008 | UI-006 | `docs/contracts/v0.4-record-save-agent.yaml` | SP-004 |
| API-010 | 复习 Deck 列表与到期统计查询 | done | API-007 | UI-004, UI-007 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-005 |
| API-011 | Session 拉取、AI 评分与评级提交（FSRS） | done | API-010 | UI-008 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-006 |
| API-012 | 契约回归与关键链路集成测试收口 | done | API-004, API-009, API-011 | UI-012 | `docs/contracts/v0.1-auth-basic.yaml` + `docs/contracts/v0.4-record-save-agent.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-FINAL |
| API-013 | Neon Schema 同步基线 | done | API-001 | - | - | SP-DB-BASELINE |
| API-014 | 首页概览聚合接口（去静态数据） | done | API-012 | - | - | SP-HOME-DASHBOARD |
| API-015 | 运行态仓储切换（InMemory -> PostgreSQL） | done | API-013, API-014 | - | - | SP-STORAGE-CUTOVER |
| API-016 | 复习日志持久化、会话总结与每日上限 | done | API-015 | UI-013 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-REVIEW-PERSISTENCE |
| API-017 | Dashboard 洞察、昵称/登出、CORS 环境化与契约补齐 | done | API-016 | UI-013 | `docs/contracts/v0.6-dashboard.yaml` | SP-DASHBOARD-IDENTITY |
| API-018 | LangChain LLM 适配层与三处 Stub 替换 | done | API-017 | - | `docs/contracts/v0.3.5-record-generate.yaml` + `docs/contracts/v0.4-record-save-agent.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-LLM-REAL |
| API-019 | 异步数据库仓储迁移评估（架构债跟踪） | todo | API-018 | - | - | SP-DB-ASYNC |
| API-020 | 密码找回（v2 Backlog） | todo | - | UI-020（待创建） | - | SP-AUTH-RESET |
| API-021 | 数据库连接池化 | done | API-015 | - | - | SP-CONNECTION-POOL |
| API-022 | DB读路径优化（health check删除/retry全覆盖/读autocommit/计时中间件） | done | API-021 | - | - | SP-PERF-PHASE0 |
| API-023 | 查询次数精简与鉴权缓存（惰性ensure/去重复user/auth TTL缓存） | done | API-022 | - | - | SP-PERF-PHASE0 |
| API-024 | 首页聚合改SQL计算与索引补齐 | done | API-023 | - | - | SP-PERF-PHASE1 |
| API-025 | Deck/Review首屏查询收敛与性能基准验收 | done | API-024 | - | - | SP-PERF-PHASE1 |
| API-026 | 新增记录页手动分组保存接口 `POST /records/save` | todo | API-009 | UI-017 | `docs/contracts/v0.7-record-save-manual.yaml` | SP-API-RECORD-SAVE |
