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
    nickname: str | None = None

    @property
    def display_name(self) -> str:
        """返回用于 UI 展示的昵称。"""
        if self.nickname is not None and self.nickname.strip():
            return self.nickname.strip()
        return self.email.split("@", 1)[0]

    @classmethod
    def create(
        cls,
        *,
        email: str,
        password_hash: str,
        nickname: str | None = None,
        now: datetime | None = None,
    ) -> "User":
        """创建新用户实体并生成唯一用户 ID。"""
        return cls(
            user_id=str(uuid4()),
            email=email,
            password_hash=password_hash,
            created_at=now or datetime.now(UTC),
            nickname=nickname.strip() if nickname is not None and nickname.strip() else None,
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


@dataclass(slots=True, frozen=True)
class Card:
    """Card 领域实体。"""

    card_id: str
    user_id: str
    deck_id: str
    front_text: str
    back_text: str
    source_lang: str
    target_lang: str
    due_at: datetime
    stability: float
    difficulty: float
    reps: int
    lapses: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(
        cls,
        *,
        user_id: str,
        deck_id: str,
        front_text: str,
        back_text: str,
        source_lang: str = "zh",
        target_lang: str = "en",
        due_at: datetime | None = None,
        stability: float = 0.0,
        difficulty: float = 0.0,
        reps: int = 0,
        lapses: int = 0,
        now: datetime | None = None,
    ) -> "Card":
        """创建 card 实体。"""
        timestamp = now or datetime.now(UTC)
        return cls(
            card_id=str(uuid4()),
            user_id=user_id,
            deck_id=deck_id,
            front_text=front_text,
            back_text=back_text,
            source_lang=source_lang,
            target_lang=target_lang,
            due_at=due_at or timestamp,
            stability=stability,
            difficulty=difficulty,
            reps=reps,
            lapses=lapses,
            created_at=timestamp,
            updated_at=timestamp,
        )
