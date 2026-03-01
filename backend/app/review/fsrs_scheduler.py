"""FSRS 调度的可复现最小实现。"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

RatingValue = Literal["again", "hard", "good", "easy"]


@dataclass(slots=True, frozen=True)
class FSRSState:
    """卡片 FSRS 状态。"""

    due_at: datetime
    stability: float
    difficulty: float
    reps: int
    lapses: int


def schedule_next(*, state: FSRSState, rating: RatingValue, now: datetime | None = None) -> FSRSState:
    """根据评级计算下一次调度状态。"""
    current = now or datetime.now(UTC)

    if rating == "again":
        return FSRSState(
            due_at=current + timedelta(minutes=10),
            stability=max(0.1, round(state.stability * 0.7, 4)),
            difficulty=min(10.0, round(state.difficulty + 0.3, 4)),
            reps=state.reps + 1,
            lapses=state.lapses + 1,
        )

    if rating == "hard":
        return FSRSState(
            due_at=current + timedelta(days=1),
            stability=round(state.stability * 1.1 + 0.1, 4),
            difficulty=min(10.0, round(state.difficulty + 0.1, 4)),
            reps=state.reps + 1,
            lapses=state.lapses,
        )

    if rating == "good":
        return FSRSState(
            due_at=current + timedelta(days=3),
            stability=round(state.stability * 1.6 + 0.2, 4),
            difficulty=max(1.0, round(state.difficulty - 0.1, 4)),
            reps=state.reps + 1,
            lapses=state.lapses,
        )

    return FSRSState(
        due_at=current + timedelta(days=7),
        stability=round(state.stability * 2.0 + 0.4, 4),
        difficulty=max(1.0, round(state.difficulty - 0.2, 4)),
        reps=state.reps + 1,
        lapses=state.lapses,
    )
