"""Group Agent 的可复现 stub。"""

from dataclasses import dataclass

from app.llm.client import ChatClient
from app.llm.text import LLMTextParseError, extract_first_json_object
from app.record.errors import AgentUnavailableError


@dataclass(slots=True, frozen=True)
class GroupDecision:
    """分组决策结果。"""

    deck_name: str | None


class DeterministicGroupAgent:
    """使用关键词匹配模拟分组命中，便于在测试中稳定复现。"""

    def decide(self, *, source_text: str, generated_text: str) -> GroupDecision:
        """根据输入文本返回目标组名，未命中时返回空结果。"""
        if "__AGENT_ERROR__" in source_text or "__AGENT_ERROR__" in generated_text:
            raise AgentUnavailableError("group agent unavailable")
        if "__INVALID_DECK_NAME__" in source_text or "__INVALID_DECK_NAME__" in generated_text:
            return GroupDecision(deck_name="   ")

        normalized = f"{source_text} {generated_text}".lower()
        if "travel" in normalized or "旅行" in source_text:
            return GroupDecision(deck_name="Travel")
        if "food" in normalized or "吃" in source_text:
            return GroupDecision(deck_name="Food")
        return GroupDecision(deck_name=None)


@dataclass(slots=True)
class LangChainGroupAgent:
    """基于 LLM 的分组决策器。"""

    client: ChatClient
    model_hint: str

    def decide(self, *, source_text: str, generated_text: str) -> GroupDecision:
        prompt = (
            "你是英语学习卡片分组助手。\\n"
            "请根据中英文内容推荐最合适的卡片组名称。\\n"
            "若不建议创建分组，请返回 null。\\n"
            "只返回 JSON：{\"deck_name\": \"...\"} 或 {\"deck_name\": null}\\n"
            f"中文：{source_text}\\n"
            f"英文：{generated_text}\\n"
        )
        try:
            raw = self.client.complete(prompt=prompt)
            payload = extract_first_json_object(raw)
            deck_name = payload.get("deck_name")
            if deck_name is None:
                return GroupDecision(deck_name=None)
            if not isinstance(deck_name, str):
                raise AgentUnavailableError("invalid deck_name payload")
            normalized = deck_name.strip()
            if not normalized:
                return GroupDecision(deck_name=None)
            return GroupDecision(deck_name=normalized[:100])
        except (LLMTextParseError, AgentUnavailableError):
            raise
        except Exception as exc:  # noqa: BLE001
            raise AgentUnavailableError("group agent unavailable") from exc
