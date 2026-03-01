"""记录页生成英文相关领域异常。"""


class LLMUnavailableError(ValueError):
    """LLM 服务不可用。"""


class InvalidRecordGeneratePayloadError(ValueError):
    """生成请求参数非法。"""


class AgentUnavailableError(ValueError):
    """分组 Agent 当前不可用。"""


class AgentDeckNotFoundError(ValueError):
    """Agent 给出的目标组在用户组列表中不存在。"""


class InvalidSaveWithAgentPayloadError(ValueError):
    """save-with-agent 请求参数非法。"""
