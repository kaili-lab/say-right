"""记录页英文生成 API 路由层。"""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth.service import AuthService
from app.deck.api import build_current_user_dependency
from app.domain.models import User
from app.record.errors import (
    AgentDeckNotFoundError,
    AgentUnavailableError,
    InvalidRecordGeneratePayloadError,
    InvalidSaveWithAgentPayloadError,
    LLMUnavailableError,
)
from app.record.service import RecordGenerateRequest, RecordGenerateResult, RecordGenerateService
from app.record.save_agent_service import SaveWithAgentResult, SaveWithAgentService


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


class SaveWithAgentApiRequest(BaseModel):
    """save-with-agent 请求体。"""

    source_text: str = Field(min_length=1, max_length=200)
    generated_text: str = Field(min_length=1, max_length=500)
    source_lang: Literal["zh"]
    target_lang: Literal["en"]

    @field_validator("source_text", "generated_text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("text must not be empty")
        return normalized


class SaveWithAgentApiResponse(BaseModel):
    """save-with-agent 响应体。"""

    card_id: str
    deck_id: str
    deck_name: str
    deck_created: bool
    fallback_used: bool


def _to_response(result: RecordGenerateResult) -> RecordGenerateApiResponse:
    return RecordGenerateApiResponse(
        generated_text=result.generated_text,
        model_hint=result.model_hint,
        trace_id=result.trace_id,
    )


def _to_save_response(result: SaveWithAgentResult) -> SaveWithAgentApiResponse:
    return SaveWithAgentApiResponse(
        card_id=result.card_id,
        deck_id=result.deck_id,
        deck_name=result.deck_name,
        deck_created=result.deck_created,
        fallback_used=result.fallback_used,
    )


def create_record_router(
    record_service: RecordGenerateService,
    save_with_agent_service: SaveWithAgentService,
    auth_service: AuthService,
) -> APIRouter:
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
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="invalid generate payload",
            ) from exc
        except LLMUnavailableError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="llm unavailable",
            ) from exc

        return _to_response(result)

    @router.post(
        "/records/save-with-agent",
        status_code=status.HTTP_201_CREATED,
        response_model=SaveWithAgentApiResponse,
    )
    def save_with_agent(
        payload: SaveWithAgentApiRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> SaveWithAgentApiResponse:
        try:
            result = save_with_agent_service.save(
                user_id=current_user.user_id,
                source_text=payload.source_text,
                generated_text=payload.generated_text,
                source_lang=payload.source_lang,
                target_lang=payload.target_lang,
            )
        except InvalidSaveWithAgentPayloadError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="invalid save payload",
            ) from exc
        except AgentDeckNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="no matched deck",
            ) from exc
        except AgentUnavailableError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="group agent unavailable",
            ) from exc

        return _to_save_response(result)

    return router
