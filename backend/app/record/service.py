"""记录页英文生成服务层。"""

from dataclasses import dataclass
from hashlib import sha256
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
    model_hint: str
    trace_id: str


@dataclass(slots=True)
class RecordGenerateService:
    """记录页英文生成服务。"""

    generator: EnglishGenerator

    def generate(self, request: RecordGenerateRequest) -> RecordGenerateResult:
        """按契约生成英文并返回稳定 trace_id。"""
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
        trace_id = self._trace_id(
            source_text=normalized_source,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            model_hint=self.generator.model_hint,
        )

        return RecordGenerateResult(
            generated_text=generated_text,
            model_hint=self.generator.model_hint,
            trace_id=trace_id,
        )

    @staticmethod
    def _trace_id(*, source_text: str, source_lang: str, target_lang: str, model_hint: str) -> str:
        digest = sha256(f"{source_text}|{source_lang}|{target_lang}|{model_hint}".encode("utf-8")).hexdigest()
        return digest[:16]
