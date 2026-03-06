/**
 * OpenAI 兼容 LLM 适配层。
 * WHAT: 提供记录生成与复习评分的统一接口，支持 deterministic 与 provider 两种实现。
 * WHY: 业务路由依赖统一协议，便于在保持契约稳定的前提下切换模型提供方。
 */
import OpenAI from 'openai';
import { type LLMConfig } from './runtime';
import { LLMTextParseError, extractFirstJsonObject } from './text';

export type RatingValue = 'again' | 'hard' | 'good' | 'easy';

export type ReviewScoreResult = {
  score: number;
  feedback: string;
  suggestedRating: RatingValue;
};

export type GenerateEnglishInput = {
  sourceText: string;
  sourceLang: 'zh';
  targetLang: 'en';
};

export type ReviewScoreInput = {
  expectedAnswer: string;
  userAnswer: string;
};

export interface LLMAdapter {
  generateEnglish(input: GenerateEnglishInput): Promise<string>;
  scoreReview(input: ReviewScoreInput): Promise<ReviewScoreResult>;
}

type OpenAIChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  }>;
};

type OpenAICompatibleClient = {
  chat: {
    completions: {
      create: (request: {
        model: string;
        temperature?: number;
        messages: Array<{ role: 'user'; content: string }>;
      }) => Promise<OpenAIChatCompletionResponse>;
    };
  };
};

const GENERATE_FAILURE_TOKEN = '__FAIL_STUB__';
const AI_FAILURE_TOKEN = '__AI_UNAVAILABLE__';
const RECORD_GENERATE_FIXTURES: Record<string, string> = {
  你好: 'Hello.',
  谢谢: 'Thank you.',
  我想喝水: 'I want to drink water.',
  你好吗: 'How are you?'
};

function mapScoreToRating(score: number): RatingValue {
  if (score >= 90) {
    return 'easy';
  }
  if (score >= 70) {
    return 'good';
  }
  if (score >= 50) {
    return 'hard';
  }
  return 'again';
}

export class LLMUnavailableError extends Error {}

export class DeterministicLLMAdapter implements LLMAdapter {
  async generateEnglish(input: GenerateEnglishInput): Promise<string> {
    if (input.sourceText === GENERATE_FAILURE_TOKEN) {
      throw new LLMUnavailableError('stub model unavailable');
    }

    const fixture = RECORD_GENERATE_FIXTURES[input.sourceText];
    if (fixture) {
      return fixture;
    }

    // WHY: deterministic 模式只用于可复现测试；未知中文若直接回显原文，
    // 会让调用方误以为得到了真实翻译结果，因此这里显式返回不可用错误。
    throw new LLMUnavailableError('deterministic translator only supports fixture phrases');
  }

  async scoreReview(input: ReviewScoreInput): Promise<ReviewScoreResult> {
    if (input.userAnswer.includes(AI_FAILURE_TOKEN)) {
      throw new LLMUnavailableError('ai scorer unavailable');
    }

    const expected = input.expectedAnswer.trim().toLowerCase();
    const answer = input.userAnswer.trim().toLowerCase();

    let score = 35;
    let feedback = '与标准答案差异较大，建议重学后再尝试。';
    if (answer === expected) {
      score = 95;
      feedback = '表达准确，几乎与标准答案一致。';
    } else if (answer.length > 0 && (answer.includes(expected) || expected.includes(answer))) {
      score = 80;
      feedback = '表达基本正确，可进一步优化措辞自然度。';
    } else if (answer.length >= Math.max(1, Math.floor(expected.length * 0.6))) {
      score = 65;
      feedback = '核心意思接近，但语法或用词仍有偏差。';
    }

    return {
      score,
      feedback,
      suggestedRating: mapScoreToRating(score)
    };
  }
}

function toUnavailableError(error: unknown) {
  if (error instanceof LLMUnavailableError) {
    return error;
  }

  if (error instanceof Error) {
    const message = `${error.name} ${error.message}`.toLowerCase();
    if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
      return new LLMUnavailableError('provider timeout');
    }
  }

  return new LLMUnavailableError('provider unavailable');
}

