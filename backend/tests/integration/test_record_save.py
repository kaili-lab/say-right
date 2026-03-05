"""POST /records/save 集成测试。"""

from fastapi.testclient import TestClient

from app.main import create_app


def build_client() -> TestClient:
    return TestClient(create_app())


def _register_and_login(client: TestClient, email: str) -> str:
    client.post("/auth/register", json={"email": email, "password": "Passw0rd!"})
    resp = client.post("/auth/login", json={"email": email, "password": "Passw0rd!"})
    return resp.json()["access_token"]


def _get_default_deck_id(client: TestClient, token: str) -> str:
    resp = client.get("/decks", headers={"Authorization": f"Bearer {token}"})
    decks = resp.json()
    default = next(d for d in decks if d["is_default"])
    return default["id"]


# ── 成功路径 ────────────────────────────────────────────────────────────────

def test_save_record_to_default_deck_returns_201() -> None:
    """保存到默认组应返回 201 及卡片/分组信息。"""
    client = build_client()
    token = _register_and_login(client, "save-record-ok@example.com")
    deck_id = _get_default_deck_id(client, token)

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天天气很好",
            "generated_text": "The weather is nice today.",
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 201
    body = resp.json()
    assert isinstance(body["card_id"], str)
    assert body["deck_id"] == deck_id
    assert isinstance(body["deck_name"], str)


def test_save_record_to_custom_deck() -> None:
    """保存到自建组应成功返回该组信息。"""
    client = build_client()
    token = _register_and_login(client, "save-record-custom@example.com")

    # 创建自定义分组
    deck_resp = client.post(
        "/decks",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Travel"},
    )
    assert deck_resp.status_code == 201
    deck_id = deck_resp.json()["id"]

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "旅行时我想问路",
            "generated_text": "I want to ask for directions while traveling.",
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["deck_id"] == deck_id
    assert body["deck_name"] == "Travel"


# ── 失败路径 ────────────────────────────────────────────────────────────────

def test_save_record_deck_not_found_returns_404() -> None:
    """deck_id 不存在时应返回 404。"""
    client = build_client()
    token = _register_and_login(client, "save-record-404@example.com")

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "测试",
            "generated_text": "Test.",
            "deck_id": "00000000-0000-0000-0000-000000000000",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 404


def test_save_record_cannot_access_other_user_deck() -> None:
    """不能向其他用户的 deck 保存卡片（应返回 404）。"""
    client = build_client()
    token_a = _register_and_login(client, "save-record-owner@example.com")
    token_b = _register_and_login(client, "save-record-thief@example.com")

    # A 的默认组
    deck_id_a = _get_default_deck_id(client, token_a)

    # B 尝试向 A 的组保存
    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "source_text": "测试",
            "generated_text": "Test.",
            "deck_id": deck_id_a,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 404


def test_save_record_requires_authentication() -> None:
    """未认证请求应返回 401。"""
    client = build_client()

    resp = client.post(
        "/records/save",
        json={
            "source_text": "测试",
            "generated_text": "Test.",
            "deck_id": "some-deck-id",
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 401


def test_save_record_empty_source_text_returns_422() -> None:
    """source_text 为空时应返回 422。"""
    client = build_client()
    token = _register_and_login(client, "save-record-422a@example.com")
    deck_id = _get_default_deck_id(client, token)

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "   ",
            "generated_text": "Test.",
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body.get("detail"), list)
    assert any("中文内容不能为空" in item.get("msg", "") for item in body["detail"])


def test_save_record_empty_generated_text_returns_422() -> None:
    """generated_text 为空时应返回 422。"""
    client = build_client()
    token = _register_and_login(client, "save-record-422b@example.com")
    deck_id = _get_default_deck_id(client, token)

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天天气很好",
            "generated_text": "   ",
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body.get("detail"), list)
    assert any("英文内容不能为空" in item.get("msg", "") for item in body["detail"])


def test_save_record_generated_text_at_limit_returns_201() -> None:
    """generated_text 恰好 300 字符时应允许保存。"""
    client = build_client()
    token = _register_and_login(client, "save-record-300@example.com")
    deck_id = _get_default_deck_id(client, token)

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天天气很好",
            "generated_text": "a" * 300,
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 201


def test_save_record_generated_text_too_long_returns_422() -> None:
    """generated_text 超过 300 字符时应返回 422，并给出可读错误。"""
    client = build_client()
    token = _register_and_login(client, "save-record-422c@example.com")
    deck_id = _get_default_deck_id(client, token)

    resp = client.post(
        "/records/save",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "source_text": "今天天气很好",
            "generated_text": "a" * 301,
            "deck_id": deck_id,
            "source_lang": "zh",
            "target_lang": "en",
        },
    )

    assert resp.status_code == 422
    body = resp.json()
    assert isinstance(body.get("detail"), list)
    assert any(
        item.get("loc", [None])[-1] == "generated_text" and "300" in item.get("msg", "")
        for item in body["detail"]
    )
