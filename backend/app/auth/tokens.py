"""JWT 令牌生成与校验工具。"""

import os
from datetime import UTC, datetime, timedelta
from typing import Literal

import jwt
from pydantic import ValidationError

from app.auth.schemas import TokenPair, TokenPayload

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 30


class TokenError(ValueError):
    """令牌相关领域错误基类。"""


class TokenExpiredError(TokenError):
    """令牌已过期。"""


class TokenInvalidError(TokenError):
    """令牌无效（格式、签名、类型等）。"""


def _now(now: datetime | None) -> datetime:
    """返回当前 UTC 时间，允许测试注入固定时间。"""
    return now if now is not None else datetime.now(UTC)


def _resolve_secret(secret_key: str | None) -> str:
    """解析 JWT 密钥，优先使用显式传入值，其次读取环境变量。"""
    return secret_key or os.getenv("JWT_SECRET_KEY", "dev-secret-change-me-at-least-32chars")


def _build_payload(
    *,
    user_id: str,
    token_type: Literal["access", "refresh"],
    issued_at: datetime,
    expires_at: datetime,
) -> dict[str, int | str]:
    """构造标准 JWT 载荷。"""
    return {
        "sub": user_id,
        "token_type": token_type,
        "iat": int(issued_at.timestamp()),
        "exp": int(expires_at.timestamp()),
    }


def create_access_token(
    *,
    user_id: str,
    secret_key: str | None = None,
    now: datetime | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """生成 access token。"""
    issued_at = _now(now)
    expires_at = issued_at + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = _build_payload(
        user_id=user_id,
        token_type="access",
        issued_at=issued_at,
        expires_at=expires_at,
    )
    return jwt.encode(payload, _resolve_secret(secret_key), algorithm=ALGORITHM)


def create_refresh_token(
    *,
    user_id: str,
    secret_key: str | None = None,
    now: datetime | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """生成 refresh token。"""
    issued_at = _now(now)
    expires_at = issued_at + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    payload = _build_payload(
        user_id=user_id,
        token_type="refresh",
        issued_at=issued_at,
        expires_at=expires_at,
    )
    return jwt.encode(payload, _resolve_secret(secret_key), algorithm=ALGORITHM)


def decode_token(
    token: str,
    *,
    secret_key: str | None = None,
    expected_type: Literal["access", "refresh"],
) -> TokenPayload:
    """校验并解码 JWT，返回结构化载荷。"""
    try:
        decoded = jwt.decode(token, _resolve_secret(secret_key), algorithms=[ALGORITHM])
        payload = TokenPayload.model_validate(decoded)
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("token is expired") from exc
    # 统一把第三方库异常映射为领域异常，避免上层被底层库类型绑定。
    except (jwt.InvalidTokenError, ValidationError) as exc:
        raise TokenInvalidError("token is invalid") from exc

    if payload.token_type != expected_type:
        raise TokenInvalidError("token type mismatch")

    return payload


def create_token_pair(
    *,
    user_id: str,
    secret_key: str | None = None,
    now: datetime | None = None,
) -> TokenPair:
    """一次性生成登录需要的 access/refresh 令牌对。"""
    return TokenPair(
        access_token=create_access_token(user_id=user_id, secret_key=secret_key, now=now),
        refresh_token=create_refresh_token(user_id=user_id, secret_key=secret_key, now=now),
    )
