"""认证模块的请求/响应与令牌数据结构。"""

from typing import Literal

from pydantic import BaseModel, Field


class TokenPayload(BaseModel):
    """JWT 解码后的标准载荷。"""

    sub: str = Field(min_length=1)
    token_type: Literal["access", "refresh"]
    iat: int
    exp: int


class TokenPair(BaseModel):
    """登录成功后返回的 access/refresh 令牌对。"""

    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
