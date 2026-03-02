"""复习 AI 评分器实现。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol, cast

from app.llm.client import ChatClient
from app.llm.text import LLMTextParseError, extract_first_json_object
from app.review.errors import ReviewAIUnavailableError

SuggestedRating = Literal["again", "hard", "good", "easy"]


@dataclass(slots=True, frozen=True)
class AIScoreResult:
    """AI 评分结果。"""

    score: int
    feedback: str
    suggested_rating: SuggestedRating


class ReviewAIScorer(Protocol):
    """复习评分器协议。"""

    def score(self, *, expected_answer: str, user_answer: str) -> AIScoreResult:
        """对答案评分并给出评级建议。"""
        ...


class DeterministicReviewAIScorer(ReviewAIScorer):
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


@dataclass(slots=True)
class LangChainReviewAIScorer(ReviewAIScorer):
    """基于 LLM 的复习评分器。"""

    client: ChatClient
    model_hint: str

    def score(self, *, expected_answer: str, user_answer: str) -> AIScoreResult:
        prompt = (
            "你是英语口语纠错教练。\n"
            "请对用户答案打分并映射评级，必须只返回 JSON 对象。\n"
            "字段要求：score(0-100整数)、feedback(中文建议)、suggested_rating(again|hard|good|easy)。\n"
            f"标准答案: {expected_answer}\n"
            f"用户答案: {user_answer}\n"
        )
        try:
            raw = self.client.complete(prompt=prompt)
            payload = extract_first_json_object(raw)
            score_raw = payload.get("score")
            feedback_raw = payload.get("feedback")
            rating_raw = payload.get("suggested_rating")

            if not isinstance(score_raw, int):
                raise ReviewAIUnavailableError("invalid score payload")
            score = max(0, min(100, score_raw))
            if not isinstance(feedback_raw, str) or not feedback_raw.strip():
                raise ReviewAIUnavailableError("invalid feedback payload")
            if rating_raw not in {"again", "hard", "good", "easy"}:
                raise ReviewAIUnavailableError("invalid rating payload")
            return AIScoreResult(
                score=score,
                feedback=feedback_raw.strip(),
                suggested_rating=cast(SuggestedRating, rating_raw),
            )
        except (LLMTextParseError, ReviewAIUnavailableError):
            raise
        except Exception as exc:  # noqa: BLE001
            raise ReviewAIUnavailableError("ai scorer unavailable") from exc
