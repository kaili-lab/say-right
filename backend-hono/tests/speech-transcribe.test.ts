import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createBetterAuth } from '../src/auth';
import { createApp } from '../src/app';
import * as schema from '../src/db/schema';
import {
  SpeechProviderUnavailableError,
  type SpeechToTextAdapter
} from '../src/speech/adapter';

const ORIGIN = 'http://localhost:5173';
const BASE_URL = 'http://local.test';

type FixtureOptions = {
  speech: SpeechToTextAdapter;
};

function pickCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? '';
}

function createSpeechEnv(overrides?: Record<string, string>) {
  return {
    APP_CORS_ALLOW_ORIGINS: ORIGIN,
    STT_PROVIDER: 'aihubmix',
    STT_MODEL: 'whisper-large-v3',
    STT_TIMEOUT_MS: '15000',
    STT_MAX_FILE_SIZE_BYTES: '10485760',
    STT_FEATURE_ENABLED: 'true',
    LLM_API_KEY: 'sk-test',
    LLM_BASE_URL: 'https://aihubmix.com/v1',
    ...(overrides ?? {})
  };
}

function createAudioFile(content: string) {
  return new File([content], 'speech.webm', { type: 'audio/webm' });
}

async function createFixture(options: FixtureOptions) {
  const dbPath = `/tmp/say-right-hono-013-${randomUUID()}.db`;
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });

  const auth = createBetterAuth(db, {
    baseURL: BASE_URL,
    secret: 'test-secret-32-char-long-for-dev-only',
    trustedOrigins: [ORIGIN]
  });

  const app = createApp({
    getAuth: () => auth,
    getDb: () => db,
    getSpeech: () => options.speech
  });

  async function signUpAndGetCookie(email: string) {
    const response = await app.request(
      `${BASE_URL}/api/auth/sign-up/email`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: ORIGIN
        },
        body: JSON.stringify({
          email,
          password: 'Password123!',
          name: 'Tester'
        })
      },
      createSpeechEnv()
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    return pickCookie(setCookie ?? '');
  }

  async function requestWithCookie(
    path: string,
    cookie: string,
    init: RequestInit,
    envOverrides?: Record<string, string>
  ) {
    return app.request(
      `${BASE_URL}${path}`,
      {
        ...init,
        headers: {
          origin: ORIGIN,
          cookie,
          ...(init.headers ?? {})
        }
      },
      createSpeechEnv(envOverrides)
    );
  }

  return {
    app,
    signUpAndGetCookie,
    requestWithCookie,
    async cleanup() {
      client.close();
      try {
        await rm(dbPath, { force: true });
      } catch (error) {
        const errno = error as { code?: string };
        if (errno.code !== 'EBUSY') {
          throw error;
        }
      }
    }
  };
}

function buildFormData(input: {
  file?: File;
  scene?: string;
  language?: string;
}) {
  const formData = new FormData();
  if (input.file) {
    formData.set('file', input.file);
  }
  if (input.scene) {
    formData.set('scene', input.scene);
  }
  if (input.language) {
    formData.set('language', input.language);
  }
  return formData;
}

