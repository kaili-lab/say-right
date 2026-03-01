"""测试全局夹具。"""

import pytest


@pytest.fixture(autouse=True)
def force_memory_storage_backend(monkeypatch: pytest.MonkeyPatch) -> None:
    """默认强制测试走内存仓储，保证测试可复现且不依赖外部数据库。"""
    monkeypatch.setenv("APP_STORAGE_BACKEND", "memory")
