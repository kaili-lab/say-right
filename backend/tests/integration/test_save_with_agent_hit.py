"""save-with-agent（命中已有组）集成测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> TestClient:
    """创建隔离应用实例。"""
    return TestClient(create_app())


def _register_and_login(client: TestClient, email: str) -> str:
    client.post("/auth/register", json={"email": email, "password": "Passw0rd!"})
    login_response = client.post("/auth/login", json={"email": email, "password": "Passw0rd!"})
    return login_response.json()["access_token"]


def _create_deck(client: TestClient, token: str, name: str) -> str:
    response = client.post(
        "/decks",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": name},
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_save_with_agent_hits_existing_deck_and_creates_card() -> None:
    """Agent 命中已有组时应直接建卡并返回契约字段。"""
    client = build_client()
    token = _register_and_login(client, "save-hit@example.com")
    deck_id = _create_deck(client, token, "Travel")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "旅行时我想问路",
            "generated_text": "I want to ask for directions while traveling.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert isinstance(body["card_id"], str)
    assert body["deck_id"] == deck_id
    assert body["deck_name"] == "Travel"
    assert body["deck_created"] is False
    assert body["fallback_used"] is False


def test_save_with_agent_validation_error_returns_422() -> None:
    """请求参数非法时应返回 422。"""
    client = build_client()
    token = _register_and_login(client, "save-hit-422@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "   ",
            "generated_text": "Hello",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 422


def test_save_with_agent_no_hit_creates_new_deck_after_stage_two() -> None:
    """未命中分支在后续阶段应自动建组并返回成功。"""
    client = build_client()
    token = _register_and_login(client, "save-hit-no-match@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天阳光很好",
            "generated_text": "The weather is nice today.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["deck_created"] is True
    assert body["fallback_used"] is False


def test_save_with_agent_requires_authentication() -> None:
    """未认证请求应返回 401。"""
    client = build_client()

    response = client.post(
        "/records/save-with-agent",
        json={
            "source_text": "旅行时我想问路",
            "generated_text": "I want to ask for directions while traveling.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 401
