"""Group Agent 的可复现 stub。"""

from dataclasses import dataclass

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
