"""认证工具层的单元测试。"""

from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.auth.passwords import hash_password, verify_password
from app.auth.tokens import (
    TokenExpiredError,
    TokenInvalidError,
    create_access_token,
    create_refresh_token,
    decode_token,
)

SECRET_KEY = "test-secret-key-for-say-right-auth-2026"


def test_hash_password_and_verify_success() -> None:
    """明文密码应被哈希并可成功校验。"""
    raw_password = "Passw0rd!"

    hashed = hash_password(raw_password)

    assert hashed != raw_password
    assert verify_password(raw_password, hashed) is True


def test_verify_password_returns_false_for_wrong_password() -> None:
    """错误密码应校验失败。"""
    hashed = hash_password("Passw0rd!")

    assert verify_password("wrong-password", hashed) is False


def test_create_and_decode_access_token() -> None:
    """access token 应可被正确解码。"""
    token = create_access_token(user_id="user-1", secret_key=SECRET_KEY)

    payload = decode_token(token, secret_key=SECRET_KEY, expected_type="access")

    assert payload.sub == "user-1"
    assert payload.token_type == "access"
    assert payload.exp > payload.iat


def test_create_and_decode_refresh_token() -> None:
    """refresh token 应可被正确解码。"""
    token = create_refresh_token(user_id="user-1", secret_key=SECRET_KEY)

    payload = decode_token(token, secret_key=SECRET_KEY, expected_type="refresh")

    assert payload.sub == "user-1"
    assert payload.token_type == "refresh"
    assert payload.exp > payload.iat


def test_decode_token_raises_when_expired() -> None:
    """过期令牌应抛出过期异常。"""
    now = datetime.now(UTC)
    expired_payload = {
        "sub": "user-1",
        "token_type": "access",
        "iat": int((now - timedelta(minutes=10)).timestamp()),
        "exp": int((now - timedelta(minutes=1)).timestamp()),
    }
    expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm="HS256")

    with pytest.raises(TokenExpiredError):
        decode_token(expired_token, secret_key=SECRET_KEY, expected_type="access")


def test_decode_token_raises_for_tampered_token() -> None:
    """被篡改令牌应抛出无效异常。"""
    valid_token = create_access_token(user_id="user-1", secret_key=SECRET_KEY)
    tampered_token = f"{valid_token}broken"

    with pytest.raises(TokenInvalidError):
        decode_token(tampered_token, secret_key=SECRET_KEY, expected_type="access")


def test_decode_token_raises_when_type_not_match() -> None:
    """令牌类型与期望不一致时应抛出无效异常。"""
    refresh_token = create_refresh_token(user_id="user-1", secret_key=SECRET_KEY)

    with pytest.raises(TokenInvalidError):
        decode_token(refresh_token, secret_key=SECRET_KEY, expected_type="access")
