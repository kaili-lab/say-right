"""首页概览 API 集成测试。"""

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


def test_home_summary_should_return_aggregated_dashboard_data() -> None:
    """首页概览应返回统计指标与最近卡片组。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "dashboard-summary@example.com")
    travel_id = _create_deck(client, headers, "Travel")
    work_id = _create_deck(client, headers, "Work")

    # 一张到期且已复习卡 + 一张未复习卡，用于覆盖 total_due/mastered_count 计算。
    app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=travel_id,
        front_text="你好",
        back_text="Hello",
        due_at=datetime.now(UTC) - timedelta(hours=2),
        reps=1,
    )
    app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=work_id,
        front_text="谢谢",
        back_text="Thank you",
        due_at=datetime.now(UTC) + timedelta(days=2),
        reps=0,
    )

    response = client.get("/dashboard/home-summary", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total_due"] == 1
    assert body["mastered_count"] == 1
    assert body["study_days"] >= 1
    assert len(body["recent_decks"]) == 3
    recent_ids = {item["id"] for item in body["recent_decks"]}
    assert travel_id in recent_ids
    assert work_id in recent_ids


def test_home_summary_should_require_authentication() -> None:
    """未认证访问首页概览应返回 401。"""
    client, _ = build_client()

    response = client.get("/dashboard/home-summary")

    assert response.status_code == 401
