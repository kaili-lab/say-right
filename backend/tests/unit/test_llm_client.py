"""LLM 客户端装配测试。"""

from __future__ import annotations

from typing import Any

from app.llm import client as llm_client


def test_resolve_http_proxy_should_skip_socks_proxy() -> None:
    """当全局代理是 socks 时，应回退到可直接使用的 HTTP 代理。"""
    proxy = llm_client._resolve_http_proxy(
        {
            "ALL_PROXY": "socks5://127.0.0.1:1080",
            "HTTPS_PROXY": "socks5://127.0.0.1:1080",
            "HTTP_PROXY": "http://127.0.0.1:7890",
        },
    )

    assert proxy == "http://127.0.0.1:7890"


def test_langchain_chat_client_should_build_httpx_clients_with_trust_env_disabled(
    monkeypatch,
) -> None:
    """应禁用 httpx 的环境代理自动发现，避免启动阶段因 socks 依赖缺失失败。"""
    captured_sync_kwargs: dict[str, Any] = {}
    captured_async_kwargs: dict[str, Any] = {}
    captured_chat_kwargs: dict[str, Any] = {}

    sync_client_token = object()
    async_client_token = object()

    def fake_sync_client(**kwargs: Any) -> object:
        captured_sync_kwargs.update(kwargs)
        return sync_client_token

    def fake_async_client(**kwargs: Any) -> object:
        captured_async_kwargs.update(kwargs)
        return async_client_token

    class FakeChatOpenAI:
        def __init__(self, **kwargs: Any) -> None:
            captured_chat_kwargs.update(kwargs)

    monkeypatch.setattr(llm_client.httpx, "Client", fake_sync_client)
    monkeypatch.setattr(llm_client.httpx, "AsyncClient", fake_async_client)
    monkeypatch.setattr(llm_client, "ChatOpenAI", FakeChatOpenAI)

    monkeypatch.setenv("ALL_PROXY", "socks5://127.0.0.1:1080")
    monkeypatch.setenv("HTTPS_PROXY", "http://127.0.0.1:8888")

    llm_client.LangChainChatClient(model="gpt-4o-mini", api_key="test-key")

    assert captured_sync_kwargs == {"trust_env": False, "proxy": "http://127.0.0.1:8888"}
    assert captured_async_kwargs == {"trust_env": False, "proxy": "http://127.0.0.1:8888"}
    assert captured_chat_kwargs["http_client"] is sync_client_token
    assert captured_chat_kwargs["http_async_client"] is async_client_token
