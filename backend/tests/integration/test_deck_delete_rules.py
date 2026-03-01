"""Deck 删除规则集成测试。"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> tuple[TestClient, FastAPI]:
    """创建隔离应用实例，便于在测试中访问应用状态。"""
    app = create_app()
    return TestClient(app), app


def _register_and_login(client: TestClient, email: str) -> dict[str, str]:
    client.post(
        "/auth/register",
        json={"email": email, "password": "Passw0rd!"},
    )
    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "Passw0rd!"},
    )
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_deck(client: TestClient, headers: dict[str, str], name: str) -> dict[str, str | bool]:
    response = client.post("/decks", headers=headers, json={"name": name})
    assert response.status_code == 201
    return response.json()


def test_delete_default_deck_returns_409() -> None:
    """默认组不可删除。"""
    client, _ = build_client()
    headers = _register_and_login(client, "delete-default@example.com")

    list_response = client.get("/decks", headers=headers)
    default_deck_id = list_response.json()[0]["id"]

    delete_response = client.delete(f"/decks/{default_deck_id}", headers=headers)

    assert delete_response.status_code == 409


def test_delete_non_empty_deck_returns_409() -> None:
    """非默认组存在卡片时不可删除。"""
    client, app = build_client()
    headers = _register_and_login(client, "delete-non-empty@example.com")

    created = _create_deck(client, headers, "Travel")
    # API-007（Card 模块）未就绪前，用计数注入模拟“组内有卡”状态，确保删除约束先可验证。
    app.state.deck_repository.update_counts(
        deck_id=created["id"],
        new_count=1,
        learning_count=0,
        due_count=0,
    )

    delete_response = client.delete(f"/decks/{created['id']}", headers=headers)

    assert delete_response.status_code == 409


def test_delete_empty_deck_success_and_second_delete_404() -> None:
    """空组可删；并发重复删除场景第二次应返回 404。"""
    client, _ = build_client()
    headers = _register_and_login(client, "delete-empty@example.com")

    created = _create_deck(client, headers, "Travel")

    first_delete = client.delete(f"/decks/{created['id']}", headers=headers)
    second_delete = client.delete(f"/decks/{created['id']}", headers=headers)
    list_response = client.get("/decks", headers=headers)

    assert first_delete.status_code == 204
    assert second_delete.status_code == 404
    deck_ids = [deck["id"] for deck in list_response.json()]
    assert created["id"] not in deck_ids


def test_delete_deck_requires_authentication() -> None:
    """未认证请求删除 deck 应返回 401。"""
    client, _ = build_client()

    response = client.delete("/decks/any-id")

    assert response.status_code == 401
