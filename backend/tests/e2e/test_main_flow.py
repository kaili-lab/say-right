"""主链路 e2e：auth -> save-with-agent -> review。"""

from fastapi.testclient import TestClient

from app.main import create_app


def test_main_flow_auth_save_and_review() -> None:
    """验证核心闭环链路可复现。"""
    client = TestClient(create_app())

    register_response = client.post(
        "/auth/register",
        json={"email": "main-flow@example.com", "password": "Passw0rd!"},
    )
    assert register_response.status_code == 201

    login_response = client.post(
        "/auth/login",
        json={"email": "main-flow@example.com", "password": "Passw0rd!"},
    )
    assert login_response.status_code == 200
    access_token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    save_response = client.post(
        "/records/save-with-agent",
        headers=headers,
        json={
            "source_text": "旅行时我想问路",
            "generated_text": "I want to ask for directions while traveling.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )
    assert save_response.status_code == 201
    save_body = save_response.json()
    deck_id = save_body["deck_id"]
    card_id = save_body["card_id"]

    review_decks_response = client.get("/review/decks", headers=headers)
    assert review_decks_response.status_code == 200
    review_decks = review_decks_response.json()
    assert any(item["deck_id"] == deck_id for item in review_decks)

    session_response = client.get(f"/review/decks/{deck_id}/session", headers=headers)
    assert session_response.status_code == 200
    session_body = session_response.json()
    session_id = session_body["session_id"]
    assert any(item["card_id"] == card_id for item in session_body["cards"])

    ai_score_response = client.post(
        f"/review/session/{session_id}/ai-score",
        headers=headers,
        json={"card_id": card_id, "user_answer": "I want to ask for directions while traveling."},
    )
    assert ai_score_response.status_code == 200

    rate_response = client.post(
        f"/review/session/{session_id}/rate",
        headers=headers,
        json={
            "card_id": card_id,
            "rating_source": "manual",
            "rating_value": "good",
        },
    )
    assert rate_response.status_code == 200
    assert "next_due_at" in rate_response.json()
