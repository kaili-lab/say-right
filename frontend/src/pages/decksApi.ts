const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const ACCESS_TOKEN_STORAGE_KEY = "say_right_access_token";

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

export type DeckSummary = {
  id: string;
  name: string;
  isDefault: boolean;
  newCount: number;
  learningCount: number;
  dueCount: number;
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

function getAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function buildHeaders() {
  const headers: Record<string, string> = {};
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
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

async function requestDeckJson<T>(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(),
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new DeckApiError(detail, response.status);
  }

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
