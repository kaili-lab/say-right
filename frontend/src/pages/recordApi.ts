const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";
const ACCESS_TOKEN_STORAGE_KEY = "say_right_access_token";

export type RecordGenerateResult = {
  generatedText: string;
  modelHint: string;
  traceId: string;
};

type RecordGenerateApiResponse = {
  generated_text: string;
  model_hint: string;
  trace_id: string;
};

export class RecordGenerateApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "RecordGenerateApiError";
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

export async function generateRecordEnglish(
  sourceText: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RecordGenerateResult> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetchImpl(`${getApiBaseUrl()}/records/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_text: sourceText,
      source_lang: "zh",
      target_lang: "en",
    }),
  });

  if (!response.ok) {
    let detail = `request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string" && payload.detail.trim()) {
        detail = payload.detail;
      }
    } catch {
      // 错误响应可能不是 JSON，这里保持兜底文案，避免二次异常覆盖原始失败原因。
    }

    throw new RecordGenerateApiError(detail, response.status);
  }

  const payload = (await response.json()) as RecordGenerateApiResponse;
  return {
    generatedText: payload.generated_text,
    modelHint: payload.model_hint,
    traceId: payload.trace_id,
  };
}
