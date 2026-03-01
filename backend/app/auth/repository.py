"""用户仓储抽象与内存实现。"""

from threading import Lock
from typing import Protocol

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
