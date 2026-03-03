"""用户仓储抽象与内存实现。"""

from collections.abc import Mapping
from datetime import datetime
from threading import Lock
from typing import Protocol, cast

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.domain.models import User


class EmailAlreadyExistsError(ValueError):
    """邮箱已存在。"""


class UserRepository(Protocol):
    """用户仓储协议，便于后续平滑切换到数据库实现。"""

    def get_by_email(self, email: str) -> User | None:
        """按邮箱查询用户。"""
        ...

    def get_by_id(self, user_id: str) -> User | None:
        """按用户 ID 查询用户。"""
        ...

    def add(self, user: User) -> None:
        """新增用户，若邮箱冲突应抛出业务异常。"""
        ...


class InMemoryUserRepository(UserRepository):
    """基于内存字典的用户仓储实现。

    该实现用于早期迭代，优先保证接口联调速度，
    便于在数据库层落地前先完成认证链路。
    """

    def __init__(self) -> None:
        """初始化内存索引与线程锁。"""
        self._users_by_id: dict[str, User] = {}
        self._user_id_by_email: dict[str, str] = {}
        self._lock = Lock()

    def get_by_email(self, email: str) -> User | None:
        """按邮箱读取用户。"""
        user_id = self._user_id_by_email.get(email)
        if user_id is None:
            return None
        return self._users_by_id.get(user_id)

    def get_by_id(self, user_id: str) -> User | None:
        """按 ID 读取用户。"""
        return self._users_by_id.get(user_id)

    def add(self, user: User) -> None:
        """新增用户并保证邮箱唯一。"""
        with self._lock:
            if user.email in self._user_id_by_email:
                raise EmailAlreadyExistsError("email already exists")
            self._users_by_id[user.user_id] = user
            self._user_id_by_email[user.email] = user.user_id


class PostgresUserRepository(UserRepository):
    """基于 PostgreSQL 的用户仓储实现。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        """初始化数据库连接池。"""
        self._pool = pool

    def get_by_email(self, email: str) -> User | None:
        """按邮箱读取用户。"""
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT user_id, email, password_hash, created_at, nickname
                    FROM users
                    WHERE email = %s
                    LIMIT 1
                    """,
                    (email,),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        return _row_to_user(row)

    def get_by_id(self, user_id: str) -> User | None:
        """按 ID 读取用户。"""
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT user_id, email, password_hash, created_at, nickname
                    FROM users
                    WHERE user_id = %s
                    LIMIT 1
                    """,
                    (user_id,),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        return _row_to_user(row)

    def add(self, user: User) -> None:
        """新增用户并保证邮箱唯一。"""
        try:
            with self._pool.connection() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO users (user_id, email, password_hash, created_at, nickname)
                        VALUES (%s, %s, %s, %s, %s)
                        """,
                        (
                            user.user_id,
                            user.email,
                            user.password_hash,
                            user.created_at,
                            user.nickname,
                        ),
                    )
        except psycopg.errors.UniqueViolation as exc:
            raise EmailAlreadyExistsError("email already exists") from exc


def _row_to_user(row: Mapping[str, object]) -> User:
    """把数据库行映射为领域实体。"""
    return User(
        user_id=str(row["user_id"]),
        email=str(row["email"]),
        password_hash=str(row["password_hash"]),
        created_at=cast(datetime, row["created_at"]),
        nickname=cast(str | None, row.get("nickname")) if isinstance(row, Mapping) else None,
    )
