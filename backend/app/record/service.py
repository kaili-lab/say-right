"""记录页英文生成服务层。"""

from dataclasses import dataclass
from typing import Protocol

from app.record.errors import InvalidRecordGeneratePayloadError


class EnglishGenerator(Protocol):
    """英文生成器协议。"""

    model_hint: str

    def generate(self, *, source_text: str, source_lang: str, target_lang: str) -> str:
        """执行英文生成。"""
        ...


@dataclass(slots=True, frozen=True)
class RecordGenerateRequest:
    """生成请求对象。"""

    source_text: str
    source_lang: str
    target_lang: str


@dataclass(slots=True, frozen=True)
class RecordGenerateResult:
    """生成结果对象。"""

    generated_text: str


@dataclass(slots=True)
class RecordGenerateService:
    """记录页英文生成服务。"""

    generator: EnglishGenerator

    def generate(self, request: RecordGenerateRequest) -> RecordGenerateResult:
        """生成英文并返回结果。"""
        normalized_source = request.source_text.strip()
        if not normalized_source:
            raise InvalidRecordGeneratePayloadError("source_text must not be empty")

        if request.source_lang != "zh" or request.target_lang != "en":
            raise InvalidRecordGeneratePayloadError("unsupported language pair")

        generated_text = self.generator.generate(
            source_text=normalized_source,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
        )

        return RecordGenerateResult(generated_text=generated_text)
