"""Deck API 路由层。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator

from app.auth.api import extract_bearer_token
from app.auth.service import AuthService, UnauthorizedError
from app.deck.repository import (
    DeckNotEmptyError,
    DeckNotFoundError,
    DefaultDeckDeleteForbiddenError,
    DuplicateDeckNameError,
)
from app.deck.service import DeckService, InvalidDeckNameError
from app.domain.models import Deck, User


class DeckCreateRequest(BaseModel):
    """创建 deck 请求体。"""

    name: str = Field(min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("deck name must not be empty")
        return normalized


class DeckListItem(BaseModel):
    """Deck 列表项。"""

    id: str
    name: str
    is_default: bool
    new_count: int
    learning_count: int
    due_count: int


class DeckCreateResponse(BaseModel):
    """创建 deck 成功响应体。"""

    id: str
    name: str
    is_default: bool


def _to_list_item(deck: Deck) -> DeckListItem:
    return DeckListItem(
        id=deck.deck_id,
        name=deck.name,
        is_default=deck.is_default,
        new_count=deck.new_count,
        learning_count=deck.learning_count,
        due_count=deck.due_count,
    )


def _to_create_response(deck: Deck) -> DeckCreateResponse:
    return DeckCreateResponse(
        id=deck.deck_id,
        name=deck.name,
        is_default=deck.is_default,
    )


def build_current_user_dependency(auth_service: AuthService):
    """构建当前用户依赖，供 deck 路由复用。"""

    def dependency(token: Annotated[str, Depends(extract_bearer_token)]) -> User:
        try:
            return auth_service.get_current_user(access_token=token)
        except UnauthorizedError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="invalid access token",
            ) from exc

    return dependency


def create_deck_router(deck_service: DeckService, auth_service: AuthService) -> APIRouter:
    """创建 deck 路由。"""
    router = APIRouter(tags=["decks"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.get("/decks", response_model=list[DeckListItem])
    def list_decks(current_user: Annotated[User, Depends(current_user_dependency)]) -> list[DeckListItem]:
        decks = deck_service.list_decks(user_id=current_user.user_id)
        return [_to_list_item(deck) for deck in decks]

    @router.post("/decks", status_code=status.HTTP_201_CREATED, response_model=DeckCreateResponse)
    def create_deck(
        payload: DeckCreateRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> DeckCreateResponse:
        try:
            deck = deck_service.create_deck(user_id=current_user.user_id, name=payload.name)
        except DuplicateDeckNameError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="duplicate deck name",
            ) from exc
        except InvalidDeckNameError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="invalid deck name",
            ) from exc

        return _to_create_response(deck)

    @router.delete("/decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_deck(
        deck_id: str,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> Response:
        try:
            deck_service.delete_deck(user_id=current_user.user_id, deck_id=deck_id)
        except DeckNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="deck not found",
            ) from exc
        except (DefaultDeckDeleteForbiddenError, DeckNotEmptyError) as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="deck cannot be deleted",
            ) from exc

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
