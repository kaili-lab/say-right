"""记录页英文生成服务单元测试。"""

import pytest

from app.record.errors import LLMUnavailableError
from app.record.service import RecordGenerateRequest, RecordGenerateService
from app.record.stub import DeterministicEnglishGenerator


def build_service() -> RecordGenerateService:
    """构建使用可复现 stub 的服务实例。"""
    return RecordGenerateService(generator=DeterministicEnglishGenerator())


def test_generate_returns_deterministic_response() -> None:
    """相同输入应稳定返回相同生成结果与 trace_id。"""
    service = build_service()
    request = RecordGenerateRequest(source_text="我想喝水", source_lang="zh", target_lang="en")

    first = service.generate(request)
    second = service.generate(request)

    assert first.generated_text == second.generated_text
    assert first.trace_id == second.trace_id
    assert first.model_hint == "stub:deterministic-v1"


def test_generate_uses_fixture_translation_when_available() -> None:
    """命中 fixture 时应优先返回固定翻译，确保测试可复现。"""
    service = build_service()

    result = service.generate(
        RecordGenerateRequest(source_text="你好", source_lang="zh", target_lang="en"),
    )

    assert result.generated_text == "Hello."


def test_generate_raises_unavailable_for_stub_failure_token() -> None:
    """模拟模型不可用场景，服务应抛出可映射的业务异常。"""
    service = build_service()

    with pytest.raises(LLMUnavailableError):
        service.generate(
            RecordGenerateRequest(source_text="__FAIL_STUB__", source_lang="zh", target_lang="en"),
        )
