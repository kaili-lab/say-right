/**
 * 语音转写领域类型。
 * WHAT: 统一约束 scene/language/provider 与转写入参出参结构。
 * WHY: 避免路由层和 provider 层各自定义字符串字面量，降低契约漂移风险。
 */

export const SPEECH_SCENES = [
  'record_source',
  'record_generated',
  'review_answer',
  'card_front',
  'card_back'
] as const;

export type SpeechScene = (typeof SPEECH_SCENES)[number];

export const SPEECH_LANGUAGES = ['zh', 'en'] as const;
export type SpeechLanguage = (typeof SPEECH_LANGUAGES)[number];

export type SpeechProvider = 'aihubmix';

export type SpeechSceneConfig = {
  defaultLanguage: SpeechLanguage;
  prompt: string;
};

export type SpeechTranscribeRequest = {
  audio: Blob | File;
  scene: SpeechScene;
  language: SpeechLanguage;
  prompt: string;
};

export type SpeechTranscribeResult = {
  text: string;
  language: SpeechLanguage;
  providerModel: string;
};
