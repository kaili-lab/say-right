"""LangChain Chat 客户端封装。"""

from __future__ import annotations

from dataclasses import dataclass, field
import os
from collections.abc import Mapping
from typing import Protocol, cast

import httpx
from langchain_openai import ChatOpenAI
from pydantic import SecretStr


class ChatClient(Protocol):
    """聊天模型客户端协议。"""

    def complete(self, *, prompt: str) -> str:
        """发送 prompt 并返回文本响应。"""
        ...


def _resolve_http_proxy(env: Mapping[str, str] | None = None) -> str | None:
    """解析可被 httpx 直接使用的 HTTP(S) 代理地址。"""
    env_map = env or os.environ
    for key in ("HTTPS_PROXY", "https_proxy", "HTTP_PROXY", "http_proxy"):
        proxy_raw = env_map.get(key)
        if proxy_raw is None:
            continue
        proxy = proxy_raw.strip()
        if not proxy:
            continue
        # 做什么：跳过 socks 代理；原因：未安装 socksio 时会在应用启动阶段直接崩溃。
        if proxy.lower().startswith("socks"):
            continue
        return proxy
    return None


@dataclass(slots=True)
class LangChainChatClient:
    """基于 LangChain OpenAI-compatible 的聊天客户端。"""

    model: str
    api_key: str
    base_url: str | None = None
    temperature: float = 0.1
    _client: ChatOpenAI = field(init=False, repr=False)

    def __post_init__(self) -> None:
        proxy = _resolve_http_proxy()
        # 做什么：显式传入 httpx client 并禁用 trust_env；原因：避免机器全局 ALL_PROXY=socks5 触发依赖缺失导致启动失败。
        http_client = httpx.Client(trust_env=False, proxy=proxy)
        http_async_client = httpx.AsyncClient(trust_env=False, proxy=proxy)
        self._client = ChatOpenAI(
            model=self.model,
            api_key=SecretStr(self.api_key),
            base_url=self.base_url,
            temperature=self.temperature,
            http_client=http_client,
            http_async_client=http_async_client,
        )

    def complete(self, *, prompt: str) -> str:
        response = self._client.invoke(prompt)
        content = response.content
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            chunks: list[str] = []
            for item in content:
                if isinstance(item, str):
                    chunks.append(item)
                    continue
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        chunks.append(text)
            return "".join(chunks)
        return cast(str, content)
