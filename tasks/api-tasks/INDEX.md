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
| API-007A | 记录生成英文（LLM stub） | todo | API-007 | UI-005 | `docs/contracts/v0.3.5-record-generate.yaml` | SP-0035 |
| API-008 | save-with-agent（命中已有组） | todo | API-005, API-007 | UI-006 | `docs/contracts/v0.4-record-save-agent.yaml` | SP-004 |
| API-009 | save-with-agent（未命中建组 + 默认组兜底） | todo | API-008 | UI-006 | `docs/contracts/v0.4-record-save-agent.yaml` | SP-004 |
| API-010 | 复习 Deck 列表与到期统计查询 | todo | API-007 | UI-004, UI-007 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-005 |
| API-011 | Session 拉取、AI 评分与评级提交（FSRS） | todo | API-010 | UI-008 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-006 |
| API-012 | 契约回归与关键链路集成测试收口 | todo | API-004, API-009, API-011 | UI-012 | `docs/contracts/v0.1-auth-basic.yaml` + `docs/contracts/v0.4-record-save-agent.yaml` + `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-FINAL |
