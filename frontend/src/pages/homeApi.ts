/**
 * 首页概览 API 访问层。
 *
 * WHAT: 封装首页统计与最近卡片组数据请求。
 * WHY: 把首页展示数据全部切换为后端来源，避免页面层保留静态示例数据。
 */
import { fetchWithAuth } from "./authApi";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

type HomeRecentDeckApiItem = {
  id: string;
  name: string;
  due_count: number;
};

type HomeSummaryApiResponse = {
  display_name?: string;
  insight?: string;
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
  displayName: string;
  insight: string;
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
  const response = await fetchWithAuth(`${getApiBaseUrl()}/dashboard/home-summary`, {
    method: "GET",
  }, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new HomeApiError(detail, response.status);
  }

  const payload = (await response.json()) as HomeSummaryApiResponse;
  const displayName =
    typeof payload.display_name === "string" && payload.display_name.trim()
      ? payload.display_name.trim()
      : "Learner";
  const insight =
    typeof payload.insight === "string" && payload.insight.trim()
      ? payload.insight.trim()
      : "每天 10 分钟复习，比一周突击 2 小时更容易长期记住表达。";
  return {
    displayName,
    insight,
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
