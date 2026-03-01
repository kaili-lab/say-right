"""健康检查 payload 的单元测试。"""

from app.main import build_health_payload


def test_build_health_payload_returns_ok_status() -> None:
    """应返回契约要求的固定状态值。"""
    payload = build_health_payload()
    assert payload["status"] == "ok"
