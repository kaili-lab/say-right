/**
 * AIHubMix Whisper 适配器。
 * WHAT: 通过 OpenAI 兼容的 `/audio/transcriptions` 接口完成音频转写。
 * WHY: 把第三方请求细节约束在 provider 层，路由层只依赖抽象接口。
 */
import { type SpeechLanguage, type SpeechTranscribeResult } from './types';

export class SpeechProviderUnavailableError extends Error {
  constructor(
    message: string,
    public readonly status: number = 503
  ) {
    super(message);
    this.name = 'SpeechProviderUnavailableError';
  }
}

type SpeechTranscribePayload = {
  audio: Blob | File;
  language: SpeechLanguage;
  prompt: string;
};

type AiHubMixSpeechAdapterOptions = {
  baseURL: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchImpl?: typeof globalThis.fetch;
};

type ProviderResponse = {
  text?: unknown;
  language?: unknown;
  model?: unknown;
};

function withPath(baseURL: string, path: string) {
  return `${baseURL.replace(/\/+$/, '')}${path}`;
}

function parseProviderErrorText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return 'provider unavailable';
  }

  if ('detail' in payload && typeof payload.detail === 'string' && payload.detail.trim().length > 0) {
    return payload.detail;
  }

  if ('message' in payload && typeof payload.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error &&
    typeof payload.error.message === 'string' &&
    payload.error.message.trim().length > 0
  ) {
    return payload.error.message;
  }

  return 'provider unavailable';
}

async function parseProviderError(response: Response) {
  try {
    const payload = (await response.json()) as unknown;
    return parseProviderErrorText(payload);
  } catch {
    return `provider unavailable (${response.status})`;
  }
}

function toUnavailableError(error: unknown) {
  if (error instanceof SpeechProviderUnavailableError) {
    return error;
  }

  if (error instanceof Error) {
    const message = `${error.name} ${error.message}`.toLowerCase();
    if (message.includes('abort') || message.includes('timeout')) {
      return new SpeechProviderUnavailableError('provider timeout');
    }
  }

  return new SpeechProviderUnavailableError('provider unavailable');
}

function toFile(audio: Blob | File) {
  if (audio instanceof File) {
    return audio;
  }
  return new File([audio], 'speech.webm', {
    type: audio.type || 'audio/webm'
  });
}

export class AiHubMixSpeechAdapter {
  private readonly endpoint: string;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(private readonly options: AiHubMixSpeechAdapterOptions) {
    this.endpoint = withPath(options.baseURL, '/audio/transcriptions');
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async transcribe(input: SpeechTranscribePayload): Promise<SpeechTranscribeResult> {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      const form = new FormData();
      form.set('file', toFile(input.audio));
      form.set('model', this.options.model);
      form.set('language', input.language);
      form.set('prompt', input.prompt);

      const response = await this.fetchImpl(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`
        },
        body: form,
        signal: controller.signal
      });

      if (!response.ok) {
        const detail = await parseProviderError(response);
        throw new SpeechProviderUnavailableError(detail, response.status);
      }

      const payload = (await response.json()) as ProviderResponse;
      if (typeof payload.text !== 'string' || payload.text.trim().length === 0) {
        throw new SpeechProviderUnavailableError('provider returned empty text');
      }

      return {
        text: payload.text.trim(),
        language:
          payload.language === 'zh' || payload.language === 'en'
            ? payload.language
            : input.language,
        providerModel:
          typeof payload.model === 'string' && payload.model.trim().length > 0
            ? payload.model
            : this.options.model
      };
    } catch (error) {
      throw toUnavailableError(error);
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }
}
