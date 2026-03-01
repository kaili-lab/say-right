"""记录页英文生成的可复现 stub 实现。"""

from typing import Final

from app.record.errors import LLMUnavailableError

FAILURE_TOKEN: Final[str] = "__FAIL_STUB__"


class DeterministicEnglishGenerator:
    """使用固定 fixture 的生成器，保证测试与本地联调可复现。"""

    model_hint = "stub:deterministic-v1"

    _fixtures: Final[dict[str, str]] = {
        "你好": "Hello.",
        "谢谢": "Thank you.",
        "我想喝水": "I want to drink water.",
        "你好吗": "How are you?",
    }

    def generate(self, *, source_text: str, source_lang: str, target_lang: str) -> str:
        """按输入返回固定结果；特定 token 用于稳定触发不可用分支。"""
        if source_text == FAILURE_TOKEN:
            raise LLMUnavailableError("stub model unavailable")

        fixture = self._fixtures.get(source_text)
        if fixture is not None:
            return fixture

        return f"{source_text} (in English)"