type OpenAICompatibleLLMAdapterOptions = {
  client: OpenAICompatibleClient;
  model: string;
  temperature?: number;
};

export class OpenAICompatibleLLMAdapter implements LLMAdapter {
  constructor(private readonly options: OpenAICompatibleLLMAdapterOptions) {}

  static fromConfig(config: LLMConfig) {
    if (config.mode !== 'provider' || !config.apiKey) {
      throw new Error('OpenAI compatible adapter requires provider mode with api key');
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL ?? undefined,
      timeout: 10_000
    });
    return new OpenAICompatibleLLMAdapter({
      client: client as unknown as OpenAICompatibleClient,
      model: config.model,
      temperature: 0.1
    });
  }

  private async complete(prompt: string) {
    try {
      const response = await this.options.client.chat.completions.create({
        model: this.options.model,
        temperature: this.options.temperature ?? 0.1,
        messages: [{ role: 'user', content: prompt }]
      });
      const content = response.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new LLMUnavailableError('empty model output');
      }
      return content;
    } catch (error) {
      throw toUnavailableError(error);
    }
  }

  async generateEnglish(input: GenerateEnglishInput): Promise<string> {
    const prompt = [
      '你是中译英表达教练。',
      '请把输入的中文改写成自然口语英文。',
      '只返回 JSON 对象，格式：{"english":"..."}。',
      `source_lang=${input.sourceLang}, target_lang=${input.targetLang}`,
      `中文：${input.sourceText}`
    ].join('\n');

    try {
      const raw = await this.complete(prompt);
      const payload = extractFirstJsonObject(raw);
      const english = payload.english;
      if (typeof english !== 'string' || english.trim().length === 0) {
        throw new LLMUnavailableError('invalid generated payload');
      }
      return english.trim();
    } catch (error) {
      if (error instanceof LLMTextParseError || error instanceof LLMUnavailableError) {
        throw toUnavailableError(error);
      }
      throw new LLMUnavailableError('provider unavailable');
    }
  }

  async scoreReview(input: ReviewScoreInput): Promise<ReviewScoreResult> {
    const prompt = [
      '你是英语口语纠错教练。',
      '请对用户答案打分并映射评级，必须只返回 JSON 对象。',
      '字段：score(0-100整数)、feedback(中文建议)、suggested_rating(again|hard|good|easy)。',
      `标准答案：${input.expectedAnswer}`,
      `用户答案：${input.userAnswer}`
    ].join('\n');

    try {
      const raw = await this.complete(prompt);
      const payload = extractFirstJsonObject(raw);
      const scoreRaw = payload.score;
      const feedbackRaw = payload.feedback;
      const ratingRaw = payload.suggested_rating;

      if (!Number.isInteger(scoreRaw)) {
        throw new LLMUnavailableError('invalid score payload');
      }
      const score = Math.max(0, Math.min(100, Number(scoreRaw)));
      if (typeof feedbackRaw !== 'string' || feedbackRaw.trim().length === 0) {
        throw new LLMUnavailableError('invalid feedback payload');
      }
      if (ratingRaw !== 'again' && ratingRaw !== 'hard' && ratingRaw !== 'good' && ratingRaw !== 'easy') {
        throw new LLMUnavailableError('invalid rating payload');
      }

      return {
        score,
        feedback: feedbackRaw.trim(),
        suggestedRating: ratingRaw
      };
    } catch (error) {
      if (error instanceof LLMTextParseError || error instanceof LLMUnavailableError) {
        throw toUnavailableError(error);
      }
      throw new LLMUnavailableError('provider unavailable');
    }
  }
}

export function createLLMAdapter(config: LLMConfig): LLMAdapter {
  if (config.mode === 'provider') {
    return OpenAICompatibleLLMAdapter.fromConfig(config);
  }
  return new DeterministicLLMAdapter();
}
