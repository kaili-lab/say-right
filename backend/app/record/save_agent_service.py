"""save-with-agent 编排服务层。"""

from dataclasses import dataclass
from typing import Protocol

from app.card.service import CardService
from app.deck.service import DeckService
from app.record.errors import AgentDeckNotFoundError, InvalidSaveWithAgentPayloadError
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
        """执行命中已有组分支并创建卡片。"""
        normalized_source = source_text.strip()
        normalized_generated = generated_text.strip()

        if not normalized_source or not normalized_generated:
            raise InvalidSaveWithAgentPayloadError("source_text or generated_text must not be empty")
        if source_lang != "zh" or target_lang != "en":
            raise InvalidSaveWithAgentPayloadError("unsupported language pair")

        decision = self.group_agent.decide(
            source_text=normalized_source,
            generated_text=normalized_generated,
        )
        if decision.deck_name is None:
            raise AgentDeckNotFoundError("no matched deck")

        decks = self.deck_service.list_decks(user_id=user_id)
        matched_deck = next(
            (deck for deck in decks if deck.name.strip().lower() == decision.deck_name.strip().lower()),
            None,
        )
        if matched_deck is None:
            raise AgentDeckNotFoundError("no matched deck")

        card = self.card_service.create_card(
            user_id=user_id,
            deck_id=matched_deck.deck_id,
            front_text=normalized_source,
            back_text=normalized_generated,
            source_lang=source_lang,
            target_lang=target_lang,
        )
        return SaveWithAgentResult(
            card_id=card.card_id,
            deck_id=matched_deck.deck_id,
            deck_name=matched_deck.name,
            deck_created=False,
            fallback_used=False,
        )
