"""LLM 运行态配置与输出解析测试。"""

import pytest

from app.llm.runtime import LLMConfig, resolve_llm_config
from app.llm.text import extract_first_json_object


def test_resolve_llm_config_defaults_to_deterministic_mode() -> None:
    """未配置时应默认 deterministic，保证本地与 CI 可复现。"""
    config = resolve_llm_config({})

    assert config == LLMConfig(mode="deterministic", model="gpt-4o-mini", api_key=None, base_url=None)


def test_resolve_llm_config_requires_api_key_in_provider_mode() -> None:
    """provider 模式缺少 key 时应直接失败。"""
    with pytest.raises(ValueError, match="LLM_API_KEY"):
        resolve_llm_config({"LLM_MODE": "provider", "LLM_MODEL": "gpt-4o-mini"})


def test_extract_first_json_object_should_parse_model_output_with_prefix() -> None:
    """模型返回前后包裹文本时，仍应提取第一个 JSON 对象。"""
    payload = extract_first_json_object('结果如下：{"score": 90, "label": "good"}，请查收')

    assert payload == {"score": 90, "label": "good"}
