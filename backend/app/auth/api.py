"""认证 API 路由层。

职责：
- 参数校验
- 认证头解析
- 把领域异常映射为 HTTP 状态码
"""

from collections.abc import Callable
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.repository import EmailAlreadyExistsError
from app.auth.schemas import TokenPair
from app.auth.service import AuthService, InvalidCredentialsError, UnauthorizedError
from app.domain.models import User


class AuthCredentialsRequest(BaseModel):
    """登录/注册共用请求体。"""

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    """注册成功响应体。"""

    user_id: str
    email: str


class AccessTokenResponse(BaseModel):
    """刷新令牌后的 access token 响应体。"""

    access_token: str
    token_type: Literal["bearer"] = "bearer"


class MeResponse(BaseModel):
    """当前用户信息响应体。"""

    user_id: str
    email: str


def extract_bearer_token(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """从 Authorization 头中提取 Bearer token。"""
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing authorization header",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid authorization header",
        )

    return token


def create_auth_router(
    auth_service: AuthService,
    on_user_registered: Callable[[User], None] | None = None,
) -> APIRouter:
    """构建认证路由集合。"""
    router = APIRouter(tags=["auth"])

    @router.post(
        "/auth/register",
        status_code=status.HTTP_201_CREATED,
        response_model=RegisterResponse,
    )
    def register(payload: AuthCredentialsRequest) -> RegisterResponse:
        """注册新用户。"""
        try:
            user = auth_service.register(email=payload.email, password=payload.password)
        except EmailAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="email already exists",
            ) from exc

        if on_user_registered is not None:
            on_user_registered(user)

        return RegisterResponse(user_id=user.user_id, email=user.email)

    @router.post("/auth/login", response_model=TokenPair)
    def login(payload: AuthCredentialsRequest) -> TokenPair:
        """用户登录并返回令牌对。"""
        try:
            return auth_service.login(email=payload.email, password=payload.password)
        except InvalidCredentialsError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid credentials",
            ) from exc

    @router.post("/auth/refresh", response_model=AccessTokenResponse)
    def refresh_access_token(token: Annotated[str, Depends(extract_bearer_token)]) -> AccessTokenResponse:
        """使用 refresh token 换取新的 access token。"""
        try:
            access_token = auth_service.refresh_access_token(refresh_token=token)
        except UnauthorizedError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid refresh token",
            ) from exc

        return AccessTokenResponse(access_token=access_token)

    @router.get("/me", response_model=MeResponse)
    def get_me(token: Annotated[str, Depends(extract_bearer_token)]) -> MeResponse:
        """返回当前 access token 对应的用户信息。"""
        try:
            user = auth_service.get_current_user(access_token=token)
        except UnauthorizedError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid access token",
            ) from exc

        return MeResponse(user_id=user.user_id, email=user.email)

    return router
