"""Deck API 集成测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> TestClient:
    """创建隔离应用实例，避免跨用例污染。"""
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


def test_get_decks_returns_default_deck() -> None:
    """注册并登录后，获取 deck 列表应至少包含默认组。"""
    client = build_client()
    access_token = _register_and_login(client, "deck-list@example.com")

    response = client.get("/decks", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert body[0]["is_default"] is True
    assert body[0]["new_count"] == 0
    assert body[0]["learning_count"] == 0
    assert body[0]["due_count"] == 0


def test_create_deck_success_and_duplicate_name_conflict() -> None:
    """创建 deck 成功，重复名称应返回 409。"""
    client = build_client()
    access_token = _register_and_login(client, "deck-create@example.com")

    created = client.post(
        "/decks",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"name": "Travel"},
    )
    duplicated = client.post(
        "/decks",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"name": "travel"},
    )

    assert created.status_code == 201
    assert created.json()["name"] == "Travel"
    assert created.json()["is_default"] is False
    assert duplicated.status_code == 409


def test_create_deck_validation_error_returns_422() -> None:
    """非法名称应返回 422。"""
    client = build_client()
    access_token = _register_and_login(client, "deck-validate@example.com")

    response = client.post(
        "/decks",
        headers={"Authorization": f"Bearer {access_token}"},
        json={"name": "   "},
    )

    assert response.status_code == 422


def test_deck_api_requires_authentication() -> None:
    """未提供 token 时访问 deck API 应返回 401。"""
    client = build_client()

    list_response = client.get("/decks")
    create_response = client.post("/decks", json={"name": "Travel"})

    assert list_response.status_code == 401
    assert create_response.status_code == 401
