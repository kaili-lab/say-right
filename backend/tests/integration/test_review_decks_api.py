"""复习 Deck 列表与到期统计 API 集成测试。"""

from datetime import UTC, datetime, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> tuple[TestClient, FastAPI]:
    """创建隔离应用实例，便于注入测试数据。"""
    app = create_app()
    return TestClient(app), app


def _register_and_login(client: TestClient, email: str) -> tuple[dict[str, str], str]:
    client.post("/auth/register", json={"email": email, "password": "Passw0rd!"})
    login_response = client.post("/auth/login", json={"email": email, "password": "Passw0rd!"})
    token = login_response.json()["access_token"]
    me_response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    user_id = me_response.json()["user_id"]
    return {"Authorization": f"Bearer {token}"}, user_id


def _create_deck(client: TestClient, headers: dict[str, str], name: str) -> str:
    response = client.post("/decks", headers=headers, json={"name": name})
    assert response.status_code == 201
    return response.json()["id"]


def test_review_decks_returns_due_count_sorted_desc() -> None:
    """复习 deck 列表应按 due_count 降序返回。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "review-decks@example.com")
    travel_id = _create_deck(client, headers, "Travel")
    food_id = _create_deck(client, headers, "Food")
    now = datetime.now(UTC)

    # Travel 组两张到期卡
    app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=travel_id,
        front_text="旅行问路1",
        back_text="travel one",
        due_at=now - timedelta(days=1),
        reps=1,
    )
    app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=travel_id,
        front_text="旅行问路2",
        back_text="travel two",
        due_at=now - timedelta(hours=1),
        reps=2,
    )
    # Food 组一张到期卡
    app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=food_id,
        front_text="点菜",
        back_text="order food",
        due_at=now - timedelta(minutes=1),
        reps=1,
    )

    response = client.get("/review/decks", headers=headers)

    assert response.status_code == 200
    body = response.json()
    due_counts = [item["due_count"] for item in body]
    assert due_counts == sorted(due_counts, reverse=True)
    assert body[0]["deck_id"] == travel_id
    assert body[0]["due_count"] == 2


def test_review_decks_isolated_between_users() -> None:
    """用户仅能看到自己的复习 deck 统计。"""
    client, app = build_client()
    owner_headers, owner_user_id = _register_and_login(client, "review-owner@example.com")
    attacker_headers, attacker_user_id = _register_and_login(client, "review-attacker@example.com")

    owner_travel_id = _create_deck(client, owner_headers, "Travel")
    attacker_food_id = _create_deck(client, attacker_headers, "Food")
    now = datetime.now(UTC)

    app.state.card_repository.create_card(
        user_id=owner_user_id,
        deck_id=owner_travel_id,
        front_text="owner due",
        back_text="owner",
        due_at=now - timedelta(minutes=1),
        reps=1,
    )
    app.state.card_repository.create_card(
        user_id=attacker_user_id,
        deck_id=attacker_food_id,
        front_text="attacker due",
        back_text="attacker",
        due_at=now - timedelta(minutes=1),
        reps=1,
    )

    owner_response = client.get("/review/decks", headers=owner_headers)
    attacker_response = client.get("/review/decks", headers=attacker_headers)

    assert owner_response.status_code == 200
    assert attacker_response.status_code == 200
    owner_deck_ids = {item["deck_id"] for item in owner_response.json()}
    attacker_deck_ids = {item["deck_id"] for item in attacker_response.json()}
    assert owner_travel_id in owner_deck_ids
    assert attacker_food_id in attacker_deck_ids
    assert owner_deck_ids.isdisjoint({attacker_food_id})


def test_review_decks_requires_authentication() -> None:
    """未认证访问应返回 401。"""
    client, _ = build_client()

    response = client.get("/review/decks")

    assert response.status_code == 401
