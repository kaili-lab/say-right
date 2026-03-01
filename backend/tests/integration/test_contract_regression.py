"""关键契约回归测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def _register_and_login(client: TestClient, email: str) -> dict[str, str]:
    client.post("/auth/register", json={"email": email, "password": "Passw0rd!"})
    login_response = client.post("/auth/login", json={"email": email, "password": "Passw0rd!"})
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_auth_contract_regression() -> None:
    """回归 v0.1 auth 契约关键字段。"""
    client = TestClient(create_app())

    register_response = client.post(
        "/auth/register",
        json={"email": "contract-auth@example.com", "password": "Passw0rd!"},
    )
    assert register_response.status_code == 201
    register_body = register_response.json()
    assert {"user_id", "email"}.issubset(register_body)

    login_response = client.post(
        "/auth/login",
        json={"email": "contract-auth@example.com", "password": "Passw0rd!"},
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert {"access_token", "refresh_token", "token_type"}.issubset(login_body)

    refresh_response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {login_body['refresh_token']}"},
    )
    assert refresh_response.status_code == 200
    assert {"access_token", "token_type"}.issubset(refresh_response.json())


def test_record_save_agent_contract_regression() -> None:
    """回归 v0.4 save-with-agent 契约关键字段。"""
    client = TestClient(create_app())
    headers = _register_and_login(client, "contract-save@example.com")

    response = client.post(
        "/records/save-with-agent",
        headers=headers,
        json={
            "source_text": "旅行时我想问路",
            "generated_text": "I want to ask for directions while traveling.",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert {"card_id", "deck_id", "deck_name", "deck_created", "fallback_used"}.issubset(body)


def test_review_contract_regression() -> None:
    """回归 v0.5 review 契约关键字段。"""
    client = TestClient(create_app())
    headers = _register_and_login(client, "contract-review@example.com")

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

    decks_response = client.get("/review/decks", headers=headers)
    assert decks_response.status_code == 200
    assert isinstance(decks_response.json(), list)

    session_response = client.get(f"/review/decks/{save_body['deck_id']}/session", headers=headers)
    assert session_response.status_code == 200
    session_body = session_response.json()
    assert {"session_id", "cards"}.issubset(session_body)

    card_id = save_body["card_id"]
    session_id = session_body["session_id"]

    ai_score_response = client.post(
        f"/review/session/{session_id}/ai-score",
        headers=headers,
        json={"card_id": card_id, "user_answer": "I want to ask for directions while traveling."},
    )
    assert ai_score_response.status_code == 200
    assert {"score", "feedback", "suggested_rating"}.issubset(ai_score_response.json())

    rate_response = client.post(
        f"/review/session/{session_id}/rate",
        headers=headers,
        json={"card_id": card_id, "rating_source": "manual", "rating_value": "good"},
    )
    assert rate_response.status_code == 200
    assert {"next_due_at", "updated_fsrs_state"}.issubset(rate_response.json())
