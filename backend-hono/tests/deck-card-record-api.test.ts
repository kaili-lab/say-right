import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/db/schema';
import { createBetterAuth } from '../src/auth';
import { createApp } from '../src/app';

const ORIGIN = 'http://localhost:5173';
const BASE_URL = 'http://local.test';

function pickCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? '';
}

async function createFixture() {
  const dbPath = `/tmp/say-right-hono-006-${randomUUID()}.db`;
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
    getDb: () => db
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
    env,
    signUpAndGetCookie,
    requestWithCookie,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('HONO-006 Deck/Card/Record API parity', () => {
  it('deck 路由应支持默认组初始化、创建、冲突与删除规则', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`deck-${randomUUID()}@example.com`);

      const listResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      expect(listResponse.status).toBe(200);
      const listBody = (await listResponse.json()) as Array<Record<string, unknown>>;
      expect(listBody.length).toBeGreaterThanOrEqual(1);
      expect(listBody[0]?.is_default).toBe(true);

      const defaultDeckId = String(listBody[0]?.id);
      const deleteDefaultResponse = await fixture.requestWithCookie(`/decks/${defaultDeckId}`, cookie, {
        method: 'DELETE'
      });
      expect(deleteDefaultResponse.status).toBe(409);

      const createResponse = await fixture.requestWithCookie('/decks', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Travel' })
      });
      expect(createResponse.status).toBe(201);
      const createdDeck = (await createResponse.json()) as Record<string, unknown>;
      expect(createdDeck.name).toBe('Travel');

      const duplicateResponse = await fixture.requestWithCookie('/decks', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'travel' })
      });
      expect(duplicateResponse.status).toBe(409);

      const createdDeckId = String(createdDeck.id);
      const deleteCreatedResponse = await fixture.requestWithCookie(`/decks/${createdDeckId}`, cookie, {
        method: 'DELETE'
      });
      expect(deleteCreatedResponse.status).toBe(204);

      const deleteAgainResponse = await fixture.requestWithCookie(`/decks/${createdDeckId}`, cookie, {
        method: 'DELETE'
      });
      expect(deleteAgainResponse.status).toBe(404);
    } finally {
      await fixture.cleanup();
    }
  });

  it('card 路由应支持列表、编辑、移动与删除', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`card-${randomUUID()}@example.com`);

      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const fromDeckId = String(decks[0]?.id);

      const toDeckResponse = await fixture.requestWithCookie('/decks', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Work' })
      });
      const toDeck = (await toDeckResponse.json()) as Record<string, unknown>;
      const toDeckId = String(toDeck.id);

      const saveResponse = await fixture.requestWithCookie('/records/save', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          generated_text: 'Hello',
          deck_id: fromDeckId,
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(saveResponse.status).toBe(201);
      const savedCard = (await saveResponse.json()) as Record<string, unknown>;
      const cardId = String(savedCard.card_id);

      const listCardsResponse = await fixture.requestWithCookie(`/decks/${fromDeckId}/cards`, cookie, {
        method: 'GET'
      });
      expect(listCardsResponse.status).toBe(200);
      const cards = (await listCardsResponse.json()) as Array<Record<string, unknown>>;
      expect(cards[0]?.id).toBe(cardId);

      const patchResponse = await fixture.requestWithCookie(`/cards/${cardId}`, cookie, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          front_text: '你好呀',
          back_text: 'Hello there'
        })
      });
      expect(patchResponse.status).toBe(200);
      const patched = (await patchResponse.json()) as Record<string, unknown>;
      expect(patched.front_text).toBe('你好呀');
      expect(patched.deck_id).toBe(fromDeckId);

      const moveResponse = await fixture.requestWithCookie(`/cards/${cardId}/move`, cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to_deck_id: toDeckId })
      });
      expect(moveResponse.status).toBe(200);
      const moved = (await moveResponse.json()) as Record<string, unknown>;
      expect(moved.deck_id).toBe(toDeckId);

      const moveToUnknownResponse = await fixture.requestWithCookie(`/cards/${cardId}/move`, cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to_deck_id: 'missing-deck' })
      });
      expect(moveToUnknownResponse.status).toBe(404);

      const deleteResponse = await fixture.requestWithCookie(`/cards/${cardId}`, cookie, {
        method: 'DELETE'
      });
      expect(deleteResponse.status).toBe(204);

      const deleteAgainResponse = await fixture.requestWithCookie(`/cards/${cardId}`, cookie, {
        method: 'DELETE'
      });
      expect(deleteAgainResponse.status).toBe(404);
    } finally {
      await fixture.cleanup();
    }
  });

  it('record generate/save 路由应覆盖成功、422、404、503', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`record-${randomUUID()}@example.com`);

      const generateResponse = await fixture.requestWithCookie('/records/generate', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(generateResponse.status).toBe(200);
      expect((await generateResponse.json()).generated_text).toBe('Hello.');

      const generateValidationResponse = await fixture.requestWithCookie('/records/generate', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '   ',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(generateValidationResponse.status).toBe(422);

      const generateUnavailableResponse = await fixture.requestWithCookie('/records/generate', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '__FAIL_STUB__',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(generateUnavailableResponse.status).toBe(503);

      const saveMissingDeckResponse = await fixture.requestWithCookie('/records/save', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          generated_text: 'Hello',
          deck_id: 'missing-deck',
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(saveMissingDeckResponse.status).toBe(404);

      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const defaultDeckId = String(decks[0]?.id);

      const saveTooLongResponse = await fixture.requestWithCookie('/records/save', cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source_text: '你好',
          generated_text: 'a'.repeat(301),
          deck_id: defaultDeckId,
          source_lang: 'zh',
          target_lang: 'en'
        })
      });
      expect(saveTooLongResponse.status).toBe(422);
    } finally {
      await fixture.cleanup();
    }
  });

  it('未登录访问 deck/card/record 关键路由应返回 401', async () => {
    const fixture = await createFixture();
    try {
      const decksResponse = await fixture.app.request(`${BASE_URL}/decks`, { method: 'GET' }, fixture.env);
      expect(decksResponse.status).toBe(401);

      const cardsResponse = await fixture.app.request(
        `${BASE_URL}/decks/any/cards`,
        { method: 'GET' },
        fixture.env
      );
      expect(cardsResponse.status).toBe(401);

      const generateResponse = await fixture.app.request(
        `${BASE_URL}/records/generate`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            source_text: '你好',
            source_lang: 'zh',
            target_lang: 'en'
          })
        },
        fixture.env
      );
      expect(generateResponse.status).toBe(401);
    } finally {
      await fixture.cleanup();
    }
  });
});
