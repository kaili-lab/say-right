"""复习会话与日志仓储实现。"""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime
from threading import Lock
from typing import Literal, Protocol, cast
from uuid import uuid4

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

RatingSource = Literal["manual", "ai"]
RatingValue = Literal["again", "hard", "good", "easy"]


@dataclass(slots=True, frozen=True)
class ReviewSessionRecord:
    """复习 session 持久化记录。"""

    session_id: str
    user_id: str
    deck_id: str
    created_at: datetime


@dataclass(slots=True, frozen=True)
class ReviewLogEntry:
    """单次评级日志。"""

    review_log_id: str
    user_id: str
    card_id: str
    session_id: str
    rating_source: RatingSource
    final_rating: RatingValue
    is_new_card: bool
    rated_at: datetime
    fsrs_snapshot: dict[str, object]

    @classmethod
    def create(
        cls,
        *,
        user_id: str,
        card_id: str,
        session_id: str,
        rating_source: RatingSource,
        final_rating: RatingValue,
        is_new_card: bool,
        fsrs_snapshot: dict[str, object],
        rated_at: datetime | None = None,
    ) -> "ReviewLogEntry":
        return cls(
            review_log_id=str(uuid4()),
            user_id=user_id,
            card_id=card_id,
            session_id=session_id,
            rating_source=rating_source,
            final_rating=final_rating,
            is_new_card=is_new_card,
            rated_at=rated_at or datetime.now(UTC),
            fsrs_snapshot=fsrs_snapshot,
        )


class ReviewSessionRepository(Protocol):
    """复习 session 仓储协议。"""

    def create_session(self, *, user_id: str, deck_id: str, card_ids: list[str]) -> ReviewSessionRecord:
        """创建 session 并关联卡片。"""
        ...

    def get_session(self, *, session_id: str) -> ReviewSessionRecord | None:
        """按 ID 查询 session。"""
        ...

    def list_session_card_ids(self, *, session_id: str) -> list[str]:
        """读取 session 绑定的卡片 ID。"""
        ...


class ReviewLogRepository(Protocol):
    """复习日志仓储协议。"""

    def add_log(self, entry: ReviewLogEntry) -> None:
        """写入单条日志。"""
        ...

    def list_by_session(self, *, user_id: str, session_id: str) -> list[ReviewLogEntry]:
        """按 session 查询日志。"""
        ...

    def count_daily_by_kind(self, *, user_id: str, target_date: date, is_new_card: bool) -> int:
        """统计当日新卡/复习卡已评级数量。"""
        ...

    def list_by_user(self, *, user_id: str) -> list[ReviewLogEntry]:
        """按用户查询日志。"""
        ...


class InMemoryReviewSessionRepository(ReviewSessionRepository):
    """内存版复习 session 仓储。"""

    def __init__(self) -> None:
        self._sessions: dict[str, ReviewSessionRecord] = {}
        self._card_ids_by_session: dict[str, list[str]] = {}
        self._lock = Lock()

    def create_session(self, *, user_id: str, deck_id: str, card_ids: list[str]) -> ReviewSessionRecord:
        with self._lock:
            session = ReviewSessionRecord(
                session_id=str(uuid4()),
                user_id=user_id,
                deck_id=deck_id,
                created_at=datetime.now(UTC),
            )
            self._sessions[session.session_id] = session
            self._card_ids_by_session[session.session_id] = card_ids.copy()
            return session

    def get_session(self, *, session_id: str) -> ReviewSessionRecord | None:
        return self._sessions.get(session_id)

    def list_session_card_ids(self, *, session_id: str) -> list[str]:
        return self._card_ids_by_session.get(session_id, []).copy()


class InMemoryReviewLogRepository(ReviewLogRepository):
    """内存版复习日志仓储。"""

    def __init__(self) -> None:
        self._logs: list[ReviewLogEntry] = []
        self._lock = Lock()

    def add_log(self, entry: ReviewLogEntry) -> None:
        with self._lock:
            self._logs.append(entry)

    def list_by_session(self, *, user_id: str, session_id: str) -> list[ReviewLogEntry]:
        with self._lock:
            matched = [
                log
                for log in self._logs
                if log.user_id == user_id and log.session_id == session_id
            ]
        return sorted(matched, key=lambda item: item.rated_at)

    def count_daily_by_kind(self, *, user_id: str, target_date: date, is_new_card: bool) -> int:
        with self._lock:
            return sum(
                1
                for log in self._logs
                if log.user_id == user_id
                and log.is_new_card == is_new_card
                and log.rated_at.date() == target_date
            )

    def list_by_user(self, *, user_id: str) -> list[ReviewLogEntry]:
        with self._lock:
            matched = [log for log in self._logs if log.user_id == user_id]
        return sorted(matched, key=lambda item: item.rated_at, reverse=True)


