"""复习 AI 评分 stub。"""

from dataclasses import dataclass
from typing import Literal

from app.review.errors import ReviewAIUnavailableError

SuggestedRating = Literal["again", "hard", "good", "easy"]


@dataclass(slots=True, frozen=True)
class AIScoreResult:
    """AI 评分结果。"""

    score: int
    feedback: str
    suggested_rating: SuggestedRating


class DeterministicReviewAIScorer:
    """可复现评分器：基于答案与标准答案的简单匹配。"""

    def score(self, *, expected_answer: str, user_answer: str) -> AIScoreResult:
        """返回分数、反馈与建议评级。"""
        if "__AI_UNAVAILABLE__" in user_answer:
            raise ReviewAIUnavailableError("ai scorer unavailable")

        expected = expected_answer.strip().lower()
        answer = user_answer.strip().lower()

        if answer == expected:
            score = 95
            feedback = "表达准确，几乎与标准答案一致。"
        elif answer and (answer in expected or expected in answer):
            score = 80
            feedback = "表达基本正确，可进一步优化措辞自然度。"
        elif len(answer) >= max(1, int(len(expected) * 0.6)):
            score = 65
            feedback = "核心意思接近，但语法或用词仍有偏差。"
        else:
            score = 35
            feedback = "与标准答案差异较大，建议重学后再尝试。"

        return AIScoreResult(
            score=score,
            feedback=feedback,
            suggested_rating=self._map_rating(score),
        )

    @staticmethod
    def _map_rating(score: int) -> SuggestedRating:
        if score >= 90:
            return "easy"
        if score >= 70:
            return "good"
        if score >= 50:
            return "hard"
        return "again"
