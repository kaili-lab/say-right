"""认证 API 集成测试。"""

from datetime import timedelta

from fastapi.testclient import TestClient

from app.auth.tokens import create_refresh_token
from app.main import create_app


def build_client() -> TestClient:
    """为每个用例创建隔离的应用实例。"""
    return TestClient(create_app())


def test_auth_flow_register_login_refresh_and_me() -> None:
    """覆盖注册->登录->获取当前用户->刷新令牌的主链路。"""
    client = build_client()

    register_response = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "Passw0rd!"},
    )
    assert register_response.status_code == 201
    register_body = register_response.json()
    assert register_body["email"] == "alice@example.com"
    assert isinstance(register_body["user_id"], str)

    login_response = client.post(
        "/auth/login",
        json={"email": "alice@example.com", "password": "Passw0rd!"},
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert login_body["token_type"] == "bearer"
    assert isinstance(login_body["access_token"], str)
    assert isinstance(login_body["refresh_token"], str)

    me_response = client.get(
        "/me",
        headers={"Authorization": f"Bearer {login_body['access_token']}"},
    )
    assert me_response.status_code == 200
    assert me_response.json() == {
        "user_id": register_body["user_id"],
        "email": "alice@example.com",
    }

    refresh_response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {login_body['refresh_token']}"},
    )
    assert refresh_response.status_code == 200
    refresh_body = refresh_response.json()
    assert refresh_body["token_type"] == "bearer"
    assert isinstance(refresh_body["access_token"], str)


def test_register_with_existing_email_returns_409() -> None:
    """重复邮箱注册应返回 409。"""
    client = build_client()
    payload = {"email": "dupe@example.com", "password": "Passw0rd!"}

    first_response = client.post("/auth/register", json=payload)
    second_response = client.post("/auth/register", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_login_with_invalid_credentials_returns_401() -> None:
    """错误凭证登录应返回 401。"""
    client = build_client()
    client.post(
        "/auth/register",
        json={"email": "bob@example.com", "password": "Passw0rd!"},
    )

    wrong_password_response = client.post(
        "/auth/login",
        json={"email": "bob@example.com", "password": "wrong-password"},
    )
    unknown_user_response = client.post(
        "/auth/login",
        json={"email": "nobody@example.com", "password": "Passw0rd!"},
    )

    assert wrong_password_response.status_code == 401
    assert unknown_user_response.status_code == 401


def test_refresh_with_expired_token_returns_401() -> None:
    """过期 refresh token 应返回 401。"""
    client = build_client()
    client.post(
        "/auth/register",
        json={"email": "expired@example.com", "password": "Passw0rd!"},
    )

    expired_refresh_token = create_refresh_token(
        user_id="non-existing-user",
        expires_delta=timedelta(seconds=-1),
    )
    response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {expired_refresh_token}"},
    )

    assert response.status_code == 401


def test_register_validation_error_returns_422() -> None:
    """不满足密码长度规则时应返回 422。"""
    client = build_client()

    response = client.post(
        "/auth/register",
        json={"email": "short@example.com", "password": "123"},
    )

    assert response.status_code == 422
