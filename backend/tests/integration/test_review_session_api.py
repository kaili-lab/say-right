"""复习 Session 与 AI 评分 API 集成测试。"""

from datetime import UTC, datetime, timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> tuple[TestClient, FastAPI]:
    """创建隔离应用实例并暴露状态。"""
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


def _create_review_card(app: FastAPI, *, user_id: str, deck_id: str, front: str, back: str) -> str:
    card = app.state.card_repository.create_card(
        user_id=user_id,
        deck_id=deck_id,
        front_text=front,
        back_text=back,
        due_at=datetime.now(UTC) - timedelta(minutes=1),
        stability=2.0,
        difficulty=5.0,
        reps=1,
        lapses=0,
    )
    return card.card_id


def test_review_session_get_ai_score_and_rate_flow() -> None:
    """覆盖 session 拉取、AI 评分、评级提交主链路。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "review-session@example.com")
    deck_id = _create_deck(client, headers, "Travel")
    card_id = _create_review_card(app, user_id=user_id, deck_id=deck_id, front="谢谢", back="Thank you")

    session_response = client.get(f"/review/decks/{deck_id}/session", headers=headers)
    assert session_response.status_code == 200
    session_body = session_response.json()
    session_id = session_body["session_id"]
    assert session_body["cards"][0]["card_id"] == card_id

    ai_score_response = client.post(
        f"/review/session/{session_id}/ai-score",
        headers=headers,
        json={"card_id": card_id, "user_answer": "Thank you"},
    )
    assert ai_score_response.status_code == 200
    ai_body = ai_score_response.json()
    assert isinstance(ai_body["score"], int)
    assert ai_body["suggested_rating"] in {"again", "hard", "good", "easy"}

    rate_response = client.post(
        f"/review/session/{session_id}/rate",
        headers=headers,
        json={
            "card_id": card_id,
            "rating_source": "manual",
            "rating_value": "good",
            "user_answer": "Thank you",
        },
    )
    assert rate_response.status_code == 200
    rate_body = rate_response.json()
    assert "next_due_at" in rate_body
    assert rate_body["updated_fsrs_state"]["reps"] == 2


def test_review_ai_score_unavailable_returns_503() -> None:
    """AI 评分不可用时应返回 503。"""
    client, app = build_client()
    headers, user_id = _register_and_login(client, "review-ai-503@example.com")
    deck_id = _create_deck(client, headers, "Travel")
    card_id = _create_review_card(app, user_id=user_id, deck_id=deck_id, front="你好", back="Hello")

    session_response = client.get(f"/review/decks/{deck_id}/session", headers=headers)
    session_id = session_response.json()["session_id"]

    response = client.post(
        f"/review/session/{session_id}/ai-score",
        headers=headers,
        json={"card_id": card_id, "user_answer": "__AI_UNAVAILABLE__"},
    )

    assert response.status_code == 503


def test_review_session_requires_authentication() -> None:
    """未认证请求应返回 401。"""
    client, _ = build_client()

    session_response = client.get("/review/decks/any/session")
    ai_score_response = client.post("/review/session/any/ai-score", json={"card_id": "x", "user_answer": "y"})
    rate_response = client.post(
        "/review/session/any/rate",
        json={"card_id": "x", "rating_source": "manual", "rating_value": "good"},
    )

    assert session_response.status_code == 401
    assert ai_score_response.status_code == 401
    assert rate_response.status_code == 401
