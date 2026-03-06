/**
 * LLM 运行时配置解析。
 * WHAT: 统一解析 deterministic/provider 模式与 OpenAI 兼容端点参数。
 * WHY: 让路由层不关心环境变量细节，避免同一配置逻辑在多处分叉。
 */
export type LLMMode = 'deterministic' | 'provider';

export type LLMRuntimeEnv = {
  LLM_MODE?: string;
  LLM_MODEL?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
};

export type LLMConfig = {
  mode: LLMMode;
  model: string;
  apiKey: string | null;
  baseURL: string | null;
};

function normalizeOptional(value?: string) {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function resolveLLMConfig(env: LLMRuntimeEnv): LLMConfig {
  const modeRaw = (env.LLM_MODE ?? 'deterministic').trim().toLowerCase();
  if (modeRaw !== 'deterministic' && modeRaw !== 'provider') {
    throw new Error('LLM_MODE must be one of: deterministic, provider');
  }

  const model = normalizeOptional(env.LLM_MODEL) ?? 'gpt-4o-mini';
  const apiKey = normalizeOptional(env.LLM_API_KEY) ?? normalizeOptional(env.OPENAI_API_KEY);
  const baseURL = normalizeOptional(env.LLM_BASE_URL) ?? normalizeOptional(env.OPENAI_BASE_URL);

  if (modeRaw === 'provider' && apiKey === null) {
    throw new Error('LLM_API_KEY is required when LLM_MODE=provider');
  }

  return {
    mode: modeRaw,
    model,
    apiKey,
    baseURL
  };
}
