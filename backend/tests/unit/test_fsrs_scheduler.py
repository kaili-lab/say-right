"""FSRS 调度器单元测试。"""

from datetime import UTC, datetime

from app.review.fsrs_scheduler import FSRSState, schedule_next


def test_schedule_next_good_increases_reps_and_pushes_due_time() -> None:
    """Good 评级应推进下次到期时间并增加复习次数。"""
    now = datetime(2026, 3, 1, tzinfo=UTC)
    state = FSRSState(
        due_at=datetime(2026, 3, 1, tzinfo=UTC),
        stability=2.0,
        difficulty=5.0,
        reps=3,
        lapses=1,
    )

    updated = schedule_next(state=state, rating="good", now=now)

    assert updated.reps == 4
    assert updated.lapses == 1
    assert updated.due_at > now
    assert updated.stability > state.stability


def test_schedule_next_again_increments_lapses() -> None:
    """Again 评级应增加 lapses 并给出短间隔复习时间。"""
    now = datetime(2026, 3, 1, tzinfo=UTC)
    state = FSRSState(
        due_at=datetime(2026, 3, 1, tzinfo=UTC),
        stability=3.0,
        difficulty=4.0,
        reps=5,
        lapses=2,
    )

    updated = schedule_next(state=state, rating="again", now=now)

    assert updated.reps == 6
    assert updated.lapses == 3
    assert updated.due_at > now
    assert updated.due_at < now.replace(hour=23, minute=59)