class PostgresReviewSessionRepository(ReviewSessionRepository):
    """PostgreSQL 版复习 session 仓储。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        self._pool = pool

    def create_session(self, *, user_id: str, deck_id: str, card_ids: list[str]) -> ReviewSessionRecord:
        session = ReviewSessionRecord(
            session_id=str(uuid4()),
            user_id=user_id,
            deck_id=deck_id,
            created_at=datetime.now(UTC),
        )
        with self._pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO review_sessions (session_id, user_id, deck_id, created_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        session.session_id,
                        session.user_id,
                        session.deck_id,
                        session.created_at,
                    ),
                )
                rows = [
                    (session.session_id, card_id, index)
                    for index, card_id in enumerate(card_ids)
                ]
                if rows:
                    cursor.executemany(
                        """
                        INSERT INTO review_session_cards (session_id, card_id, ord)
                        VALUES (%s, %s, %s)
                        """,
                        rows,
                    )
        return session

    def get_session(self, *, session_id: str) -> ReviewSessionRecord | None:
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT session_id, user_id, deck_id, created_at
                    FROM review_sessions
                    WHERE session_id = %s
                    LIMIT 1
                    """,
                    (session_id,),
                )
                row = cursor.fetchone()
        if row is None:
            return None
        return _row_to_review_session(row)

    def list_session_card_ids(self, *, session_id: str) -> list[str]:
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT card_id
                    FROM review_session_cards
                    WHERE session_id = %s
                    ORDER BY ord ASC
                    """,
                    (session_id,),
                )
                rows = cursor.fetchall()
        return [str(row["card_id"]) for row in rows]


class PostgresReviewLogRepository(ReviewLogRepository):
    """PostgreSQL 版复习日志仓储。"""

    def __init__(self, *, pool: ConnectionPool) -> None:
        self._pool = pool

    def add_log(self, entry: ReviewLogEntry) -> None:
        with self._pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO review_logs (
                        review_log_id,
                        user_id,
                        card_id,
                        session_id,
                        rating_source,
                        final_rating,
                        is_new_card,
                        rated_at,
                        fsrs_snapshot
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                    """,
                    (
                        entry.review_log_id,
                        entry.user_id,
                        entry.card_id,
                        entry.session_id,
                        entry.rating_source,
                        entry.final_rating,
                        entry.is_new_card,
                        entry.rated_at,
                        json.dumps(entry.fsrs_snapshot, ensure_ascii=False),
                    ),
                )

    def list_by_session(self, *, user_id: str, session_id: str) -> list[ReviewLogEntry]:
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        review_log_id,
                        user_id,
                        card_id,
                        session_id,
                        rating_source,
                        final_rating,
                        is_new_card,
                        rated_at,
                        fsrs_snapshot
                    FROM review_logs
                    WHERE user_id = %s AND session_id = %s
                    ORDER BY rated_at ASC, review_log_id ASC
                    """,
                    (user_id, session_id),
                )
                rows = cursor.fetchall()
        return [_row_to_review_log(row) for row in rows]

    def count_daily_by_kind(self, *, user_id: str, target_date: date, is_new_card: bool) -> int:
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT COUNT(*) AS total
                    FROM review_logs
                    WHERE user_id = %s
                      AND is_new_card = %s
                      AND rated_at::date = %s
                    """,
                    (user_id, is_new_card, target_date),
                )
                row = cursor.fetchone()
        if row is None:
            return 0
        return cast(int, row["total"])

    def list_by_user(self, *, user_id: str) -> list[ReviewLogEntry]:
        with self._pool.connection() as connection:
            with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute(
                    """
                    SELECT
                        review_log_id,
                        user_id,
                        card_id,
                        session_id,
                        rating_source,
                        final_rating,
                        is_new_card,
                        rated_at,
                        fsrs_snapshot
                    FROM review_logs
                    WHERE user_id = %s
                    ORDER BY rated_at DESC, review_log_id DESC
                    """,
                    (user_id,),
                )
                rows = cursor.fetchall()
        return [_row_to_review_log(row) for row in rows]


def _row_to_review_session(row: Mapping[str, object]) -> ReviewSessionRecord:
    return ReviewSessionRecord(
        session_id=str(row["session_id"]),
        user_id=str(row["user_id"]),
        deck_id=str(row["deck_id"]),
        created_at=cast(datetime, row["created_at"]),
    )


def _row_to_review_log(row: Mapping[str, object]) -> ReviewLogEntry:
    raw_snapshot = row["fsrs_snapshot"]
    if isinstance(raw_snapshot, str):
        snapshot = json.loads(raw_snapshot)
    elif isinstance(raw_snapshot, Mapping):
        snapshot = dict(raw_snapshot)
    else:
        snapshot = {}

    return ReviewLogEntry(
        review_log_id=str(row["review_log_id"]),
        user_id=str(row["user_id"]),
        card_id=str(row["card_id"]),
        session_id=str(row["session_id"]),
        rating_source=cast(RatingSource, row["rating_source"]),
        final_rating=cast(RatingValue, row["final_rating"]),
        is_new_card=cast(bool, row["is_new_card"]),
        rated_at=cast(datetime, row["rated_at"]),
        fsrs_snapshot=cast(dict[str, object], snapshot),
    )
