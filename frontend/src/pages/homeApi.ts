/**
 * 首页概览 API 访问层。
 *
 * WHAT: 封装首页统计与最近卡片组数据请求。
 * WHY: 把首页展示数据全部切换为后端来源，避免页面层保留静态示例数据。
 */
import { readAccessToken } from "./authApi";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

type HomeRecentDeckApiItem = {
  id: string;
  name: string;
  due_count: number;
};

type HomeSummaryApiResponse = {
  study_days: number;
  mastered_count: number;
  total_cards: number;
  total_due: number;
  recent_decks: HomeRecentDeckApiItem[];
};

export type HomeRecentDeck = {
  id: string;
  name: string;
  dueCount: number;
};

export type HomeSummary = {
  studyDays: number;
  masteredCount: number;
  totalCards: number;
  totalDue: number;
  recentDecks: HomeRecentDeck[];
};

export class HomeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HomeApiError";
  }
}

function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const rawBase = typeof envBase === "string" && envBase.trim() ? envBase : DEFAULT_API_BASE_URL;
  return rawBase.replace(/\/+$/, "");
}

function buildHeaders() {
  const headers: Record<string, string> = {};
  const accessToken = readAccessToken();
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

export async function fetchHomeSummary(fetchImpl: typeof fetch = fetch): Promise<HomeSummary> {
  const response = await fetchImpl(`${getApiBaseUrl()}/dashboard/home-summary`, {
    method: "GET",
    headers: buildHeaders(),
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new HomeApiError(detail, response.status);
  }

  const payload = (await response.json()) as HomeSummaryApiResponse;
  return {
    studyDays: payload.study_days,
    masteredCount: payload.mastered_count,
    totalCards: payload.total_cards,
    totalDue: payload.total_due,
    recentDecks: payload.recent_decks.map((item) => ({
      id: item.id,
      name: item.name,
      dueCount: item.due_count,
    })),
  };
}
