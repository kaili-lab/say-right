const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const ACCESS_TOKEN_STORAGE_KEY = "say_right_access_token";

type ReviewDeckApiItem = {
  deck_id: string;
  deck_name: string;
  due_count: number;
};

export type ReviewDeckSummary = {
  deckId: string;
  deckName: string;
  dueCount: number;
};

export class ReviewApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ReviewApiError";
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
    // 容错：后端错误不一定返回 JSON，保持通用错误提示即可。
  }

  return detail;
}

export async function fetchReviewDecks(fetchImpl: typeof fetch = fetch): Promise<ReviewDeckSummary[]> {
  const response = await fetchImpl(`${getApiBaseUrl()}/review/decks`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new ReviewApiError(detail, response.status);
  }

  const payload = (await response.json()) as ReviewDeckApiItem[];
  return payload.map((item) => ({
    deckId: item.deck_id,
    deckName: item.deck_name,
    dueCount: item.due_count,
  }));
}
