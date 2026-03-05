import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/db/schema';
import { StudyRepository } from '../src/repositories/core-repositories';

async function createFixture() {
  const dbPath = `/tmp/say-right-d1-${randomUUID()}.db`;
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });

  return {
    db,
    repo: new StudyRepository(db),
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('D1 schema + repository', () => {
  it('核心表 CRUD 通路可用', async () => {
    const fixture = await createFixture();
    try {
      const userId = randomUUID();
      const deckId = randomUUID();
      const cardId = randomUUID();
      const sessionId = randomUUID();
      const reviewLogId = randomUUID();

      await fixture.repo.createUser({
        userId,
        email: 'user@example.com',
        passwordHash: 'hashed',
        nickname: 'u1'
      });

      await fixture.repo.createDeck({
        deckId,
        userId,
        name: 'Default',
        isDefault: true
      });

      await fixture.repo.createCard({
        cardId,
        userId,
        deckId,
        frontText: '前',
        backText: 'back',
        sourceLang: 'zh',
        targetLang: 'en',
        dueAt: Date.now()
      });

      await fixture.repo.createReviewSessionWithCards({
        sessionId,
        userId,
        deckId,
        cardIds: [cardId]
      });

      await fixture.repo.createReviewLog({
        reviewLogId,
        userId,
        cardId,
        sessionId,
        ratingSource: 'manual',
        finalRating: 'good',
        isNewCard: true,
        fsrsSnapshot: JSON.stringify({ stability: 1.2 })
      });

      const rows = await fixture.db
        .select()
        .from(schema.reviewSessionCards)
        .where(eq(schema.reviewSessionCards.sessionId, sessionId));

      expect(rows).toHaveLength(1);
      expect(rows[0]?.cardId).toBe(cardId);
    } finally {
      await fixture.cleanup();
    }
  });

  it('users.email 唯一键生效', async () => {
    const fixture = await createFixture();
    try {
      await fixture.repo.createUser({
        userId: randomUUID(),
        email: 'dup@example.com',
        passwordHash: 'hashed',
        nickname: null
      });

      await expect(
        fixture.repo.createUser({
          userId: randomUUID(),
          email: 'dup@example.com',
          passwordHash: 'hashed2',
          nickname: null
        })
      ).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });

  it('decks.user_id 外键生效', async () => {
    const fixture = await createFixture();
    try {
      await expect(
        fixture.repo.createDeck({
          deckId: randomUUID(),
          userId: randomUUID(),
          name: 'Orphan Deck',
          isDefault: false
        })
      ).rejects.toThrow();
    } finally {
      await fixture.cleanup();
    }
  });

  it('review_session_cards 主键唯一 + session 删除级联', async () => {
    const fixture = await createFixture();
    try {
      const userId = randomUUID();
      const deckId = randomUUID();
      const cardId = randomUUID();
      const sessionId = randomUUID();

      await fixture.repo.createUser({
        userId,
        email: 'cascade@example.com',
        passwordHash: 'hashed',
        nickname: null
      });
      await fixture.repo.createDeck({
        deckId,
        userId,
        name: 'Deck',
        isDefault: false
      });
      await fixture.repo.createCard({
        cardId,
        userId,
        deckId,
        frontText: 'q',
        backText: 'a',
        sourceLang: 'zh',
        targetLang: 'en',
        dueAt: Date.now()
      });
      await fixture.repo.createReviewSessionWithCards({
        sessionId,
        userId,
        deckId,
        cardIds: [cardId]
      });

      await expect(
        fixture.repo.addReviewSessionCard({
          sessionId,
          cardId,
          ord: 0
        })
      ).rejects.toThrow();

      await fixture.repo.deleteReviewSession(sessionId);

      const rows = await fixture.db
        .select()
        .from(schema.reviewSessionCards)
        .where(eq(schema.reviewSessionCards.sessionId, sessionId));

      expect(rows).toHaveLength(0);
    } finally {
      await fixture.cleanup();
    }
  });
});
