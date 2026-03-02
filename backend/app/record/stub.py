"""记录页英文生成器实现。"""

from dataclasses import dataclass
from typing import Final

from app.llm.client import ChatClient
from app.llm.text import LLMTextParseError, extract_first_json_object
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


@dataclass(slots=True)
class LangChainEnglishGenerator:
    """基于 LLM 的英文生成器。"""

    client: ChatClient
    model_hint: str

    def generate(self, *, source_text: str, source_lang: str, target_lang: str) -> str:
        prompt = (
            "你是中译英表达教练。\\n"
            "请把输入的中文改写成自然口语英文。\\n"
            "只返回 JSON 对象，格式：{\"english\": \"...\"}。\\n"
            f"source_lang={source_lang}, target_lang={target_lang}\\n"
            f"中文：{source_text}\\n"
        )
        try:
            raw = self.client.complete(prompt=prompt)
            payload = extract_first_json_object(raw)
            english = payload.get("english")
            if not isinstance(english, str) or not english.strip():
                raise LLMUnavailableError("invalid generated payload")
            return english.strip()
        except (LLMTextParseError, LLMUnavailableError):
            raise
        except Exception as exc:  # noqa: BLE001
            raise LLMUnavailableError("provider unavailable") from exc
