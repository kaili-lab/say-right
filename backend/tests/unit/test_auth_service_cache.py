"""鉴权服务 TTL 缓存测试。"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest

from app.auth.repository import InMemoryUserRepository
from app.auth.service import AuthService, UnauthorizedError
from app.domain.models import User


def _make_user(user_id: str = "user-1") -> User:
    return User.create(email=f"{user_id}@test.com", password_hash="hash", nickname="Test")


def _make_auth_service(user_repository: InMemoryUserRepository | None = None) -> AuthService:
    return AuthService(user_repository=user_repository or InMemoryUserRepository())


def test_get_current_user_should_cache_user_on_second_call() -> None:
    """首次查库、TTL 内二次调用命中缓存不再查库。"""
    repo = InMemoryUserRepository()
    user = _make_user()
    repo.add(user)
    service = _make_auth_service(repo)

    with patch("app.auth.service.decode_token") as mock_decode:
        mock_decode.return_value = MagicMock(sub=user.user_id)
        with patch.object(repo, "get_by_id", wraps=repo.get_by_id) as spy:
            # 第一次 — 查库
            result1 = service.get_current_user(access_token="fake-token")
            assert result1.user_id == user.user_id
            assert spy.call_count == 1

            # 第二次 — 命中缓存
            result2 = service.get_current_user(access_token="fake-token")
            assert result2.user_id == user.user_id
            assert spy.call_count == 1  # 未再查库


def test_get_current_user_should_not_cache_nonexistent_user() -> None:
    """用户不存在时不缓存，下次仍查库。"""
    repo = InMemoryUserRepository()
    service = _make_auth_service(repo)

    with patch("app.auth.service.decode_token") as mock_decode:
        mock_decode.return_value = MagicMock(sub="nonexistent")
        with patch.object(repo, "get_by_id", wraps=repo.get_by_id) as spy:
            with pytest.raises(UnauthorizedError):
                service.get_current_user(access_token="fake-token")
            assert spy.call_count == 1

            with pytest.raises(UnauthorizedError):
                service.get_current_user(access_token="fake-token")
            assert spy.call_count == 2  # 每次都查库


def test_get_current_user_should_refetch_after_cache_expiry() -> None:
    """TTL 过期后应重新查库。"""
    repo = InMemoryUserRepository()
    user = _make_user()
    repo.add(user)
    service = _make_auth_service(repo)

    with patch("app.auth.service.decode_token") as mock_decode:
        mock_decode.return_value = MagicMock(sub=user.user_id)
        with patch.object(repo, "get_by_id", wraps=repo.get_by_id) as spy:
            service.get_current_user(access_token="fake-token")
            assert spy.call_count == 1

            # 手动清空缓存模拟 TTL 过期
            service._user_cache.clear()

            service.get_current_user(access_token="fake-token")
            assert spy.call_count == 2  # 过期后重新查库
