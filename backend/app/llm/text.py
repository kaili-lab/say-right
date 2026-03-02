"""LLM 文本处理工具。"""

from __future__ import annotations

import json


class LLMTextParseError(ValueError):
    """LLM 文本解析失败。"""


def extract_first_json_object(raw_text: str) -> dict[str, object]:
    """从模型输出里提取第一个 JSON 对象。"""
    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start < 0 or end <= start:
        raise LLMTextParseError("no json object found")

    json_text = raw_text[start : end + 1]
    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        raise LLMTextParseError("invalid json object") from exc

    if not isinstance(parsed, dict):
        raise LLMTextParseError("json payload must be an object")
    return parsed