describe('HONO-013 speech transcribe endpoint', () => {
  it('未登录访问应返回 401', async () => {
    const speech: SpeechToTextAdapter = {
      async transcribe() {
        return {
          text: 'hello',
          language: 'en',
          providerModel: 'whisper-large-v3'
        };
      }
    };
    const fixture = await createFixture({ speech });

    try {
      const formData = buildFormData({
        file: createAudioFile('hello'),
        scene: 'record_source',
        language: 'zh'
      });
      const response = await fixture.app.request(
        `${BASE_URL}/speech/transcribe`,
        {
          method: 'POST',
          headers: {
            origin: ORIGIN
          },
          body: formData
        },
        createSpeechEnv()
      );

      expect(response.status).toBe(401);
    } finally {
      await fixture.cleanup();
    }
  });

  it('应覆盖缺少文件、非法 scene、非法 language 的 422 校验', async () => {
    const speech: SpeechToTextAdapter = {
      async transcribe() {
        return {
          text: 'hello',
          language: 'en',
          providerModel: 'whisper-large-v3'
        };
      }
    };
    const fixture = await createFixture({ speech });

    try {
      const cookie = await fixture.signUpAndGetCookie(`speech-422-${randomUUID()}@example.com`);

      const missingFileResponse = await fixture.requestWithCookie(
        '/speech/transcribe',
        cookie,
        {
          method: 'POST',
          body: buildFormData({
            scene: 'record_source',
            language: 'zh'
          })
        }
      );
      expect(missingFileResponse.status).toBe(422);

      const invalidSceneResponse = await fixture.requestWithCookie(
        '/speech/transcribe',
        cookie,
        {
          method: 'POST',
          body: buildFormData({
            file: createAudioFile('hello'),
            scene: 'login_form',
            language: 'zh'
          })
        }
      );
      expect(invalidSceneResponse.status).toBe(422);

      const invalidLanguageResponse = await fixture.requestWithCookie(
        '/speech/transcribe',
        cookie,
        {
          method: 'POST',
          body: buildFormData({
            file: createAudioFile('hello'),
            scene: 'review_answer',
            language: 'ja'
          })
        }
      );
      expect(invalidLanguageResponse.status).toBe(422);
    } finally {
      await fixture.cleanup();
    }
  });

  it('音频超过限制时应返回 413', async () => {
    const speech: SpeechToTextAdapter = {
      async transcribe() {
        return {
          text: 'ignored',
          language: 'zh',
          providerModel: 'whisper-large-v3'
        };
      }
    };
    const fixture = await createFixture({ speech });

    try {
      const cookie = await fixture.signUpAndGetCookie(`speech-413-${randomUUID()}@example.com`);
      const response = await fixture.requestWithCookie(
        '/speech/transcribe',
        cookie,
        {
          method: 'POST',
          body: buildFormData({
            file: createAudioFile('12345'),
            scene: 'record_source',
            language: 'zh'
          })
        },
        { STT_MAX_FILE_SIZE_BYTES: '4' }
      );

      expect(response.status).toBe(413);
    } finally {
      await fixture.cleanup();
    }
  });

  it('provider 不可用时应映射为 503', async () => {
    const speech: SpeechToTextAdapter = {
      async transcribe() {
        throw new SpeechProviderUnavailableError('provider timeout', 503);
      }
    };
    const fixture = await createFixture({ speech });

    try {
      const cookie = await fixture.signUpAndGetCookie(`speech-503-${randomUUID()}@example.com`);
      const response = await fixture.requestWithCookie('/speech/transcribe', cookie, {
        method: 'POST',
        body: buildFormData({
          file: createAudioFile('hello'),
          scene: 'review_answer',
          language: 'en'
        })
      });

      expect(response.status).toBe(503);
      expect((await response.json()).detail).toBe('provider timeout');
    } finally {
      await fixture.cleanup();
    }
  });

  it('转写成功时应返回契约字段并传递 scene/language/prompt', async () => {
    const speechMock = vi.fn<SpeechToTextAdapter['transcribe']>().mockResolvedValue({
      text: 'Hello world.',
      language: 'en',
      providerModel: 'whisper-large-v3'
    });

    const fixture = await createFixture({
      speech: {
        transcribe: speechMock
      }
    });

    try {
      const cookie = await fixture.signUpAndGetCookie(`speech-200-${randomUUID()}@example.com`);
      const response = await fixture.requestWithCookie('/speech/transcribe', cookie, {
        method: 'POST',
        body: buildFormData({
          file: createAudioFile('hello'),
          scene: 'review_answer',
          language: 'en'
        })
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        text: 'Hello world.',
        language: 'en',
        provider_model: 'whisper-large-v3'
      });

      expect(speechMock).toHaveBeenCalledTimes(1);
      const [payload] = speechMock.mock.calls[0] ?? [];
      expect(payload?.scene).toBe('review_answer');
      expect(payload?.language).toBe('en');
      expect(payload?.prompt).toContain('English');
      expect(payload?.audio).toBeInstanceOf(File);
    } finally {
      await fixture.cleanup();
    }
  });
});
