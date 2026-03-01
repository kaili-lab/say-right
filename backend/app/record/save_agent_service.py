"""save-with-agent 编排服务层。"""

from dataclasses import dataclass
from hashlib import sha1
from typing import Protocol

from app.card.service import CardService
from app.deck.repository import DuplicateDeckNameError
from app.deck.service import DeckService, InvalidDeckNameError
from app.domain.models import Deck
from app.record.errors import AgentUnavailableError, InvalidSaveWithAgentPayloadError
from app.record.group_agent_stub import GroupDecision


class GroupAgent(Protocol):
    """分组 Agent 协议。"""

    def decide(self, *, source_text: str, generated_text: str) -> GroupDecision:
        """返回分组决策。"""
        ...


@dataclass(slots=True, frozen=True)
class SaveWithAgentResult:
    """save-with-agent 响应数据。"""

    card_id: str
    deck_id: str
    deck_name: str
    deck_created: bool
    fallback_used: bool


@dataclass(slots=True)
class SaveWithAgentService:
    """记录保存编排服务。"""

    deck_service: DeckService
    card_service: CardService
    group_agent: GroupAgent

    def save(
        self,
        *,
        user_id: str,
        source_text: str,
        generated_text: str,
        source_lang: str,
        target_lang: str,
    ) -> SaveWithAgentResult:
        """执行保存链路：优先命中/建组，失败回退默认组。"""
        normalized_source = source_text.strip()
        normalized_generated = generated_text.strip()

        if not normalized_source or not normalized_generated:
            raise InvalidSaveWithAgentPayloadError("source_text or generated_text must not be empty")
        if source_lang != "zh" or target_lang != "en":
            raise InvalidSaveWithAgentPayloadError("unsupported language pair")

        decks = self.deck_service.list_decks(user_id=user_id)
        default_deck = self._require_default_deck(decks)

        fallback_used = False
        deck_created = False
        target_deck: Deck | None = default_deck

        try:
            decision = self.group_agent.decide(
                source_text=normalized_source,
                generated_text=normalized_generated,
            )
            target_name = decision.deck_name or self._derive_deck_name(normalized_source)

            target_deck = self._find_deck_by_name(decks, target_name)
            if target_deck is None:
                try:
                    target_deck = self.deck_service.create_deck(user_id=user_id, name=target_name)
                    deck_created = True
                except DuplicateDeckNameError:
                    # 并发创建同名组时，回读最新列表复用已存在组，避免请求失败。
                    decks = self.deck_service.list_decks(user_id=user_id)
                    target_deck = self._find_deck_by_name(decks, target_name)
                    if target_deck is None:
                        target_deck = default_deck
                        fallback_used = True
                except InvalidDeckNameError:
                    target_deck = default_deck
                    fallback_used = True
        except AgentUnavailableError:
            target_deck = default_deck
            fallback_used = True

        if target_deck is None:
            target_deck = default_deck
            fallback_used = True

        card = self.card_service.create_card(
            user_id=user_id,
            deck_id=target_deck.deck_id,
            front_text=normalized_source,
            back_text=normalized_generated,
            source_lang=source_lang,
            target_lang=target_lang,
        )
        return SaveWithAgentResult(
            card_id=card.card_id,
            deck_id=target_deck.deck_id,
            deck_name=target_deck.name,
            deck_created=deck_created,
            fallback_used=fallback_used,
        )

    @staticmethod
    def _find_deck_by_name(decks: list[Deck], deck_name: str) -> Deck | None:
        normalized = deck_name.strip().lower()
        for deck in decks:
            if deck.name.strip().lower() == normalized:
                return deck
        return None

    @staticmethod
    def _require_default_deck(decks: list[Deck]) -> Deck:
        for deck in decks:
            if deck.is_default:
                return deck
        raise RuntimeError("default deck missing")

    @staticmethod
    def _derive_deck_name(source_text: str) -> str:
        digest = sha1(source_text.encode("utf-8")).hexdigest()[:6]
        return f"Auto-{digest}"
