"""Card API 集成测试。"""

from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> tuple[TestClient, FastAPI]:
    """创建隔离应用实例，便于注入测试数据。"""
    app = create_app()
    return TestClient(app), app


def _register_and_login(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    client.post(
        "/auth/register",
        json={"email": email, "password": "Passw0rd!"},
    )
    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "Passw0rd!"},
    )
    token = login_response.json()["access_token"]
    me_response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me_response.json()["user_id"]
    return {"Authorization": f"Bearer {token}"}, user_id


def _create_deck(client: TestClient, headers: dict[str, str], name: str) -> str:
    response = client.post("/decks", headers=headers, json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


def _default_deck_id(client: TestClient, headers: dict[str, str]) -> str:
    response = client.get("/decks", headers=headers)
    assert response.status_code == 200
    return response.json()[0]["id"]


def test_get_cards_by_deck_returns_seeded_cards() -> None:
    """查询 deck 卡片列表应返回该组卡片。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "card-list@example.com")
    deck_id = _default_deck_id(client, headers)

    created = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=deck_id,
        front_text="你好",
        back_text="Hello",
        due_at=datetime(2026, 3, 1, tzinfo=UTC),
        stability=2.1,
        difficulty=4.5,
        reps=1,
        lapses=0,
    )

    response = client.get(f"/decks/{deck_id}/cards", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == created.card_id
    assert body[0]["front_text"] == "你好"
    assert body[0]["back_text"] == "Hello"
    assert body[0]["stability"] == 2.1


def test_patch_card_updates_text_without_reset_fsrs() -> None:
    """编辑卡片只更新文案，不重置 FSRS 字段。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "card-patch@example.com")
    deck_id = _default_deck_id(client, headers)

    created = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=deck_id,
        front_text="我想喝水",
        back_text="I want water",
        due_at=datetime(2026, 3, 2, tzinfo=UTC),
        stability=7.2,
        difficulty=3.3,
        reps=5,
        lapses=1,
    )

    response = client.patch(
        f"/cards/{created.card_id}",
        headers=headers,
        json={"front_text": "我想喝点水", "back_text": "I want some water"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["front_text"] == "我想喝点水"
    assert body["back_text"] == "I want some water"
    assert body["due_at"] == "2026-03-02T00:00:00Z"
    assert body["stability"] == 7.2
    assert body["difficulty"] == 3.3
    assert body["reps"] == 5
    assert body["lapses"] == 1


def test_delete_card_success_and_second_delete_returns_404() -> None:
    """删除卡片成功，重复删除返回未找到。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "card-delete@example.com")
    deck_id = _default_deck_id(client, headers)

    created = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=deck_id,
        front_text="谢谢",
        back_text="Thank you",
    )

    first_delete = client.delete(f"/cards/{created.card_id}", headers=headers)
    second_delete = client.delete(f"/cards/{created.card_id}", headers=headers)

    assert first_delete.status_code == 204
    assert second_delete.status_code == 404


def test_move_card_to_another_deck_success() -> None:
    """移动卡片到目标组后，目标组可查询到该卡片。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "card-move@example.com")
    from_deck_id = _default_deck_id(client, headers)
    to_deck_id = _create_deck(client, headers, "Travel")

    created = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=from_deck_id,
        front_text="你好吗",
        back_text="How are you",
    )

    move_response = client.post(
        f"/cards/{created.card_id}/move",
        headers=headers,
        json={"to_deck_id": to_deck_id},
    )
    from_list = client.get(f"/decks/{from_deck_id}/cards", headers=headers)
    to_list = client.get(f"/decks/{to_deck_id}/cards", headers=headers)

    assert move_response.status_code == 200
    assert move_response.json()["deck_id"] == to_deck_id
    assert from_list.status_code == 200
    assert to_list.status_code == 200
    assert [card["id"] for card in from_list.json()] == []
    assert [card["id"] for card in to_list.json()] == [created.card_id]


def test_move_card_to_unknown_deck_returns_404() -> None:
    """移动到不存在 deck 应返回 404。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "card-move-404@example.com")
    from_deck_id = _default_deck_id(client, headers)

    created = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=from_deck_id,
        front_text="早上好",
        back_text="Good morning",
    )

    response = client.post(
        f"/cards/{created.card_id}/move",
        headers=headers,
        json={"to_deck_id": "non-existent-deck"},
    )

    assert response.status_code == 404


def test_card_api_requires_authentication() -> None:
    """卡片接口在未认证请求下应返回 401。"""
    client, _ = build_client()

    list_response = client.get("/decks/any/cards")
    patch_response = client.patch("/cards/any", json={"front_text": "A"})
    delete_response = client.delete("/cards/any")
    move_response = client.post("/cards/any/move", json={"to_deck_id": "deck-1"})

    assert list_response.status_code == 401
    assert patch_response.status_code == 401
    assert delete_response.status_code == 401
    assert move_response.status_code == 401


def test_card_api_cross_user_access_returns_404() -> None:
    """用户不可操作他人卡片。"""
    client, app = build_client()
    owner_headers, owner_user_id = _register_and_login(client, "owner@example.com")
    attacker_headers, _ = _register_and_login(client, "attacker@example.com")

    owner_deck_id = _default_deck_id(client, owner_headers)
    attacker_deck_id = _default_deck_id(client, attacker_headers)

    created = app.state.card_repository.create_card(
        user_id=owner_user_id,
        deck_id=owner_deck_id,
        front_text="晚安",
        back_text="Good night",
    )

    patch_response = client.patch(
        f"/cards/{created.card_id}",
        headers=attacker_headers,
        json={"front_text": "无权限修改"},
    )
    delete_response = client.delete(f"/cards/{created.card_id}", headers=attacker_headers)
    move_response = client.post(
        f"/cards/{created.card_id}/move",
        headers=attacker_headers,
        json={"to_deck_id": attacker_deck_id},
    )

    assert patch_response.status_code == 404
    assert delete_response.status_code == 404
    assert move_response.status_code == 404
