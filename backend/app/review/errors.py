"""复习流程相关领域异常。"""


class ReviewSessionNotFoundError(ValueError):
    """复习 session 不存在。"""


class ReviewCardNotInSessionError(ValueError):
    """卡片不在当前 session 中。"""


class ReviewAIUnavailableError(ValueError):
    """AI 评分服务不可用。"""
