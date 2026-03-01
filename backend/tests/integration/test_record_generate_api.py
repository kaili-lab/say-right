"""记录页英文生成 API 集成测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> TestClient:
    """创建隔离应用实例，避免测试间状态污染。"""
    return TestClient(create_app())


def _register_and_login(client: TestClient, email: str) -> str:
    client.post(
        "/auth/register",
        json={"email": email, "password": "Passw0rd!"},
    )
    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "Passw0rd!"},
    )
    return login_response.json()["access_token"]


def test_generate_record_success_returns_contract_body() -> None:
    """生成英文成功时应返回契约字段。"""
    client = build_client()
    token = _register_and_login(client, "record-generate@example.com")

    response = client.post(
        "/records/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "你好",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["generated_text"] == "Hello."
    assert body["model_hint"] == "stub:deterministic-v1"
    assert isinstance(body["trace_id"], str)
    assert len(body["trace_id"]) >= 8


def test_generate_record_validation_error_returns_422() -> None:
    """请求参数非法时应返回 422。"""
    client = build_client()
    token = _register_and_login(client, "record-generate-422@example.com")

    response = client.post(
        "/records/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "   ",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 422


def test_generate_record_unavailable_returns_503() -> None:
    """模型不可用场景应返回 503。"""
    client = build_client()
    token = _register_and_login(client, "record-generate-503@example.com")

    response = client.post(
        "/records/generate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "__FAIL_STUB__",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 503


def test_generate_record_requires_authentication() -> None:
    """未认证请求应返回 401。"""
    client = build_client()

    response = client.post(
        "/records/generate",
        json={
            "source_text": "你好",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 401
