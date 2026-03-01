"""领域模型定义。"""

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4


@dataclass(slots=True, frozen=True)
class User:
    """用户领域实体。"""

    user_id: str
    email: str
    password_hash: str
    created_at: datetime

    @classmethod
    def create(cls, *, email: str, password_hash: str, now: datetime | None = None) -> "User":
        """创建新用户实体并生成唯一用户 ID。"""
        return cls(
            user_id=str(uuid4()),
            email=email,
            password_hash=password_hash,
            created_at=now or datetime.now(UTC),
        )


@dataclass(slots=True, frozen=True)
class Deck:
    """Deck 领域实体。"""

    deck_id: str
    user_id: str
    name: str
    is_default: bool
    new_count: int
    learning_count: int
    due_count: int
    created_at: datetime

    @classmethod
    def create(
        cls,
        *,
        user_id: str,
        name: str,
        is_default: bool,
        now: datetime | None = None,
    ) -> "Deck":
        """创建 deck 实体。"""
        return cls(
            deck_id=str(uuid4()),
            user_id=user_id,
            name=name,
            is_default=is_default,
            new_count=0,
            learning_count=0,
            due_count=0,
            created_at=now or datetime.now(UTC),
        )
