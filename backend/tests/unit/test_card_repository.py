"""Card 仓储单元测试。"""

from datetime import UTC, datetime

import pytest

from app.card.repository import CardNotFoundError, InMemoryCardRepository
from app.deck.repository import DeckNotFoundError, InMemoryDeckRepository


def build_repository() -> tuple[InMemoryCardRepository, InMemoryDeckRepository]:
    """构建 card/deck 仓储组合，便于验证跨组逻辑。"""
    deck_repository = InMemoryDeckRepository()
    card_repository = InMemoryCardRepository(deck_repository=deck_repository)
    return card_repository, deck_repository


def test_list_by_deck_returns_cards_in_insert_order() -> None:
    """同一 deck 查询应按创建顺序返回。"""
    repository, deck_repository = build_repository()
    deck = deck_repository.ensure_default_deck("user-1")

    first = repository.create_card(user_id="user-1", deck_id=deck.deck_id, front_text="一", back_text="one")
    second = repository.create_card(user_id="user-1", deck_id=deck.deck_id, front_text="二", back_text="two")

    cards = repository.list_by_deck(user_id="user-1", deck_id=deck.deck_id)

    assert [card.card_id for card in cards] == [first.card_id, second.card_id]


def test_update_text_keeps_fsrs_state() -> None:
    """编辑文案不应改动 FSRS 调度字段。"""
    repository, deck_repository = build_repository()
    deck = deck_repository.ensure_default_deck("user-1")
    created = repository.create_card(
        user_id="user-1",
        deck_id=deck.deck_id,
        front_text="原文",
        back_text="original",
        due_at=datetime(2026, 3, 3, tzinfo=UTC),
        stability=6.6,
        difficulty=2.8,
        reps=3,
        lapses=1,
    )

    updated = repository.update_text(
        user_id="user-1",
        card_id=created.card_id,
        front_text="新文",
        back_text="updated",
    )

    assert updated.front_text == "新文"
    assert updated.back_text == "updated"
    assert updated.due_at == datetime(2026, 3, 3, tzinfo=UTC)
    assert updated.stability == 6.6
    assert updated.difficulty == 2.8
    assert updated.reps == 3
    assert updated.lapses == 1


def test_move_card_to_non_existent_deck_raises_error() -> None:
    """移动到不存在的目标组应报错。"""
    repository, deck_repository = build_repository()
    deck = deck_repository.ensure_default_deck("user-1")
    created = repository.create_card(user_id="user-1", deck_id=deck.deck_id, front_text="原文", back_text="text")

    with pytest.raises(DeckNotFoundError):
        repository.move_card(user_id="user-1", card_id=created.card_id, to_deck_id="missing")


def test_delete_then_get_card_raises_not_found() -> None:
    """删除后再次读取应返回未找到。"""
    repository, deck_repository = build_repository()
    deck = deck_repository.ensure_default_deck("user-1")
    created = repository.create_card(user_id="user-1", deck_id=deck.deck_id, front_text="原文", back_text="text")

    repository.delete_card(user_id="user-1", card_id=created.card_id)

    with pytest.raises(CardNotFoundError):
        repository.get_by_id(user_id="user-1", card_id=created.card_id)
