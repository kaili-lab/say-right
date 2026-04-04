/**
 * 语音 provider 抽象入口。
 * WHAT: 统一定义 speech adapter 协议，并根据运行时配置实例化具体 provider。
 * WHY: 让路由层不耦合第三方模型调用细节，便于后续替换 STT 供应商。
 */
import { type SpeechConfig } from './runtime';
import { AiHubMixSpeechAdapter, SpeechProviderUnavailableError } from './aihubmix-adapter';
import { type SpeechTranscribeRequest, type SpeechTranscribeResult } from './types';

export interface SpeechToTextAdapter {
  transcribe(input: SpeechTranscribeRequest): Promise<SpeechTranscribeResult>;
}

function createAiHubMixAdapter(
  config: SpeechConfig,
  fetchImpl?: typeof globalThis.fetch
): SpeechToTextAdapter {
  if (!config.apiKey) {
    throw new Error('LLM_API_KEY is required when STT feature is enabled');
  }
  if (!config.baseURL) {
    throw new Error('LLM_BASE_URL is required when STT feature is enabled');
  }

  return new AiHubMixSpeechAdapter({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    model: config.model,
    timeoutMs: config.timeoutMs,
    fetchImpl
  });
}

export function createSpeechAdapter(
  config: SpeechConfig,
  options?: { fetchImpl?: typeof globalThis.fetch }
): SpeechToTextAdapter {
  if (!config.featureEnabled) {
    throw new Error('STT feature is disabled');
  }

  if (config.provider === 'aihubmix') {
    return createAiHubMixAdapter(config, options?.fetchImpl);
  }

  // 不可达分支，保持穷尽保护。
  throw new Error('Unsupported STT provider');
}

export { SpeechProviderUnavailableError };
