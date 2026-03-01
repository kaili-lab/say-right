"""记录页生成英文相关领域异常。"""


class LLMUnavailableError(ValueError):
    """LLM 服务不可用。"""


class InvalidRecordGeneratePayloadError(ValueError):
    """生成请求参数非法。"""
