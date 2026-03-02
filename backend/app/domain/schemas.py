"""领域层共享 schema。"""

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    """创建用户时的输入 schema。"""

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class UserPublic(BaseModel):
    """对外返回的用户公开信息。"""

    user_id: str
    email: str
    nickname: str | None = None
    display_name: str
