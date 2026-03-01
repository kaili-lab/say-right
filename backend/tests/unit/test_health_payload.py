from app.main import build_health_payload


def test_build_health_payload_returns_ok_status() -> None:
    payload = build_health_payload()
    assert payload["status"] == "ok"
