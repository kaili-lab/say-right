from typing import Literal

from pydantic import BaseModel, Field


class TokenPayload(BaseModel):
    sub: str = Field(min_length=1)
    token_type: Literal["access", "refresh"]
    iat: int
    exp: int


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
