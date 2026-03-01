"""save-with-agent（未命中建组 + 默认组兜底）集成测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> TestClient:
    """创建隔离应用实例。"""
    return TestClient(create_app())


def _register_and_login(client: TestClient, email: str) -> tuple[str, str]:
    client.post("/auth/register", json={"email": email, "password": "Passw0rd!"})
    login_response = client.post("/auth/login", json={"email": email, "password": "Passw0rd!"})
    token = login_response.json()["access_token"]
    decks_response = client.get("/decks", headers={"Authorization": f"Bearer {token}"})
    default_deck_id = decks_response.json()[0]["id"]
    return token, default_deck_id


def test_save_with_agent_no_hit_creates_deck() -> None:
    """未命中已有组时应自动建组并创建卡片。"""
    client = build_client()
    token, _ = _register_and_login(client, "save-fallback-create@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天复习一个新表达",
            "generated_text": "I am reviewing a new expression today.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["deck_created"] is True
    assert body["fallback_used"] is False


def test_save_with_agent_agent_unavailable_fallback_default_deck() -> None:
    """Agent 不可用时应回退默认组并仍返回成功。"""
    client = build_client()
    token, default_deck_id = _register_and_login(client, "save-fallback-agent-error@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "__AGENT_ERROR__",
            "generated_text": "trigger unavailable",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["deck_id"] == default_deck_id
    assert body["deck_created"] is False
    assert body["fallback_used"] is True


def test_save_with_agent_invalid_deck_name_fallback_default_deck() -> None:
    """Agent 返回非法组名时应回退默认组。"""
    client = build_client()
    token, default_deck_id = _register_and_login(client, "save-fallback-invalid-deck@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "__INVALID_DECK_NAME__",
            "generated_text": "invalid deck",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["deck_id"] == default_deck_id
    assert body["deck_created"] is False
    assert body["fallback_used"] is True


def test_save_with_agent_repeated_auto_group_does_not_duplicate() -> None:
    """同一未命中输入重复保存时，第二次应复用已创建分组。"""
    client = build_client()
    token, _ = _register_and_login(client, "save-fallback-duplicate@example.com")
    payload = {
        "source_text": "同一条记录重复保存",
        "generated_text": "Save the same sentence twice.",
        "source_lang": "zh",
        "target_lang": "en",
    }

    first = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )
    second = client.post(
        "/records/save-with-agent",
        headers={"Authorization": f"Bearer {token}"},
        json=payload,
    )

    assert first.status_code == 201
    assert second.status_code == 201
    first_body = first.json()
    second_body = second.json()
    assert first_body["deck_created"] is True
    assert second_body["deck_created"] is False
    assert first_body["deck_id"] == second_body["deck_id"]
