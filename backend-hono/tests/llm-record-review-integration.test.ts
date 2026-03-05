import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createBetterAuth } from '../src/auth';
import { createApp } from '../src/app';
import * as schema from '../src/db/schema';
import { LLMUnavailableError, type LLMAdapter } from '../src/llm/adapter';

const ORIGIN = 'http://localhost:5173';
const BASE_URL = 'http://local.test';

function pickCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? '';
}

async function createFixture(llm: LLMAdapter) {
  const dbPath = `/tmp/say-right-hono-008-${randomUUID()}.db`;
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
    getLlm: () => llm
  });

  const env = {
    APP_CORS_ALLOW_ORIGINS: ORIGIN
  };

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
      env
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    return pickCookie(setCookie ?? '');
  }

  async function requestWithCookie(path: string, cookie: string, init?: RequestInit) {
    return app.request(
      `${BASE_URL}${path}`,
      {
        ...(init ?? {}),
        headers: {
          origin: ORIGIN,
          cookie,
          ...(init?.headers ?? {})
        }
      },
      env
    );
  }

  return {
    app,
    signUpAndGetCookie,
    requestWithCookie,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('HONO-008 LLM wiring integration', () => {
  it('records/generate 应通过 LLM adapter 返回生成结果并映射 503', async () => {
    const llm: LLMAdapter = {
      async generateEnglish() {
        return 'Provider hello';
      },
      async scoreReview() {
        return {
          score: 80,
          feedback: 'ok',
          suggestedRating: 'good'
        };
      }
    };

    const fixture = await createFixture(llm);
    try {
      const cookie = await fixture.signUpAndGetCookie(`llm-generate-${randomUUID()}@example.com`);
      const response = await fixture.requestWithCookie('/records/generate', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });

      expect(response.status).toBe(200);
      expect((await response.json()).generated_text).toBe('Provider hello');
    } finally {
      await fixture.cleanup();
    }

    const unavailableFixture = await createFixture({
      async generateEnglish() {
        throw new LLMUnavailableError('provider timeout');
      },
      async scoreReview() {
        return {
          score: 80,
          feedback: 'ok',
          suggestedRating: 'good'
        };
      }
    });

    try {
      const cookie = await unavailableFixture.signUpAndGetCookie(
        `llm-generate-unavailable-${randomUUID()}@example.com`
      );
      const response = await unavailableFixture.requestWithCookie('/records/generate', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });

      expect(response.status).toBe(503);
    } finally {
      await unavailableFixture.cleanup();
    }
  });

  it('review ai-score 应通过 LLM adapter 评分并映射 503', async () => {
    const llm: LLMAdapter = {
      async generateEnglish() {
        return 'Hello';
      },
      async scoreReview() {
        return {
          score: 92,
          feedback: '表达准确',
          suggestedRating: 'easy'
        };
      }
    };

    const fixture = await createFixture(llm);
    try {
      const cookie = await fixture.signUpAndGetCookie(`llm-review-${randomUUID()}@example.com`);
      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const defaultDeckId = String(((await decksResponse.json()) as Array<{ id: string }>)[0]?.id);

      const saveResponse = await fixture.requestWithCookie('/records/save', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '谢谢',
          generated_text: 'Thank you',
          deck_id: defaultDeckId,
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(saveResponse.status).toBe(201);
      const cardId = String((await saveResponse.json()).card_id);

      const sessionResponse = await fixture.requestWithCookie(
        `/review/decks/${defaultDeckId}/session`,
        cookie,
        { method: 'GET' }
      );
      expect(sessionResponse.status).toBe(200);
      const sessionId = String((await sessionResponse.json()).session_id);

      const scoreResponse = await fixture.requestWithCookie(
        `/review/session/${sessionId}/ai-score`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            card_id: cardId,
            user_answer: 'Thank you'
          })
        }
      );
      expect(scoreResponse.status).toBe(200);
      expect((await scoreResponse.json()).suggested_rating).toBe('easy');
    } finally {
      await fixture.cleanup();
    }

    const unavailableFixture = await createFixture({
      async generateEnglish() {
        return 'Hello';
      },
      async scoreReview() {
        throw new LLMUnavailableError('provider unavailable');
      }
    });

    try {
      const cookie = await unavailableFixture.signUpAndGetCookie(
        `llm-review-unavailable-${randomUUID()}@example.com`
      );
      const decksResponse = await unavailableFixture.requestWithCookie('/decks', cookie, {
        method: 'GET'
      });
      const defaultDeckId = String(((await decksResponse.json()) as Array<{ id: string }>)[0]?.id);

      const saveResponse = await unavailableFixture.requestWithCookie('/records/save', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          generated_text: 'Hello',
          deck_id: defaultDeckId,
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      const cardId = String((await saveResponse.json()).card_id);

      const sessionResponse = await unavailableFixture.requestWithCookie(
        `/review/decks/${defaultDeckId}/session`,
        cookie,
        { method: 'GET' }
      );
      const sessionId = String((await sessionResponse.json()).session_id);

      const scoreResponse = await unavailableFixture.requestWithCookie(
        `/review/session/${sessionId}/ai-score`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            card_id: cardId,
            user_answer: 'Hello'
          })
        }
      );

      expect(scoreResponse.status).toBe(503);
    } finally {
      await unavailableFixture.cleanup();
    }
  });
});
