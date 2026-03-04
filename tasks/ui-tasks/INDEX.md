# UI Tasks INDEX

> 状态说明：`todo` / `in-progress` / `done` / `blocked`

| Task ID | 标题 | 状态 | 前置依赖 | paired_with | contract_version | sync_point |
|---|---|---|---|---|---|---|
| UI-001 | 前端技术栈冻结与工程约定 | done | - | - | - | SP-STACK |
| UI-002 | 前端工程初始化与测试基线 | done | UI-001 | API-002 | `docs/contracts/v0.0-bootstrap.yaml` | SP-001 |
| UI-003 | AppShell 与四 Tab 占位路由 | done | UI-002 | - | N/A（纯前端结构） | SP-UI-001 |
| UI-004 | 首页主路径、统计卡片与空状态 | done | UI-003 | API-010 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-005 |
| UI-005 | 记录页输入与“生成英文”流程 | done | UI-003 | API-007A | `docs/contracts/v0.3.5-record-generate.yaml` | SP-0035 |
| UI-006 | 记录页保存反馈与分组选择弹窗 | done | UI-005 | API-008, API-009 | `docs/contracts/v0.4-record-save-agent.yaml` | SP-004 |
| UI-007 | 复习 Deck 列表页 | done | UI-003 | API-010 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-005 |
| UI-008 | 复习 Session 与总结页状态流 | done | UI-007 | API-011 | `docs/contracts/v0.5-review-flow-fsrs.yaml` | SP-006 |
| UI-009 | 卡片组页列表与创建组弹窗 | done | UI-003 | API-005 | `docs/contracts/v0.2-deck-basic.yaml` | SP-003 |
| UI-010 | 组内卡片编辑/移动/删除交互 | done | UI-009 | API-006, API-007 | `docs/contracts/v0.3-card-management.yaml` | SP-007 |
| UI-011 | 登录注册页与头像下拉菜单 | done | UI-003 | API-004 | `docs/contracts/v0.1-auth-basic.yaml` | SP-002 |
| UI-012 | 视觉回归与响应式验收（含 iPhone 13） | done | UI-004, UI-006, UI-008, UI-010, UI-011 | API-012 | N/A（验收任务） | SP-FINAL |
| UI-013 | 首页昵称/洞察与复习总结接口接入 | done | UI-012 | API-016, API-017 | `docs/contracts/v0.5-review-flow-fsrs.yaml` + `docs/contracts/v0.6-dashboard.yaml` | SP-UI-DASHBOARD-REVIEW-SUMMARY |
| UI-014 | 全局滚动条样式与桌面端 viewport 布局 | done | UI-013 | - | N/A | SP-UI-SCROLL |
| UI-015 | Token 自动刷新与 401 跳转登录 | done | UI-014 | - | `docs/contracts/v0.1-auth-basic.yaml` | SP-UI-AUTH-REFRESH |
| UI-016 | 手机端”我的”Tab 与个人中心页 | done | UI-015 | - | `docs/contracts/v0.1-auth-basic.yaml` | SP-UI-ME-TAB |
| UI-017 | 记录页 textarea 自动增长与手动分组保存（前端） | done | UI-016, API-026 | API-026 | `docs/contracts/v0.7-record-save-manual.yaml` | SP-UI-RECORD-SAVE |
| UI-018 | 卡片组页卡片内容截断与详情弹窗 | done | UI-016 | - | N/A | SP-UI-CARD-TRUNCATE |
| UI-019 | 卡片组删除功能落地 | done | UI-018 | - | `docs/contracts/v0.2.1-deck-delete.yaml` | SP-UI-DECK-DELETE |
