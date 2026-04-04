import { describe, expect, it, vi } from 'vitest';
import { createSpeechAdapter, SpeechProviderUnavailableError } from '../src/speech/adapter';
import { resolveSpeechConfig } from '../src/speech/runtime';

function createEnabledConfig() {
  return resolveSpeechConfig({
    STT_PROVIDER: 'aihubmix',
    STT_MODEL: 'whisper-large-v3',
    STT_TIMEOUT_MS: '15',
    STT_MAX_FILE_SIZE_BYTES: '10485760',
    STT_FEATURE_ENABLED: 'true',
    LLM_API_KEY: 'sk-test',
    LLM_BASE_URL: 'https://aihubmix.com/v1'
  });
}

describe('speech adapter', () => {
  it('应调用 AIHubMix transcriptions 接口并返回标准化结果', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: 'hello world',
          language: 'en',
          model: 'whisper-large-v3'
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' }
        }
      )
    );

    const adapter = createSpeechAdapter(createEnabledConfig(), { fetchImpl: fetchMock });
    const audio = new File(['audio-data'], 'sample.webm', { type: 'audio/webm' });
    const result = await adapter.transcribe({
      audio,
      scene: 'review_answer',
      language: 'en',
      prompt: 'Please transcribe in English.'
    });

    expect(result).toEqual({
      text: 'hello world',
      language: 'en',
      providerModel: 'whisper-large-v3'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('https://aihubmix.com/v1/audio/transcriptions');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)?.Authorization).toBe('Bearer sk-test');
    expect(init?.body).toBeInstanceOf(FormData);

    const body = init?.body as FormData;
    expect(body.get('model')).toBe('whisper-large-v3');
    expect(body.get('language')).toBe('en');
    expect(body.get('prompt')).toBe('Please transcribe in English.');
    expect(body.get('file')).toBeInstanceOf(File);
  });

  it('上游 4xx/5xx 应映射为统一不可用错误', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'service overloaded' }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      })
    );
    const adapter = createSpeechAdapter(createEnabledConfig(), { fetchImpl: fetchMock });

    await expect(
      adapter.transcribe({
        audio: new File(['x'], 'x.webm', { type: 'audio/webm' }),
        scene: 'record_source',
        language: 'zh',
        prompt: '请转写中文'
      })
    ).rejects.toMatchObject({
      name: 'SpeechProviderUnavailableError',
      status: 503
    });
  });

  it('空文本返回应映射为不可用错误', async () => {
    const fetchMock = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      new Response(JSON.stringify({ text: '   ' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );
    const adapter = createSpeechAdapter(createEnabledConfig(), { fetchImpl: fetchMock });

    await expect(
      adapter.transcribe({
        audio: new File(['x'], 'x.webm', { type: 'audio/webm' }),
        scene: 'record_source',
        language: 'zh',
        prompt: '请转写中文'
      })
    ).rejects.toBeInstanceOf(SpeechProviderUnavailableError);
  });

  it('超时应映射为 provider timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi.fn<typeof globalThis.fetch>().mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          })
      );
      const adapter = createSpeechAdapter(createEnabledConfig(), { fetchImpl: fetchMock });

      const pending = adapter.transcribe({
        audio: new File(['x'], 'x.webm', { type: 'audio/webm' }),
        scene: 'record_source',
        language: 'zh',
        prompt: '请转写中文'
      });

      const assertion = expect(pending).rejects.toThrow(/timeout/i);
      await vi.advanceTimersByTimeAsync(20);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it('feature disabled 或缺少关键配置应在工厂阶段失败', () => {
    expect(() =>
      createSpeechAdapter(
        resolveSpeechConfig({
          STT_FEATURE_ENABLED: 'false'
        })
      )
    ).toThrow('STT feature is disabled');

    expect(() =>
      createSpeechAdapter(
        resolveSpeechConfig({
          STT_PROVIDER: 'aihubmix',
          STT_FEATURE_ENABLED: 'true',
          LLM_API_KEY: 'sk-only'
        })
      )
    ).toThrow('LLM_BASE_URL is required when STT feature is enabled');
  });
});
