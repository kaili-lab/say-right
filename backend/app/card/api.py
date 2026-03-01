"""Card API 路由层。"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator

from app.auth.service import AuthService
from app.card.repository import CardNotFoundError
from app.card.service import CardService, InvalidCardPayloadError
from app.deck.api import build_current_user_dependency
from app.deck.repository import DeckNotFoundError
from app.domain.models import Card, User


class CardReadResponse(BaseModel):
    """Card 查询/编辑/移动响应体。"""

    id: str
    deck_id: str
    front_text: str
    back_text: str
    source_lang: str
    target_lang: str
    due_at: datetime
    stability: float
    difficulty: float
    reps: int
    lapses: int


class CardPatchRequest(BaseModel):
    """编辑卡片请求体。"""

    front_text: str | None = Field(default=None, max_length=500)
    back_text: str | None = Field(default=None, max_length=500)

    @field_validator("front_text", "back_text")
    @classmethod
    def validate_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("card text must not be empty")
        return normalized


class CardMoveRequest(BaseModel):
    """移动卡片请求体。"""

    to_deck_id: str = Field(min_length=1, max_length=100)

    @field_validator("to_deck_id")
    @classmethod
    def validate_to_deck_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("to_deck_id must not be empty")
        return normalized


def _to_read_response(card: Card) -> CardReadResponse:
    return CardReadResponse(
        id=card.card_id,
        deck_id=card.deck_id,
        front_text=card.front_text,
        back_text=card.back_text,
        source_lang=card.source_lang,
        target_lang=card.target_lang,
        due_at=card.due_at,
        stability=card.stability,
        difficulty=card.difficulty,
        reps=card.reps,
        lapses=card.lapses,
    )


def create_card_router(card_service: CardService, auth_service: AuthService) -> APIRouter:
    """创建 card 路由。"""
    router = APIRouter(tags=["cards"])
    current_user_dependency = build_current_user_dependency(auth_service)

    @router.get("/decks/{deck_id}/cards", response_model=list[CardReadResponse])
    def list_cards(
        deck_id: str,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> list[CardReadResponse]:
        try:
            cards = card_service.list_cards(user_id=current_user.user_id, deck_id=deck_id)
        except DeckNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="deck not found",
            ) from exc

        return [_to_read_response(card) for card in cards]

    @router.patch("/cards/{card_id}", response_model=CardReadResponse)
    def update_card(
        card_id: str,
        payload: CardPatchRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> CardReadResponse:
        try:
            card = card_service.update_card(
                user_id=current_user.user_id,
                card_id=card_id,
                front_text=payload.front_text,
                back_text=payload.back_text,
            )
        except CardNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="card not found",
            ) from exc
        except InvalidCardPayloadError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="invalid card payload",
            ) from exc

        return _to_read_response(card)

    @router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_card(
        card_id: str,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> Response:
        try:
            card_service.delete_card(user_id=current_user.user_id, card_id=card_id)
        except CardNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="card not found",
            ) from exc

        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @router.post("/cards/{card_id}/move", response_model=CardReadResponse)
    def move_card(
        card_id: str,
        payload: CardMoveRequest,
        current_user: Annotated[User, Depends(current_user_dependency)],
    ) -> CardReadResponse:
        try:
            card = card_service.move_card(
                user_id=current_user.user_id,
                card_id=card_id,
                to_deck_id=payload.to_deck_id,
            )
        except CardNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="card not found",
            ) from exc
        except DeckNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="deck not found",
            ) from exc

        return _to_read_response(card)

    return router
