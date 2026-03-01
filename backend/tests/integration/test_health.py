"""健康检查接口的集成测试。"""

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_get_health_returns_ok() -> None:
    """`GET /health` 应返回 200 和固定响应体。"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
