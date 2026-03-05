import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/db/schema';
import {
  importSnapshotToD1,
  parseMigrationSnapshot,
  type MigrationSnapshot,
  verifySnapshotAgainstD1
} from '../src/migration/snapshot';

function createSampleSnapshot(): MigrationSnapshot {
  const baseTime = '2026-03-06T00:00:00Z';
  return {
    source: 'postgres',
    exported_at: '2026-03-06T06:40:00Z',
    tables: {
      users: [
        {
          user_id: 'u-1',
          email: 'migration@example.com',
          password_hash: 'hash',
          nickname: 'Kai',
          created_at: baseTime
        }
      ],
      decks: [
        {
          deck_id: 'd-1',
          user_id: 'u-1',
          name: 'Travel',
          is_default: true,
          new_count: 0,
          learning_count: 0,
          due_count: 1,
          created_at: baseTime
        }
      ],
      cards: [
        {
          card_id: 'c-1',
          user_id: 'u-1',
          deck_id: 'd-1',
          front_text: '你好',
          back_text: 'Hello',
          source_lang: 'zh',
          target_lang: 'en',
          due_at: baseTime,
          stability: 2.0,
          difficulty: 5.0,
          reps: 1,
          lapses: 0,
          created_at: baseTime,
          updated_at: baseTime
        }
      ],
      review_sessions: [
        {
          session_id: 's-1',
          user_id: 'u-1',
          deck_id: 'd-1',
          created_at: baseTime
        }
      ],
      review_session_cards: [
        {
          session_id: 's-1',
          card_id: 'c-1',
          ord: 0
        }
      ],
      review_logs: [
        {
          review_log_id: 'l-1',
          user_id: 'u-1',
          card_id: 'c-1',
          session_id: 's-1',
          rating_source: 'manual',
          final_rating: 'good',
          is_new_card: false,
          rated_at: baseTime,
          fsrs_snapshot: {
            due_at: baseTime,
            stability: 2.4,
            difficulty: 4.8,
            reps: 2,
            lapses: 0
          }
        }
      ]
    }
  };
}

async function createDbFixture() {
  const dbPath = `/tmp/say-right-hono-009-${randomUUID()}.db`;
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });

  return {
    db,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('HONO-009 migration tools', () => {
  it('应支持重复导入并通过一致性校验', async () => {
    const fixture = await createDbFixture();
    try {
      const snapshot = parseMigrationSnapshot(createSampleSnapshot());

      await importSnapshotToD1(fixture.db, snapshot);
      await importSnapshotToD1(fixture.db, snapshot);

      const report = await verifySnapshotAgainstD1(fixture.db, snapshot);
      expect(report.ok).toBe(true);
      expect(report.tables.every((item) => item.count_match)).toBe(true);
      expect(report.tables.every((item) => item.hash_match)).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it('校验应在关键字段漂移时失败（Red 覆盖）', async () => {
    const fixture = await createDbFixture();
    try {
      const snapshot = parseMigrationSnapshot(createSampleSnapshot());
      await importSnapshotToD1(fixture.db, snapshot);

      await fixture.db
        .update(schema.decks)
        .set({ name: 'Changed' })
        .where(eq(schema.decks.deckId, 'd-1'));

      const report = await verifySnapshotAgainstD1(fixture.db, snapshot);
      expect(report.ok).toBe(false);
      const deckResult = report.tables.find((item) => item.table === 'decks');
      expect(deckResult?.count_match).toBe(true);
      expect(deckResult?.hash_match).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });
});
