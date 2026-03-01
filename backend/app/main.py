"""FastAPI 应用装配入口。

本文件负责把路由、依赖与应用实例拼装在一起，
让 `uvicorn app.main:app` 有稳定且唯一的启动入口。
"""

from fastapi import FastAPI

from app.auth.api import create_auth_router
from app.auth.repository import InMemoryUserRepository
from app.auth.service import AuthService


def build_health_payload() -> dict[str, str]:
    """构造健康检查响应体。"""
    return {"status": "ok"}


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例。"""
    application = FastAPI(title="say-right-api")

    # 当前阶段先用内存仓储保证接口链路可跑通，后续再平滑替换为数据库实现。
    user_repository = InMemoryUserRepository()
    auth_service = AuthService(user_repository=user_repository)
    application.include_router(create_auth_router(auth_service=auth_service))

    @application.get("/health")
    async def health() -> dict[str, str]:
        """提供最小健康检查能力，供启动验证与监控探活使用。"""
        return build_health_payload()

    return application


app = create_app()
