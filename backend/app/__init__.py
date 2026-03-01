"""say-right 后端应用包。

对外导出应用对象与工厂函数，方便测试和启动统一引用。
"""

from app.main import app, create_app

__all__ = ["app", "create_app"]
