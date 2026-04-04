/**
 * 语音运行时配置与场景映射。
 * WHAT: 解析 STT 环境变量，并统一 scene -> default language/prompt 的映射。
 * WHY: 保证语音契约只有一个事实来源，路由层只消费已验证后的结构化配置。
 */
import {
  SPEECH_LANGUAGES,
  SPEECH_SCENES,
  type SpeechLanguage,
  type SpeechProvider,
  type SpeechScene,
  type SpeechSceneConfig
} from './types';

export type SpeechRuntimeEnv = {
  STT_PROVIDER?: string;
  STT_MODEL?: string;
  STT_TIMEOUT_MS?: string;
  STT_MAX_FILE_SIZE_BYTES?: string;
  STT_FEATURE_ENABLED?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
};

export type SpeechConfig = {
  featureEnabled: boolean;
  provider: SpeechProvider;
  model: string;
  timeoutMs: number;
  maxFileSizeBytes: number;
  apiKey: string | null;
  baseURL: string | null;
};

export type ResolvedSpeechInput = {
  scene: SpeechScene;
  language: SpeechLanguage;
  prompt: string;
};

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const SCENE_CONFIG: Record<SpeechScene, SpeechSceneConfig> = {
  record_source: {
    defaultLanguage: 'zh',
    prompt: '请将语音准确转写为中文文本，保留原有标点与停顿。'
  },
  record_generated: {
    defaultLanguage: 'en',
    prompt: 'Please transcribe spoken content into natural English text and keep punctuation.'
  },
  review_answer: {
    defaultLanguage: 'en',
    prompt: 'Please transcribe the learner answer in English and keep punctuation.'
  },
  card_front: {
    defaultLanguage: 'zh',
    prompt: '请将卡片正面语音准确转写为中文文本，保留原有标点。'
  },
  card_back: {
    defaultLanguage: 'en',
    prompt: 'Please transcribe the card back speech into English text and keep punctuation.'
  }
};

function normalizeOptional(value?: string) {
  if (!value) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBoolean(raw: string | undefined, defaultValue: boolean) {
  if (raw === undefined) {
    return defaultValue;
  }
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new Error('STT_FEATURE_ENABLED must be true or false');
}

function parsePositiveInt(raw: string | undefined, fallback: number, fieldName: string) {
  if (raw === undefined || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

function parseProvider(raw: string | undefined): SpeechProvider {
  const normalized = (raw ?? 'aihubmix').trim().toLowerCase();
  if (normalized === 'aihubmix') {
    return normalized;
  }
  throw new Error('STT_PROVIDER must be: aihubmix');
}

function parseScene(sceneRaw: string): SpeechScene {
  const normalized = sceneRaw.trim();
  if ((SPEECH_SCENES as readonly string[]).includes(normalized)) {
    return normalized as SpeechScene;
  }
  throw new Error(`scene must be one of: ${SPEECH_SCENES.join(', ')}`);
}

function parseLanguage(languageRaw: string): SpeechLanguage {
  const normalized = languageRaw.trim().toLowerCase();
  if ((SPEECH_LANGUAGES as readonly string[]).includes(normalized)) {
    return normalized as SpeechLanguage;
  }
  throw new Error(`language must be one of: ${SPEECH_LANGUAGES.join(', ')}`);
}

export function isLearningSpeechScene(sceneRaw: string): sceneRaw is SpeechScene {
  return (SPEECH_SCENES as readonly string[]).includes(sceneRaw);
}

export function resolveSpeechSceneConfig(scene: SpeechScene) {
  return SCENE_CONFIG[scene];
}

export function resolveSpeechInput(input: {
  scene: string;
  language?: string | null;
}): ResolvedSpeechInput {
  const scene = parseScene(input.scene);
  const sceneConfig = resolveSpeechSceneConfig(scene);
  const language = input.language ? parseLanguage(input.language) : sceneConfig.defaultLanguage;

  return {
    scene,
    language,
    prompt: sceneConfig.prompt
  };
}

export function resolveSpeechConfig(env: SpeechRuntimeEnv): SpeechConfig {
  const featureEnabled = parseBoolean(env.STT_FEATURE_ENABLED, true);
  const provider = parseProvider(env.STT_PROVIDER);
  const model = normalizeOptional(env.STT_MODEL) ?? 'whisper-large-v3';
  const timeoutMs = parsePositiveInt(env.STT_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 'STT_TIMEOUT_MS');
  const maxFileSizeBytes = parsePositiveInt(
    env.STT_MAX_FILE_SIZE_BYTES,
    DEFAULT_MAX_FILE_SIZE_BYTES,
    'STT_MAX_FILE_SIZE_BYTES'
  );
  const apiKey = normalizeOptional(env.LLM_API_KEY) ?? normalizeOptional(env.OPENAI_API_KEY);
  const baseURL = normalizeOptional(env.LLM_BASE_URL) ?? normalizeOptional(env.OPENAI_BASE_URL);

  if (featureEnabled && apiKey === null) {
    throw new Error('LLM_API_KEY is required when STT_FEATURE_ENABLED=true');
  }

  return {
    featureEnabled,
    provider,
    model,
    timeoutMs,
    maxFileSizeBytes,
    apiKey,
    baseURL
  };
}
