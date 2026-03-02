"""LangChain Chat 客户端封装。"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol, cast

from langchain_openai import ChatOpenAI
from pydantic import SecretStr


class ChatClient(Protocol):
    """聊天模型客户端协议。"""

    def complete(self, *, prompt: str) -> str:
        """发送 prompt 并返回文本响应。"""
        ...


@dataclass(slots=True)
class LangChainChatClient:
    """基于 LangChain OpenAI-compatible 的聊天客户端。"""

    model: str
    api_key: str
    base_url: str | None = None
    temperature: float = 0.1
    _client: ChatOpenAI = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self._client = ChatOpenAI(
            model=self.model,
            api_key=SecretStr(self.api_key),
            base_url=self.base_url,
            temperature=self.temperature,
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
