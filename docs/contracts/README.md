# 接口契约目录

- 本目录存放任务文档 `contract_version` 引用的实体契约文件。
- 命名建议：`v<主版本>.<次版本>-<主题>.yaml`。
- 每次接口变更需更新版本文件，并在对应 task 的 `output_summary` 记录变更点。

## 当前版本草案

- `v0.0-bootstrap.yaml`：健康检查与服务探活
- `v0.1-auth-basic.yaml`：注册/登录/刷新令牌/当前用户
- `v0.2-deck-basic.yaml`：卡片组列表与创建（含默认组约束）
- `v0.2.1-deck-delete.yaml`：卡片组删除约束（默认组/非空组）
- `v0.3-card-management.yaml`：卡片查询/编辑/删除与移动分组
- `v0.3.5-record-generate.yaml`：记录页生成英文
- `v0.4-record-save-agent.yaml`：记录保存 + Group Agent 编排
- `v0.5-review-flow-fsrs.yaml`：复习拉取、AI 评分、评级提交（FSRS）
- `v0.6-dashboard.yaml`：首页概览（显示名、洞察与学习统计）
- `v0.7-record-save-manual.yaml`：记录页手动选分组保存卡片
- `v0.8-auth-session.yaml`：Better Auth 会话鉴权（Hono 迁移）
