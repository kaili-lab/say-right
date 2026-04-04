import { fetchWithAuth } from "./authApi";
import { getApiBaseUrl } from "./apiBaseUrl";

export const SPEECH_SCENES = [
  "record_source",
  "record_generated",
  "review_answer",
  "card_front",
  "card_back",
] as const;

export type SpeechScene = (typeof SPEECH_SCENES)[number];
export type SpeechLanguage = "zh" | "en";

type SpeechTranscribeApiResponse = {
  text: string;
  language: SpeechLanguage;
  provider_model: string;
};

export type SpeechTranscribeResult = {
  text: string;
  language: SpeechLanguage;
  providerModel: string;
};

export class SpeechApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SpeechApiError";
    this.status = status;
  }
}

function toFile(audio: Blob | File) {
  if (audio instanceof File) {
    return audio;
  }
  const mimeType = audio.type || "audio/webm";
  const extension = (() => {
    if (mimeType.includes("webm")) {
      return "webm";
    }
    if (mimeType.includes("ogg")) {
      return "ogg";
    }
    if (mimeType.includes("wav") || mimeType.includes("wave")) {
      return "wav";
    }
    if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
      return "mp3";
    }
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
      return "m4a";
    }
    return "bin";
  })();

  return new File([audio], `speech.${extension}`, {
    type: mimeType,
  });
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
      return detail;
    }
    if (typeof payload.message === "string" && payload.message.trim()) {
      detail = payload.message;
      return detail;
    }
    if (Array.isArray(payload.detail)) {
      for (const item of payload.detail) {
        if (
          typeof item === "object" &&
          item !== null &&
          "msg" in item &&
          typeof item.msg === "string" &&
          item.msg.trim()
        ) {
          detail = item.msg;
          return detail;
        }
      }
    }
  } catch {
    // 部分网关错误可能返回非 JSON，使用兜底文案避免二次异常。
  }

  return detail;
}

export async function transcribeSpeech(
  params: {
    audio: Blob | File;
    language: SpeechLanguage;
    scene: SpeechScene;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<SpeechTranscribeResult> {
  const file = toFile(params.audio);
  if (file.size <= 0) {
    throw new SpeechApiError("audio payload is empty", 422);
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("language", params.language);
  formData.set("scene", params.scene);

  const response = await fetchWithAuth(
    `${getApiBaseUrl()}/speech/transcribe`,
    {
      method: "POST",
      body: formData,
    },
    fetchImpl,
  );

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new SpeechApiError(detail, response.status);
  }

  const payload = (await response.json()) as SpeechTranscribeApiResponse;
  return {
    text: payload.text,
    language: payload.language,
    providerModel: payload.provider_model,
  };
}
