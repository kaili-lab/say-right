import { describe, expect, it } from 'vitest';
import {
  DeterministicLLMAdapter,
  LLMUnavailableError,
  OpenAICompatibleLLMAdapter
} from '../src/llm/adapter';
import { resolveLLMConfig } from '../src/llm/runtime';
import { extractFirstJsonObject } from '../src/llm/text';

function createFakeClient(
  create: (request: {
    model: string;
    temperature?: number;
    messages: Array<{ role: 'user'; content: string }>;
  }) => Promise<{ choices?: Array<{ message?: { content?: string | null } | null }> }>
) {
  return {
    chat: {
      completions: {
        create
      }
    }
  };
}

describe('HONO-008 LLM adapter', () => {
  it('LLM 配置解析应默认 deterministic，并在 provider 缺 key 时失败', () => {
    const defaultConfig = resolveLLMConfig({});
    expect(defaultConfig.mode).toBe('deterministic');
    expect(defaultConfig.model).toBe('gpt-4o-mini');

    expect(() =>
      resolveLLMConfig({
        LLM_MODE: 'provider',
        LLM_MODEL: 'gpt-4o-mini'
      })
    ).toThrow(/OPENAI_API_KEY/i);
  });

  it('文本解析应能从前后缀中提取首个 JSON 对象', () => {
    const payload = extractFirstJsonObject('结果如下：{"score": 90, "label": "good"}，请查收');
    expect(payload).toEqual({ score: 90, label: 'good' });
  });

  it('deterministic adapter 应返回可复现生成结果并支持失败注入', async () => {
    const adapter = new DeterministicLLMAdapter();

    await expect(
      adapter.generateEnglish({
        sourceText: '你好',
        sourceLang: 'zh',
        targetLang: 'en'
      })
    ).resolves.toBe('Hello.');

    await expect(
      adapter.generateEnglish({
        sourceText: '自定义句子',
        sourceLang: 'zh',
        targetLang: 'en'
      })
    ).resolves.toBe('自定义句子 (in English)');

    await expect(
      adapter.generateEnglish({
        sourceText: '__FAIL_STUB__',
        sourceLang: 'zh',
        targetLang: 'en'
      })
    ).rejects.toBeInstanceOf(LLMUnavailableError);
  });

  it('deterministic adapter 评分应稳定并支持失败注入', async () => {
    const adapter = new DeterministicLLMAdapter();

    await expect(
      adapter.scoreReview({
        expectedAnswer: 'Thank you',
        userAnswer: 'Thank you'
      })
    ).resolves.toMatchObject({
      score: 95,
      suggestedRating: 'easy'
    });

    await expect(
      adapter.scoreReview({
        expectedAnswer: 'Thank you',
        userAnswer: '__AI_UNAVAILABLE__'
      })
    ).rejects.toBeInstanceOf(LLMUnavailableError);
  });

  it('OpenAI 兼容 adapter 应支持成功生成与评分', async () => {
    const adapter = new OpenAICompatibleLLMAdapter({
      model: 'gpt-4o-mini',
      client: createFakeClient(async () => ({
        choices: [
          {
            message: {
              content: '这里是结果：{"english":"Hello there"}'
            }
          }
        ]
      }))
    });

    await expect(
      adapter.generateEnglish({
        sourceText: '你好呀',
        sourceLang: 'zh',
        targetLang: 'en'
      })
    ).resolves.toBe('Hello there');

    const scoreAdapter = new OpenAICompatibleLLMAdapter({
      model: 'gpt-4o-mini',
      client: createFakeClient(async () => ({
        choices: [
          {
            message: {
              content: '{"score": 88, "feedback": "表达清晰", "suggested_rating": "good"}'
            }
          }
        ]
      }))
    });

    await expect(
      scoreAdapter.scoreReview({
        expectedAnswer: 'Thank you',
        userAnswer: 'Thanks'
      })
    ).resolves.toEqual({
      score: 88,
      feedback: '表达清晰',
      suggestedRating: 'good'
    });
  });

  it('OpenAI 兼容 adapter 应将超时与供应商故障映射为不可用错误', async () => {
    const timeoutAdapter = new OpenAICompatibleLLMAdapter({
      model: 'gpt-4o-mini',
      client: createFakeClient(async () => {
        throw new Error('request timeout');
      })
    });

    await expect(
      timeoutAdapter.generateEnglish({
        sourceText: '你好',
        sourceLang: 'zh',
        targetLang: 'en'
      })
    ).rejects.toThrow(/timeout/i);

    const unavailableAdapter = new OpenAICompatibleLLMAdapter({
      model: 'gpt-4o-mini',
      client: createFakeClient(async () => {
        throw new Error('service unavailable');
      })
    });

    await expect(
      unavailableAdapter.scoreReview({
        expectedAnswer: 'Hello',
        userAnswer: 'Hi'
      })
    ).rejects.toThrow(/provider unavailable/i);
  });
});
