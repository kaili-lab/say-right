"""记录页英文生成 API 路由层。"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth.service import AuthService
from app.deck.api import build_current_user_dependency
from app.domain.models import User
from app.record.errors import InvalidRecordGeneratePayloadError, LLMUnavailableError
from app.record.service import RecordGenerateRequest, RecordGenerateResult, RecordGenerateService


class RecordGenerateApiRequest(BaseModel):
    """生成英文请求体。"""

    source_text: str = Field(min_length=1, max_length=200)
    source_lang: Literal["zh"]
    target_lang: Literal["en"]

    @field_validator("source_text")
    @classmethod
    def validate_source_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("source_text must not be empty")
        return normalized


class RecordGenerateApiResponse(BaseModel):
    """生成英文响应体。"""

    generated_text: str
    model_hint: str
    trace_id: str


def _to_response(result: RecordGenerateResult) -> RecordGenerateApiResponse:
    return RecordGenerateApiResponse(
        generated_text=result.generated_text,
        model_hint=result.model_hint,
        trace_id=result.trace_id,
    )


def create_record_router(record_service: RecordGenerateService, auth_service: AuthService) -> APIRouter:
    """创建记录页生成英文路由。"""
    router = APIRouter(tags=["records"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.post("/records/generate", response_model=RecordGenerateApiResponse)
    def generate_record(
        payload: RecordGenerateApiRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> RecordGenerateApiResponse:
        # 鉴权通过即可，不需要在该接口使用用户实体字段。
        _ = current_user

        try:
            result = record_service.generate(
                RecordGenerateRequest(
                    source_text=payload.source_text,
                    source_lang=payload.source_lang,
                    target_lang=payload.target_lang,
                ),
            )
        except InvalidRecordGeneratePayloadError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="invalid generate payload",
            ) from exc
        except LLMUnavailableError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="llm unavailable",
            ) from exc

        return _to_response(result)

    return router
