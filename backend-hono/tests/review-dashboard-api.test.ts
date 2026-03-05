import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { eq, sql } from 'drizzle-orm';
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
  const dbPath = `/tmp/say-right-hono-007-${randomUUID()}.db`;
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

  async function signUpAndGetCookie(email: string, name = 'Tester') {
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
          name
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

  async function createDeck(cookie: string, name: string) {
    const response = await requestWithCookie('/decks', cookie, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name })
    });
    expect(response.status).toBe(201);
    return String((await response.json()).id);
  }

  async function findDeckOwner(deckId: string) {
    const [deck] = await db
      .select({ userId: schema.decks.userId })
      .from(schema.decks)
      .where(eq(schema.decks.deckId, deckId))
      .limit(1);
    if (!deck) {
      throw new Error(`deck not found: ${deckId}`);
    }
    return deck.userId;
  }

  async function insertCard(input: {
    userId: string;
    deckId: string;
    frontText: string;
    backText: string;
    dueAt: number;
    reps: number;
    stability?: number;
    difficulty?: number;
    lapses?: number;
  }) {
    const cardId = randomUUID();
    const now = Date.now();

    await db.insert(schema.cards).values({
      cardId,
      userId: input.userId,
      deckId: input.deckId,
      frontText: input.frontText,
      backText: input.backText,
      sourceLang: 'zh',
      targetLang: 'en',
      dueAt: input.dueAt,
      stability: input.stability ?? 2,
      difficulty: input.difficulty ?? 5,
      reps: input.reps,
      lapses: input.lapses ?? 0,
      createdAt: now,
      updatedAt: now
    });

    return cardId;
  }

  async function recomputeDeckCounts(deckId: string) {
    const now = Date.now();
    const [counts] = await db
      .select({
        totalCount: sql<number>`count(*)`,
        newCount: sql<number>`sum(case when ${schema.cards.reps} = 0 then 1 else 0 end)`,
        dueCount: sql<number>`sum(case when ${schema.cards.reps} > 0 and ${schema.cards.dueAt} <= ${now} then 1 else 0 end)`
      })
      .from(schema.cards)
      .where(eq(schema.cards.deckId, deckId));

    const totalCount = Number(counts?.totalCount ?? 0);
    const newCount = Number(counts?.newCount ?? 0);
    const dueCount = Number(counts?.dueCount ?? 0);

    await db
      .update(schema.decks)
      .set({
        newCount,
        dueCount,
        learningCount: Math.max(totalCount - newCount - dueCount, 0)
      })
      .where(eq(schema.decks.deckId, deckId));
  }

  async function createReviewSession(userId: string, deckId: string, cardIds: string[]) {
    const sessionId = randomUUID();
    await db.insert(schema.reviewSessions).values({
      sessionId,
      userId,
      deckId,
      createdAt: Date.now()
    });

    for (let index = 0; index < cardIds.length; index += 1) {
      await db.insert(schema.reviewSessionCards).values({
        sessionId,
        cardId: cardIds[index] ?? '',
        ord: index
      });
    }

    return sessionId;
  }

  async function insertReviewLog(input: {
    userId: string;
    cardId: string;
    sessionId: string;
    ratingSource: 'manual' | 'ai';
    finalRating: 'again' | 'hard' | 'good' | 'easy';
    isNewCard: boolean;
    ratedAt?: number;
  }) {
    await db.insert(schema.reviewLogs).values({
      reviewLogId: randomUUID(),
      userId: input.userId,
      cardId: input.cardId,
      sessionId: input.sessionId,
      ratingSource: input.ratingSource,
      finalRating: input.finalRating,
      isNewCard: input.isNewCard,
      ratedAt: input.ratedAt ?? Date.now(),
      fsrsSnapshot: JSON.stringify({
        due_at: new Date().toISOString(),
        stability: 2,
        difficulty: 5,
        reps: 1,
        lapses: 0
      })
    });
  }

  return {
    app,
    db,
    env,
    signUpAndGetCookie,
    requestWithCookie,
    createDeck,
    findDeckOwner,
    insertCard,
    recomputeDeckCounts,
    createReviewSession,
    insertReviewLog,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('HONO-007 Review/Dashboard API parity', () => {
  it('review/decks 与 review session 应按契约返回并持久化 session', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`review-decks-${randomUUID()}@example.com`);
      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const defaultDeckId = String(decks[0]?.id);

      const travelDeckId = await fixture.createDeck(cookie, 'Travel');
      const foodDeckId = await fixture.createDeck(cookie, 'Food');
      const userId = await fixture.findDeckOwner(defaultDeckId);

      const now = Date.now();
      const travelCardEarly = await fixture.insertCard({
        userId,
        deckId: travelDeckId,
        frontText: '旅行问路-1',
        backText: 'travel one',
        dueAt: now - 3_600_000,
        reps: 1
      });
      const travelCardLate = await fixture.insertCard({
        userId,
        deckId: travelDeckId,
        frontText: '旅行问路-2',
        backText: 'travel two',
        dueAt: now - 60_000,
        reps: 2
      });
      await fixture.insertCard({
        userId,
        deckId: foodDeckId,
        frontText: '点菜',
        backText: 'order food',
        dueAt: now - 30_000,
        reps: 1
      });

      await fixture.recomputeDeckCounts(travelDeckId);
      await fixture.recomputeDeckCounts(foodDeckId);

      const reviewDecksResponse = await fixture.requestWithCookie('/review/decks', cookie, { method: 'GET' });
      expect(reviewDecksResponse.status).toBe(200);
      const reviewDecks = (await reviewDecksResponse.json()) as Array<Record<string, unknown>>;
      expect(reviewDecks[0]?.deck_id).toBe(travelDeckId);
      expect(reviewDecks[0]?.due_count).toBe(2);

      const sessionResponse = await fixture.requestWithCookie(`/review/decks/${travelDeckId}/session`, cookie, {
        method: 'GET'
      });
      expect(sessionResponse.status).toBe(200);
      const sessionBody = (await sessionResponse.json()) as {
        session_id: string;
        cards: Array<{
          card_id: string;
          fsrs_state: { reps: number };
        }>;
      };

      expect(sessionBody.cards.length).toBe(2);
      expect(sessionBody.cards[0]?.card_id).toBe(travelCardEarly);
      expect(sessionBody.cards[1]?.card_id).toBe(travelCardLate);
      expect(sessionBody.cards[0]?.fsrs_state.reps).toBeGreaterThan(0);

      const [storedSession] = await fixture.db
        .select()
        .from(schema.reviewSessions)
        .where(eq(schema.reviewSessions.sessionId, sessionBody.session_id))
        .limit(1);
      expect(storedSession?.deckId).toBe(travelDeckId);

      const storedSessionCards = await fixture.db
        .select()
        .from(schema.reviewSessionCards)
        .where(eq(schema.reviewSessionCards.sessionId, sessionBody.session_id));
      expect(storedSessionCards.length).toBe(2);
    } finally {
      await fixture.cleanup();
    }
  });

  it('review session 应应用每日上限并按当日 review_logs 抵扣配额', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`review-limit-${randomUUID()}@example.com`);
      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const userId = await fixture.findDeckOwner(String(decks[0]?.id));
      const deckId = await fixture.createDeck(cookie, 'QuotaDeck');

      const reviewCardIds: string[] = [];
      const newCardIds: string[] = [];
      for (let index = 0; index < 105; index += 1) {
        reviewCardIds.push(
          await fixture.insertCard({
            userId,
            deckId,
            frontText: `旧卡-${index}`,
            backText: `due-${index}`,
            dueAt: Date.now() - 86_400_000,
            reps: 1
          })
        );
      }

      for (let index = 0; index < 22; index += 1) {
        newCardIds.push(
          await fixture.insertCard({
            userId,
            deckId,
            frontText: `新卡-${index}`,
            backText: `new-${index}`,
            dueAt: Date.now() - 60_000,
            reps: 0,
            stability: 0,
            difficulty: 0
          })
        );
      }

      const sessionForLogs = await fixture.createReviewSession(userId, deckId, [
        reviewCardIds[0] ?? '',
        reviewCardIds[1] ?? '',
        newCardIds[0] ?? ''
      ]);
      await fixture.insertReviewLog({
        userId,
        cardId: reviewCardIds[0] ?? '',
        sessionId: sessionForLogs,
        ratingSource: 'manual',
        finalRating: 'good',
        isNewCard: false
      });
      await fixture.insertReviewLog({
        userId,
        cardId: reviewCardIds[1] ?? '',
        sessionId: sessionForLogs,
        ratingSource: 'manual',
        finalRating: 'hard',
        isNewCard: false
      });
      await fixture.insertReviewLog({
        userId,
        cardId: newCardIds[0] ?? '',
        sessionId: sessionForLogs,
        ratingSource: 'manual',
        finalRating: 'again',
        isNewCard: true
      });

      const response = await fixture.requestWithCookie(`/review/decks/${deckId}/session`, cookie, {
        method: 'GET'
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        cards: Array<{ fsrs_state: { reps: number } }>;
      };

      expect(body.cards.length).toBe(117);
      expect(body.cards[97]?.fsrs_state.reps).toBeGreaterThan(0);
      expect(body.cards[98]?.fsrs_state.reps).toBe(0);
    } finally {
      await fixture.cleanup();
    }
  });

  it('ai-score / rate / summary 应覆盖主链路与 422/404/503 边界', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`review-flow-${randomUUID()}@example.com`);
      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const userId = await fixture.findDeckOwner(String(decks[0]?.id));
      const deckId = await fixture.createDeck(cookie, 'Travel');

      const cardId = await fixture.insertCard({
        userId,
        deckId,
        frontText: '谢谢',
        backText: 'Thank you',
        dueAt: Date.now() - 60_000,
        reps: 1,
        stability: 2,
        difficulty: 5
      });
      await fixture.recomputeDeckCounts(deckId);

      const sessionResponse = await fixture.requestWithCookie(`/review/decks/${deckId}/session`, cookie, {
        method: 'GET'
      });
      expect(sessionResponse.status).toBe(200);
      const sessionId = String((await sessionResponse.json()).session_id);

      const aiScoreResponse = await fixture.requestWithCookie(`/review/session/${sessionId}/ai-score`, cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ card_id: cardId, user_answer: 'Thank you' })
      });
      expect(aiScoreResponse.status).toBe(200);
      expect((await aiScoreResponse.json()).suggested_rating).toBe('easy');

      const aiUnavailableResponse = await fixture.requestWithCookie(
        `/review/session/${sessionId}/ai-score`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ card_id: cardId, user_answer: '__AI_UNAVAILABLE__' })
        }
      );
      expect(aiUnavailableResponse.status).toBe(503);

      const aiValidationResponse = await fixture.requestWithCookie(
        `/review/session/${sessionId}/ai-score`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ card_id: cardId, user_answer: '   ' })
        }
      );
      expect(aiValidationResponse.status).toBe(422);

      const rateResponse = await fixture.requestWithCookie(`/review/session/${sessionId}/rate`, cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          card_id: cardId,
          rating_source: 'manual',
          rating_value: 'good',
          user_answer: 'Thank you'
        })
      });
      expect(rateResponse.status).toBe(200);
      const rateBody = (await rateResponse.json()) as {
        updated_fsrs_state: { reps: number };
      };
      expect(rateBody.updated_fsrs_state.reps).toBe(2);

      const rateValidationResponse = await fixture.requestWithCookie(
        `/review/session/${sessionId}/rate`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            card_id: cardId,
            rating_source: 'robot',
            rating_value: 'good'
          })
        }
      );
      expect(rateValidationResponse.status).toBe(422);

      const rateCardNotInSessionResponse = await fixture.requestWithCookie(
        `/review/session/${sessionId}/rate`,
        cookie,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            card_id: 'missing-card',
            rating_source: 'manual',
            rating_value: 'good'
          })
        }
      );
      expect(rateCardNotInSessionResponse.status).toBe(404);

      const summaryResponse = await fixture.requestWithCookie(`/review/session/${sessionId}/summary`, cookie, {
        method: 'GET'
      });
      expect(summaryResponse.status).toBe(200);
      const summaryBody = (await summaryResponse.json()) as {
        reviewed_count: number;
        accuracy: number;
        rating_distribution: Record<string, number>;
      };
      expect(summaryBody.reviewed_count).toBe(1);
      expect(summaryBody.accuracy).toBe(100);
      expect(summaryBody.rating_distribution.good).toBe(1);

      const summaryMissingResponse = await fixture.requestWithCookie('/review/session/missing/summary', cookie, {
        method: 'GET'
      });
      expect(summaryMissingResponse.status).toBe(404);
    } finally {
      await fixture.cleanup();
    }
  });

  it('dashboard/home-summary 应返回聚合统计并对齐展示字段', async () => {
    const fixture = await createFixture();
    try {
      const cookie = await fixture.signUpAndGetCookie(`dashboard-${randomUUID()}@example.com`, 'Kai');
      const decksResponse = await fixture.requestWithCookie('/decks', cookie, { method: 'GET' });
      const decks = (await decksResponse.json()) as Array<Record<string, unknown>>;
      const defaultDeckId = String(decks[0]?.id);
      const userId = await fixture.findDeckOwner(defaultDeckId);

      const travelDeckId = await fixture.createDeck(cookie, 'Travel');
      const workDeckId = await fixture.createDeck(cookie, 'Work');

      const reviewCardId = await fixture.insertCard({
        userId,
        deckId: travelDeckId,
        frontText: '你好',
        backText: 'Hello',
        dueAt: Date.now() - 7200_000,
        reps: 1,
        stability: 2,
        difficulty: 5
      });
      await fixture.insertCard({
        userId,
        deckId: workDeckId,
        frontText: '谢谢',
        backText: 'Thank you',
        dueAt: Date.now() - 3600_000,
        reps: 1,
        stability: 2,
        difficulty: 5
      });

      await fixture.recomputeDeckCounts(travelDeckId);
      await fixture.recomputeDeckCounts(workDeckId);

      const sessionResponse = await fixture.requestWithCookie(`/review/decks/${travelDeckId}/session`, cookie, {
        method: 'GET'
      });
      const sessionId = String((await sessionResponse.json()).session_id);

      const rateResponse = await fixture.requestWithCookie(`/review/session/${sessionId}/rate`, cookie, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          card_id: reviewCardId,
          rating_source: 'manual',
          rating_value: 'good'
        })
      });
      expect(rateResponse.status).toBe(200);

      const dashboardResponse = await fixture.requestWithCookie('/dashboard/home-summary', cookie, {
        method: 'GET'
      });
      expect(dashboardResponse.status).toBe(200);
      const dashboardBody = (await dashboardResponse.json()) as {
        display_name: string;
        insight: string;
        study_days: number;
        mastered_count: number;
        total_cards: number;
        total_due: number;
        recent_decks: Array<{ id: string }>;
      };

      expect(dashboardBody.display_name).toBe('Kai');
      expect(dashboardBody.insight.length).toBeGreaterThan(0);
      expect(dashboardBody.study_days).toBe(1);
      expect(dashboardBody.mastered_count).toBe(1);
      expect(dashboardBody.total_cards).toBe(2);
      expect(dashboardBody.total_due).toBe(1);
      expect(dashboardBody.recent_decks.length).toBe(3);

      const recentDeckIds = new Set(dashboardBody.recent_decks.map((item) => item.id));
      expect(recentDeckIds.has(travelDeckId)).toBe(true);
      expect(recentDeckIds.has(workDeckId)).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it('未登录访问 review/dashboard 路由应返回 401', async () => {
    const fixture = await createFixture();
    try {
      const reviewDecksResponse = await fixture.app.request(`${BASE_URL}/review/decks`, { method: 'GET' }, fixture.env);
      expect(reviewDecksResponse.status).toBe(401);

      const reviewSessionResponse = await fixture.app.request(
        `${BASE_URL}/review/decks/any/session`,
        { method: 'GET' },
        fixture.env
      );
      expect(reviewSessionResponse.status).toBe(401);

      const dashboardResponse = await fixture.app.request(
        `${BASE_URL}/dashboard/home-summary`,
        { method: 'GET' },
        fixture.env
      );
      expect(dashboardResponse.status).toBe(401);
    } finally {
      await fixture.cleanup();
    }
  });
});
