"""Deck 仓储层单元测试。"""

import pytest

from app.deck.repository import (
    DeckNotEmptyError,
    DeckNotFoundError,
    DefaultDeckDeleteForbiddenError,
    DuplicateDeckNameError,
    InMemoryDeckRepository,
)


def test_ensure_default_deck_is_idempotent() -> None:
    """同一用户重复初始化默认组时，必须保持唯一且稳定。"""
    repository = InMemoryDeckRepository()

    first = repository.ensure_default_deck("user-1")
    second = repository.ensure_default_deck("user-1")
    all_decks = repository.list_by_user("user-1")

    assert first.deck_id == second.deck_id
    assert len(all_decks) == 1
    assert all_decks[0].is_default is True


def test_add_custom_deck_success() -> None:
    """创建自定义组后，列表中应包含默认组和新组。"""
    repository = InMemoryDeckRepository()

    created = repository.add_custom_deck(user_id="user-1", name="Travel")
    all_decks = repository.list_by_user("user-1")

    assert created.name == "Travel"
    assert created.is_default is False
    assert len(all_decks) == 2


def test_add_custom_deck_duplicate_name_returns_error() -> None:
    """同一用户下 deck 名称冲突应报错（忽略大小写和前后空格）。"""
    repository = InMemoryDeckRepository()
    repository.add_custom_deck(user_id="user-1", name="Travel")

    with pytest.raises(DuplicateDeckNameError):
        repository.add_custom_deck(user_id="user-1", name="  travel  ")


def test_add_custom_deck_allows_same_name_for_different_users() -> None:
    """不同用户应允许创建同名 deck。"""
    repository = InMemoryDeckRepository()

    deck1 = repository.add_custom_deck(user_id="user-1", name="Travel")
    deck2 = repository.add_custom_deck(user_id="user-2", name="Travel")

    assert deck1.name == deck2.name
    assert deck1.deck_id != deck2.deck_id


def test_delete_default_deck_raises_error() -> None:
    """默认组删除应被拒绝。"""
    repository = InMemoryDeckRepository()
    default_deck = repository.ensure_default_deck("user-1")

    with pytest.raises(DefaultDeckDeleteForbiddenError):
        repository.delete_deck(user_id="user-1", deck_id=default_deck.deck_id)


def test_delete_non_empty_deck_raises_error() -> None:
    """有卡片的非默认组删除应被拒绝。"""
    repository = InMemoryDeckRepository()
    created = repository.add_custom_deck(user_id="user-1", name="Travel")
    repository.update_counts(deck_id=created.deck_id, new_count=1, learning_count=0, due_count=0)

    with pytest.raises(DeckNotEmptyError):
        repository.delete_deck(user_id="user-1", deck_id=created.deck_id)


def test_delete_empty_deck_success_and_second_delete_not_found() -> None:
    """空组可删；重复删除应返回未找到。"""
    repository = InMemoryDeckRepository()
    created = repository.add_custom_deck(user_id="user-1", name="Travel")

    repository.delete_deck(user_id="user-1", deck_id=created.deck_id)

    with pytest.raises(DeckNotFoundError):
        repository.delete_deck(user_id="user-1", deck_id=created.deck_id)
