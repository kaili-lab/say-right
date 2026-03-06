import { fetchWithAuth } from "./authApi";
import { getApiBaseUrl } from "./apiBaseUrl";
type ReviewDeckApiItem = {
  deck_id: string;
  deck_name: string;
  due_count: number;
};

type ReviewSessionApiCard = {
  card_id: string;
  front_text: string;
  back_text: string;
  fsrs_state: Record<string, unknown>;
};

type ReviewSessionApiResponse = {
  session_id: string;
  cards: ReviewSessionApiCard[];
};

type ReviewAiScoreApiResponse = {
  score: number;
  feedback: string;
  suggested_rating: ReviewRatingValue;
};

type ReviewSessionSummaryApiResponse = {
  session_id: string;
  reviewed_count: number;
  accuracy: number;
  rating_distribution: Record<ReviewRatingValue, number>;
};

type ReviewRateApiResponse = {
  next_due_at: string;
  updated_fsrs_state: Record<string, unknown>;
};

export type ReviewDeckSummary = {
  deckId: string;
  deckName: string;
  dueCount: number;
};

export type ReviewRatingValue = "again" | "hard" | "good" | "easy";
export type ReviewRatingSource = "manual" | "ai";

export type ReviewSessionCard = {
  cardId: string;
  frontText: string;
  backText: string;
  fsrsState: Record<string, unknown>;
};

export type ReviewSessionData = {
  sessionId: string;
  cards: ReviewSessionCard[];
};

export type ReviewAiScoreResult = {
  score: number;
  feedback: string;
  suggestedRating: ReviewRatingValue;
};

export type ReviewRateResult = {
  nextDueAt: string;
  updatedFsrsState: Record<string, unknown>;
};

export type ReviewSessionSummary = {
  sessionId: string;
  reviewedCount: number;
  accuracy: number;
  ratingDistribution: Record<ReviewRatingValue, number>;
};

export class ReviewApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReviewApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
    }
  } catch {
    // 容错：后端错误不一定返回 JSON，保持通用错误提示即可。
  }

  return detail;
}

async function requestReviewJson<T>(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}${path}`, init, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new ReviewApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchReviewDecks(fetchImpl: typeof fetch = fetch): Promise<ReviewDeckSummary[]> {
  const payload = await requestReviewJson<ReviewDeckApiItem[]>(
    "/review/decks",
    { method: "GET" },
    fetchImpl,
  );

  return payload.map((item) => ({
    deckId: item.deck_id,
    deckName: item.deck_name,
    dueCount: item.due_count,
  }));
}

export async function fetchReviewSession(deckId: string, fetchImpl: typeof fetch = fetch): Promise<ReviewSessionData> {
  const payload = await requestReviewJson<ReviewSessionApiResponse>(
    `/review/decks/${deckId}/session`,
    { method: "GET" },
    fetchImpl,
  );

  return {
    sessionId: payload.session_id,
    cards: payload.cards.map((card) => ({
      cardId: card.card_id,
      frontText: card.front_text,
      backText: card.back_text,
      fsrsState: card.fsrs_state,
    })),
  };
}

export async function fetchReviewSessionSummary(
  sessionId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewSessionSummary> {
  const payload = await requestReviewJson<ReviewSessionSummaryApiResponse>(
    `/review/session/${sessionId}/summary`,
    { method: "GET" },
    fetchImpl,
  );

  return {
    sessionId: payload.session_id,
    reviewedCount: payload.reviewed_count,
    accuracy: payload.accuracy,
    ratingDistribution: {
      again: payload.rating_distribution.again ?? 0,
      hard: payload.rating_distribution.hard ?? 0,
      good: payload.rating_distribution.good ?? 0,
      easy: payload.rating_distribution.easy ?? 0,
    },
  };
}

export async function scoreReviewAnswer(
  params: { sessionId: string; cardId: string; userAnswer: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewAiScoreResult> {
  const payload = await requestReviewJson<ReviewAiScoreApiResponse>(
    `/review/session/${params.sessionId}/ai-score`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: params.cardId,
        user_answer: params.userAnswer,
      }),
    },
    fetchImpl,
  );

  return {
    score: payload.score,
    feedback: payload.feedback,
    suggestedRating: payload.suggested_rating,
  };
}

export async function rateReviewCard(
  params: {
    sessionId: string;
    cardId: string;
    ratingSource: ReviewRatingSource;
    ratingValue: ReviewRatingValue;
    userAnswer?: string;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<ReviewRateResult> {
  const payload = await requestReviewJson<ReviewRateApiResponse>(
    `/review/session/${params.sessionId}/rate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: params.cardId,
        rating_source: params.ratingSource,
        rating_value: params.ratingValue,
        user_answer: params.userAnswer,
      }),
    },
    fetchImpl,
  );

  return {
    nextDueAt: payload.next_due_at,
    updatedFsrsState: payload.updated_fsrs_state,
  };
}
