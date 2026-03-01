"""认证服务层。

职责：
- 编排注册/登录/刷新/鉴权流程
- 统一处理认证领域错误
- 保持路由层与仓储层解耦
"""

from dataclasses import dataclass

from app.auth.passwords import hash_password, verify_password
from app.auth.repository import UserRepository
from app.auth.schemas import TokenPair
from app.auth.tokens import TokenError, create_access_token, create_token_pair, decode_token
from app.domain.models import User


class InvalidCredentialsError(ValueError):
    """邮箱或密码错误。"""


class UnauthorizedError(ValueError):
    """认证失败。"""


@dataclass(slots=True)
class AuthService:
    """认证领域服务。"""

    user_repository: UserRepository
    jwt_secret: str | None = None

    def register(self, *, email: str, password: str) -> User:
        """注册用户并返回新建用户实体。"""
        normalized_email = self._normalize_email(email)
        password_hash = hash_password(password)
        user = User.create(email=normalized_email, password_hash=password_hash)
        self.user_repository.add(user)
        return user

    def login(self, *, email: str, password: str) -> TokenPair:
        """校验凭证并签发令牌对。"""
        normalized_email = self._normalize_email(email)
        user = self.user_repository.get_by_email(normalized_email)
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("invalid credentials")

        return create_token_pair(user_id=user.user_id, secret_key=self.jwt_secret)

    def refresh_access_token(self, *, refresh_token: str) -> str:
        """校验 refresh token 并签发新的 access token。"""
        try:
            payload = decode_token(
                refresh_token,
                secret_key=self.jwt_secret,
                expected_type="refresh",
            )
        except TokenError as exc:
            raise UnauthorizedError("invalid token") from exc

        user = self.user_repository.get_by_id(payload.sub)
        if user is None:
            raise UnauthorizedError("invalid token")

        return create_access_token(user_id=user.user_id, secret_key=self.jwt_secret)

    def get_current_user(self, *, access_token: str) -> User:
        """根据 access token 解析当前用户。"""
        try:
            payload = decode_token(
                access_token,
                secret_key=self.jwt_secret,
                expected_type="access",
            )
        except TokenError as exc:
            raise UnauthorizedError("invalid token") from exc

        user = self.user_repository.get_by_id(payload.sub)
        if user is None:
            raise UnauthorizedError("invalid token")

        return user

    @staticmethod
    def _normalize_email(email: str) -> str:
        """统一邮箱规格，避免大小写和前后空格导致账号重复。"""
        # 登录、注册都按同一规格处理邮箱，避免大小写/空格导致“看起来相同却无法命中”的问题。
        return email.strip().lower()
