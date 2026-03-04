/**
 * Deck 相关 API 访问层。
 *
 * WHAT: 统一封装卡片组与组内卡片的接口调用、鉴权头和错误解析。
 * WHY: 避免页面层重复处理请求细节，确保契约字段映射集中、可测、可维护。
 */
import { fetchWithAuth } from "./authApi";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
type DeckListApiItem = {
  id: string;
  name: string;
  is_default: boolean;
  new_count: number;
  learning_count: number;
  due_count: number;
};

type DeckCreateApiResponse = {
  id: string;
  name: string;
  is_default: boolean;
};

type DeckCardApiItem = {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  source_lang: string;
  target_lang: string;
  due_at: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
};

export type DeckSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  newCount: number;
  learningCount: number;
  dueCount: number;
};

export type DeckCard = {
  id: string;
  deckId: string;
  frontText: string;
  backText: string;
  sourceLang: string;
  targetLang: string;
  dueAt: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
};

export class DeckApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DeckApiError";
  }
}

function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const rawBase = typeof envBase === "string" && envBase.trim() ? envBase : DEFAULT_API_BASE_URL;
  return rawBase.replace(/\/+$/, "");
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
    }
  } catch {
    // 错误响应兜底处理，避免 JSON 解析失败打断业务提示。
  }
  return detail;
}

async function requestDeck(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}${path}`, init, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new DeckApiError(detail, response.status);
  }

  return response;
}

async function requestDeckJson<T>(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await requestDeck(path, init, fetchImpl);
  return (await response.json()) as T;
}

export async function fetchDecks(fetchImpl: typeof fetch = fetch): Promise<DeckSummary[]> {
  const payload = await requestDeckJson<DeckListApiItem[]>("/decks", { method: "GET" }, fetchImpl);
  return payload.map((item) => ({
    id: item.id,
    name: item.name,
    isDefault: item.is_default,
    newCount: item.new_count,
    learningCount: item.learning_count,
    dueCount: item.due_count,
  }));
}

export async function createDeck(name: string, fetchImpl: typeof fetch = fetch): Promise<DeckSummary> {
  const payload = await requestDeckJson<DeckCreateApiResponse>(
    "/decks",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    },
    fetchImpl,
  );

  return {
    id: payload.id,
    name: payload.name,
    isDefault: payload.is_default,
    newCount: 0,
    learningCount: 0,
    dueCount: 0,
  };
}

function mapDeckCard(item: DeckCardApiItem): DeckCard {
  return {
    id: item.id,
    deckId: item.deck_id,
    frontText: item.front_text,
    backText: item.back_text,
    sourceLang: item.source_lang,
    targetLang: item.target_lang,
    dueAt: item.due_at,
    stability: item.stability,
    difficulty: item.difficulty,
    reps: item.reps,
    lapses: item.lapses,
  };
}

export async function fetchDeckCards(deckId: string, fetchImpl: typeof fetch = fetch): Promise<DeckCard[]> {
  const payload = await requestDeckJson<DeckCardApiItem[]>(`/decks/${deckId}/cards`, { method: "GET" }, fetchImpl);
  return payload.map(mapDeckCard);
}

export async function updateCard(
  cardId: string,
  params: { frontText: string; backText: string },
  fetchImpl: typeof fetch = fetch,
): Promise<DeckCard> {
  const payload = await requestDeckJson<DeckCardApiItem>(
    `/cards/${cardId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        front_text: params.frontText,
        back_text: params.backText,
      }),
    },
    fetchImpl,
  );
  return mapDeckCard(payload);
}

export async function moveCard(cardId: string, toDeckId: string, fetchImpl: typeof fetch = fetch): Promise<DeckCard> {
  const payload = await requestDeckJson<DeckCardApiItem>(
    `/cards/${cardId}/move`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to_deck_id: toDeckId }),
    },
    fetchImpl,
  );
  return mapDeckCard(payload);
}

export async function deleteCard(cardId: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  await requestDeck(`/cards/${cardId}`, { method: "DELETE" }, fetchImpl);
}
