"""LLM 运行时配置解析。"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal, cast

LLMMode = Literal["deterministic", "provider"]

_LLM_MODE_ENV_KEY = "LLM_MODE"
_LLM_MODEL_ENV_KEY = "LLM_MODEL"
_LLM_API_KEY_ENV_KEY = "LLM_API_KEY"
_LLM_BASE_URL_ENV_KEY = "LLM_BASE_URL"


@dataclass(slots=True, frozen=True)
class LLMConfig:
    """LLM 配置快照。"""

    mode: LLMMode
    model: str
    api_key: str | None
    base_url: str | None


def resolve_llm_config(env: dict[str, str] | None = None) -> LLMConfig:
    """解析 LLM 配置，默认 deterministic 以保证测试可复现。"""
    env_map = env or os.environ
    mode_raw = env_map.get(_LLM_MODE_ENV_KEY, "deterministic").strip().lower()
    if mode_raw not in {"deterministic", "provider"}:
        raise ValueError("LLM_MODE must be one of: deterministic, provider")

    model = env_map.get(_LLM_MODEL_ENV_KEY, "gpt-4o-mini").strip() or "gpt-4o-mini"
    api_key = env_map.get(_LLM_API_KEY_ENV_KEY, "").strip() or None
    base_url = env_map.get(_LLM_BASE_URL_ENV_KEY, "").strip() or None

    if mode_raw == "provider" and api_key is None:
        raise ValueError("LLM_API_KEY is required when LLM_MODE=provider")

    return LLMConfig(
        mode=cast(LLMMode, mode_raw),
        model=model,
        api_key=api_key,
        base_url=base_url,
    )
