import { fetchWithAuth } from "./authApi";
import { getApiBaseUrl } from "./apiBaseUrl";
export type RecordGenerateResult = {
  generatedText: string;
};

export type RecordSaveResult = {
  cardId: string;
  deckId: string;
  deckName: string;
};

export type RecordSaveWithAgentResult = {
  cardId: string;
  deckId: string;
  deckName: string;
  deckCreated: boolean;
  fallbackUsed: boolean;
};

type RecordGenerateApiResponse = {
  generated_text: string;
};

type RecordSaveApiResponse = {
  card_id: string;
  deck_id: string;
  deck_name: string;
};

type RecordSaveWithAgentApiResponse = {
  card_id: string;
  deck_id: string;
  deck_name: string;
  deck_created: boolean;
  fallback_used: boolean;
};

export class RecordGenerateApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RecordGenerateApiError";
    this.status = status;
  }
}

function buildRequestHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
    } else if (Array.isArray(payload.detail)) {
      // FastAPI/Pydantic 校验失败常返回 detail 数组，这里提取首个可读 msg 给前端提示。
      for (const item of payload.detail) {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item &&
          typeof item.msg === "string" &&
          item.msg.trim()
        ) {
          detail = item.msg.replace(/^Value error,\s*/i, "");
          break;
        }
      }
    }
  } catch {
    // 错误响应可能不是 JSON，这里保持兜底文案，避免二次异常覆盖原始失败原因。
  }

  return detail;
}

export async function generateRecordEnglish(
  sourceText: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordGenerateResult> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/records/generate`, {
    method: "POST",
    headers: buildRequestHeaders(),
    body: JSON.stringify({
      source_text: sourceText,
      source_lang: "zh",
      target_lang: "en",
    }),
  }, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new RecordGenerateApiError(detail, response.status);
  }

  const payload = (await response.json()) as RecordGenerateApiResponse;
  return { generatedText: payload.generated_text };
}

export async function saveRecordToDeck(
  params: { sourceText: string; generatedText: string; deckId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<RecordSaveResult> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/records/save`, {
    method: "POST",
    headers: buildRequestHeaders(),
    body: JSON.stringify({
      source_text: params.sourceText,
      generated_text: params.generatedText,
      deck_id: params.deckId,
      source_lang: "zh",
      target_lang: "en",
    }),
  }, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new RecordGenerateApiError(detail, response.status);
  }

  const payload = (await response.json()) as RecordSaveApiResponse;
  return {
    cardId: payload.card_id,
    deckId: payload.deck_id,
    deckName: payload.deck_name,
  };
}

export async function saveRecordWithAgent(
  params: { sourceText: string; generatedText: string },
  fetchImpl: typeof fetch = fetch,
): Promise<RecordSaveWithAgentResult> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/records/save-with-agent`, {
    method: "POST",
    headers: buildRequestHeaders(),
    body: JSON.stringify({
      source_text: params.sourceText,
      generated_text: params.generatedText,
      source_lang: "zh",
      target_lang: "en",
    }),
  }, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new RecordGenerateApiError(detail, response.status);
  }

  const payload = (await response.json()) as RecordSaveWithAgentApiResponse;
  return {
    cardId: payload.card_id,
    deckId: payload.deck_id,
    deckName: payload.deck_name,
    deckCreated: payload.deck_created,
    fallbackUsed: payload.fallback_used,
  };
}
