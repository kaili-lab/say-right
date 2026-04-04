import { describe, expect, it } from 'vitest';
import {
  isLearningSpeechScene,
  resolveSpeechConfig,
  resolveSpeechInput,
  resolveSpeechSceneConfig
} from '../src/speech/runtime';

describe('speech runtime', () => {
  it('应识别学习型 scene 并排除非学习型 scene', () => {
    expect(isLearningSpeechScene('record_source')).toBe(true);
    expect(isLearningSpeechScene('review_answer')).toBe(true);
    expect(isLearningSpeechScene('login_form')).toBe(false);
    expect(isLearningSpeechScene('deck_create')).toBe(false);
  });

  it('应解析 scene 默认语言与 prompt 映射', () => {
    const recordSource = resolveSpeechInput({ scene: 'record_source' });
    expect(recordSource.language).toBe('zh');
    expect(recordSource.prompt.length).toBeGreaterThan(0);

    const reviewAnswer = resolveSpeechInput({ scene: 'review_answer' });
    expect(reviewAnswer.language).toBe('en');
    expect(reviewAnswer.prompt.length).toBeGreaterThan(0);
  });

  it('应允许显式 language 覆盖 scene 默认语言', () => {
    const resolved = resolveSpeechInput({
      scene: 'card_front',
      language: 'en'
    });
    expect(resolved.scene).toBe('card_front');
    expect(resolved.language).toBe('en');
  });

  it('非法 scene/language 应抛出错误', () => {
    expect(() => resolveSpeechInput({ scene: 'login_form' })).toThrow('scene must be one of');
    expect(() =>
      resolveSpeechInput({
        scene: 'review_answer',
        language: 'ja'
      })
    ).toThrow('language must be one of');
  });

  it('应解析 STT 配置并复用 LLM key/baseURL', () => {
    const config = resolveSpeechConfig({
      STT_PROVIDER: 'aihubmix',
      STT_MODEL: 'whisper-large-v3',
      STT_TIMEOUT_MS: '16000',
      STT_MAX_FILE_SIZE_BYTES: '2097152',
      STT_FEATURE_ENABLED: 'true',
      LLM_API_KEY: 'sk-test',
      LLM_BASE_URL: 'https://aihubmix.com/v1'
    });

    expect(config.provider).toBe('aihubmix');
    expect(config.model).toBe('whisper-large-v3');
    expect(config.timeoutMs).toBe(16000);
    expect(config.maxFileSizeBytes).toBe(2097152);
    expect(config.apiKey).toBe('sk-test');
    expect(config.baseURL).toBe('https://aihubmix.com/v1');
  });

  it('STT_FEATURE_ENABLED=false 时允许缺省 key', () => {
    const config = resolveSpeechConfig({
      STT_FEATURE_ENABLED: 'false'
    });

    expect(config.featureEnabled).toBe(false);
    expect(config.apiKey).toBeNull();
  });

  it('非法 STT 配置应抛出错误', () => {
    expect(() =>
      resolveSpeechConfig({
        STT_PROVIDER: 'unknown',
        LLM_API_KEY: 'sk-test'
      })
    ).toThrow('STT_PROVIDER must be: aihubmix');

    expect(() =>
      resolveSpeechConfig({
        STT_TIMEOUT_MS: '0',
        LLM_API_KEY: 'sk-test'
      })
    ).toThrow('STT_TIMEOUT_MS must be a positive integer');

    expect(() => resolveSpeechConfig({ STT_FEATURE_ENABLED: 'yes' })).toThrow(
      'STT_FEATURE_ENABLED must be true or false'
    );

    expect(() => resolveSpeechConfig({ STT_FEATURE_ENABLED: 'true' })).toThrow(
      'LLM_API_KEY is required when STT_FEATURE_ENABLED=true'
    );
  });

  it('scene config 应稳定可追踪', () => {
    const cardBack = resolveSpeechSceneConfig('card_back');
    expect(cardBack.defaultLanguage).toBe('en');
    expect(cardBack.prompt).toContain('English');
  });
});
