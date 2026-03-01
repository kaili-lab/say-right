import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  type ReviewAiScoreResult,
  ReviewApiError,
  type ReviewRatingSource,
  type ReviewRatingValue,
  type ReviewSessionCard,
  fetchReviewSession,
  rateReviewCard,
  scoreReviewAnswer,
} from "./reviewApi";

type LoadStatus = "loading" | "ready" | "error";
type PendingAction = "idle" | "scoring" | "submitting";

type RatingStats = Record<ReviewRatingValue, number>;

const RATING_OPTIONS: Array<{ value: ReviewRatingValue; label: "Again" | "Hard" | "Good" | "Easy"; className: string }> = [
  { value: "again", label: "Again", className: "bg-red-500" },
  { value: "hard", label: "Hard", className: "bg-orange-500" },
  { value: "good", label: "Good", className: "bg-green-500" },
  { value: "easy", label: "Easy", className: "bg-blue-500" },
];

function createInitialStats(): RatingStats {
  return { again: 0, hard: 0, good: 0, easy: 0 };
}

function ratingLabel(value: ReviewRatingValue) {
  return RATING_OPTIONS.find((item) => item.value === value)?.label ?? "Again";
}

export function ReviewSessionPage() {
  const { deckId = "" } = useParams();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [pendingAction, setPendingAction] = useState<PendingAction>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [cards, setCards] = useState<ReviewSessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedRating, setSelectedRating] = useState<ReviewRatingValue | null>(null);
  const [aiResult, setAiResult] = useState<ReviewAiScoreResult | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingStats>(createInitialStats());

  useEffect(() => {
    let disposed = false;

    async function loadSession() {
      setLoadStatus("loading");
      setErrorMessage("");
      try {
        const session = await fetchReviewSession(deckId);
        if (disposed) {
          return;
        }
        setSessionId(session.sessionId);
        setCards(session.cards);
        setCurrentIndex(0);
        setUserAnswer("");
        setShowAnswer(false);
        setSelectedRating(null);
        setAiResult(null);
        setRatingStats(createInitialStats());
        setLoadStatus("ready");
      } catch (error) {
        if (disposed) {
          return;
        }
        setLoadStatus("error");
        if (error instanceof Error) {
          setErrorMessage(error.message);
          return;
        }
        setErrorMessage("加载失败，请稍后重试");
      }
    }

    void loadSession();
    return () => {
      disposed = true;
    };
  }, [deckId]);

  const currentCard = cards[currentIndex];
  const isDone = loadStatus === "ready" && currentIndex >= cards.length;
  const progressPercent = useMemo(() => {
    if (cards.length === 0) {
      return 100;
    }
    if (isDone) {
      return 100;
    }
    return Math.round((currentIndex / cards.length) * 100);
  }, [cards.length, currentIndex, isDone]);
  const progressText = useMemo(() => {
    if (cards.length === 0) {
      return "0 / 0";
    }
    if (isDone) {
      return `${cards.length} / ${cards.length}`;
    }
    return `${currentIndex + 1} / ${cards.length}`;
  }, [cards.length, currentIndex, isDone]);

  const summary = useMemo(() => {
    const total = cards.length;
    const accuracy = total === 0 ? 0 : Math.round(((ratingStats.good + ratingStats.easy) / total) * 100);
    return [
      { label: "总卡片", value: String(total) },
      { label: "正确率", value: `${accuracy}%` },
      { label: "Again", value: String(ratingStats.again) },
      { label: "Hard", value: String(ratingStats.hard) },
      { label: "Good", value: String(ratingStats.good) },
      { label: "Easy", value: String(ratingStats.easy) },
    ];
  }, [cards.length, ratingStats]);

  async function handleAiScore() {
    if (!currentCard) {
      return;
    }

    const normalizedAnswer = userAnswer.trim();
    if (!normalizedAnswer) {
      setErrorMessage("若要使用 AI 评分，请先输入你的英文答案。");
      return;
    }

    setPendingAction("scoring");
    setErrorMessage("");
    try {
      const result = await scoreReviewAnswer({
        sessionId,
        cardId: currentCard.cardId,
        userAnswer: normalizedAnswer,
      });
      setAiResult(result);
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("AI 评分失败，请稍后重试");
      }
    } finally {
      setPendingAction("idle");
    }
  }

  async function handleNextCard() {
    if (!currentCard) {
      return;
    }
    if (!selectedRating) {
      setErrorMessage("请先选择本卡评级（Again / Hard / Good / Easy）。");
      return;
    }

    setPendingAction("submitting");
    setErrorMessage("");

    // AI 建议和手动评级并行存在时，以最终点击结果为准；仅当与 AI 建议一致时标记为 ai。
    const ratingSource: ReviewRatingSource =
      aiResult && aiResult.suggestedRating === selectedRating ? "ai" : "manual";

    try {
      await rateReviewCard({
        sessionId,
        cardId: currentCard.cardId,
        ratingSource,
        ratingValue: selectedRating,
        userAnswer: userAnswer.trim() || undefined,
      });
      setRatingStats((previous) => ({ ...previous, [selectedRating]: previous[selectedRating] + 1 }));
      setCurrentIndex((previous) => previous + 1);
      setUserAnswer("");
      setShowAnswer(false);
      setSelectedRating(null);
      setAiResult(null);
    } catch (error) {
      if (error instanceof ReviewApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("提交评级失败，请稍后重试");
      }
    } finally {
      setPendingAction("idle");
    }
  }

  if (loadStatus === "loading") {
    return <section className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-stone-500 shadow-sm">加载中...</section>;
  }

  if (loadStatus === "error") {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-red-700">复习 Session</h1>
        <p className="mt-2 text-sm text-red-700">加载失败：{errorMessage}</p>
        <Link to="/review" className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-red-700">
          返回 Deck 列表
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <article className="rounded-2xl border border-orange-100 bg-gradient-to-br from-[#fffcf7] to-[#fff7ed] p-5 shadow-sm">
        <h2 className="text-lg font-bold text-amber-800">当前进度</h2>
        <p className="mt-3 text-4xl font-extrabold text-orange-500">{progressText}</p>
        <p className="mt-1 text-xs text-stone-500">本轮待复习 {cards.length} 张</p>
        <div className="mt-3 h-2 rounded-full bg-orange-100">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <p className="flex items-center justify-between text-stone-600">
            <span>Again</span>
            <span>{ratingStats.again}</span>
          </p>
          <p className="flex items-center justify-between text-stone-600">
            <span>Hard</span>
            <span>{ratingStats.hard}</span>
          </p>
          <p className="flex items-center justify-between text-stone-600">
            <span>Good</span>
            <span>{ratingStats.good}</span>
          </p>
          <p className="flex items-center justify-between text-stone-600">
            <span>Easy</span>
            <span>{ratingStats.easy}</span>
          </p>
        </div>
      </article>

      <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        {isDone ? (
          <div>
            <h1 className="text-2xl font-bold text-amber-800">本轮复习完成</h1>
            <p className="mt-2 text-sm text-stone-600">你已完成本轮复习，AI 建议与手动评级记录已收敛。</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {summary.map((item) => (
                <div key={item.label} className="rounded-xl border border-stone-200 px-3 py-2 text-center">
                  <p className="text-2xl font-extrabold text-amber-800">{item.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{item.label}</p>
                </div>
              ))}
            </div>
            <Link
              to="/review"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
            >
              返回 Deck 列表
            </Link>
          </div>
        ) : (
          <div>
            <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-bold text-amber-800">复习 Session</h1>
                <p className="mt-1 text-sm text-stone-500">Deck：{deckId}</p>
              </div>
              <Link
                to="/review"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                返回 Deck 列表
              </Link>
            </header>

            <section className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
              <p className="text-xs text-stone-500">正面（中文）</p>
              <p className="mt-1 text-xl font-bold text-amber-800">{currentCard?.frontText}</p>
            </section>

            <label htmlFor="review-user-answer" className="mt-4 block text-sm font-semibold text-stone-600">
              你的英文答案
            </label>
            <textarea
              id="review-user-answer"
              value={userAnswer}
              onChange={(event) => setUserAnswer(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-xl border border-stone-200 bg-[#fffdfb] p-3 text-sm leading-6 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="可输入你的英文表达，也可以直接手动评级"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleAiScore()}
                disabled={pendingAction !== "idle"}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                AI 评分
              </button>
              <button
                type="button"
                onClick={() => setShowAnswer((value) => !value)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                {showAnswer ? "隐藏参考答案" : "显示参考答案"}
              </button>
            </div>

            {aiResult ? (
              <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">AI 评分：{aiResult.score}</p>
                <p className="mt-1">建议档位：{ratingLabel(aiResult.suggestedRating)}</p>
                <p className="mt-1 text-stone-600">{aiResult.feedback}</p>
              </div>
            ) : null}

            {showAnswer ? (
              <div className="mt-3 rounded-xl border border-dashed border-orange-200 bg-[#fffcf7] px-4 py-3">
                <p className="text-xs text-stone-500">背面（标准英文）</p>
                <p className="mt-1 text-base font-semibold text-stone-700">{currentCard?.backText}</p>
              </div>
            ) : null}

            <p className="mt-4 text-sm text-stone-500">手动评级（始终可用，最终以你的选择为准）</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRating(option.value)}
                  className={`h-11 rounded-xl text-sm font-bold text-white transition ${
                    option.className
                  } ${selectedRating === option.value ? "ring-2 ring-stone-700/40" : "opacity-85 hover:opacity-100"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {errorMessage ? (
              <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleNextCard()}
                disabled={pendingAction !== "idle"}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                下一张
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
