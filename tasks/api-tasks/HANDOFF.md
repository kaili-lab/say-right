# API HANDOFF

## 最近一次交接

- 当前阶段：API-014 已完成，首页概览聚合接口已落地
- 本次变更：新增 `GET /dashboard/home-summary`，前端首页可移除静态示例数据
- 关键产出：`backend/app/dashboard/service.py`、`backend/app/dashboard/api.py`、`backend/tests/integration/test_dashboard_api.py`
- 可追溯证据：`pytest -q tests/integration/test_dashboard_api.py`（2 passed）；`make -C backend check`（73 passed + lint/typecheck passed）
- 下一步建议：把首页问候语与学习统计口径进一步对齐产品定义（如“学习天数”的精确定义与持久化来源）。
