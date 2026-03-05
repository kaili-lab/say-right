/**
 * Postgres -> D1 迁移快照工具。
 * WHAT: 定义快照结构、D1 导入流程与一致性校验逻辑。
 * WHY: 迁移任务需要可重复执行与可追溯报告，避免只凭人工抽查判断结果。
 */
import { createHash } from 'node:crypto';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

export const MIGRATION_TABLE_ORDER = [
  'users',
  'decks',
  'cards',
  'review_sessions',
  'review_session_cards',
  'review_logs'
] as const;

type MigrationTable = (typeof MIGRATION_TABLE_ORDER)[number];

type SnapshotRow = Record<string, unknown>;

export type MigrationSnapshot = {
  source: 'postgres';
  exported_at: string;
  tables: Record<MigrationTable, SnapshotRow[]>;
};

type MigrationDb = DrizzleD1Database<typeof schema> | LibSQLDatabase<typeof schema>;

const PRIMARY_KEY_FIELDS: Record<MigrationTable, string[]> = {
  users: ['user_id'],
  decks: ['deck_id'],
  cards: ['card_id'],
  review_sessions: ['session_id'],
  review_session_cards: ['session_id', 'card_id'],
  review_logs: ['review_log_id']
};

const D1_DELETE_ORDER: MigrationTable[] = [...MIGRATION_TABLE_ORDER].reverse();

function asString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`invalid ${fieldName}`);
  }
  return value;
}

function asOptionalString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('invalid optional string');
  }
  return value;
}

function asNumber(value: unknown, fieldName: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error(`invalid ${fieldName}`);
}

function asBoolean(value: unknown, fieldName: string) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 1 || value === '1' || value === 'true' || value === 't') {
    return true;
  }
  if (value === 0 || value === '0' || value === 'false' || value === 'f') {
    return false;
  }
  throw new Error(`invalid ${fieldName}`);
}

function toEpochMillis(value: unknown, fieldName: string) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return Math.round(numeric);
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new Error(`invalid ${fieldName}`);
}

function normalizeFsrsSnapshot(value: unknown) {
  if (typeof value === 'string') {
    const parsed = JSON.parse(value) as unknown;
    return JSON.stringify(parsed);
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }
  throw new Error('invalid fsrs_snapshot');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const keys = Object.keys(objectValue).sort();
    const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`);
    return `{${pairs.join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashRow(row: SnapshotRow) {
  return createHash('sha1').update(stableStringify(row), 'utf8').digest('hex');
}

function sortRowsByPrimaryKey(table: MigrationTable, rows: SnapshotRow[]) {
  const keyFields = PRIMARY_KEY_FIELDS[table];
  return [...rows].sort((left, right) => {
    for (const keyField of keyFields) {
      const leftValue = String(left[keyField] ?? '');
      const rightValue = String(right[keyField] ?? '');
      const compared = leftValue.localeCompare(rightValue);
      if (compared !== 0) {
        return compared;
      }
    }
    return stableStringify(left).localeCompare(stableStringify(right));
  });
}

function normalizeSnapshotRow(table: MigrationTable, row: SnapshotRow): SnapshotRow {
  switch (table) {
    case 'users':
      return {
        user_id: asString(row.user_id, 'user_id'),
        email: asString(row.email, 'email'),
        password_hash: asString(row.password_hash, 'password_hash'),
        nickname: asOptionalString(row.nickname),
        created_at: toEpochMillis(row.created_at, 'created_at')
      };
    case 'decks':
      return {
        deck_id: asString(row.deck_id, 'deck_id'),
        user_id: asString(row.user_id, 'user_id'),
        name: asString(row.name, 'name'),
        is_default: asBoolean(row.is_default, 'is_default'),
        new_count: Math.trunc(asNumber(row.new_count, 'new_count')),
        learning_count: Math.trunc(asNumber(row.learning_count, 'learning_count')),
        due_count: Math.trunc(asNumber(row.due_count, 'due_count')),
        created_at: toEpochMillis(row.created_at, 'created_at')
      };
    case 'cards':
      return {
        card_id: asString(row.card_id, 'card_id'),
        user_id: asString(row.user_id, 'user_id'),
        deck_id: asString(row.deck_id, 'deck_id'),
        front_text: asString(row.front_text, 'front_text'),
        back_text: asString(row.back_text, 'back_text'),
        source_lang: asString(row.source_lang, 'source_lang'),
        target_lang: asString(row.target_lang, 'target_lang'),
        due_at: toEpochMillis(row.due_at, 'due_at'),
        stability: asNumber(row.stability, 'stability'),
        difficulty: asNumber(row.difficulty, 'difficulty'),
        reps: Math.trunc(asNumber(row.reps, 'reps')),
        lapses: Math.trunc(asNumber(row.lapses, 'lapses')),
        created_at: toEpochMillis(row.created_at, 'created_at'),
        updated_at: toEpochMillis(row.updated_at, 'updated_at')
      };
    case 'review_sessions':
      return {
        session_id: asString(row.session_id, 'session_id'),
        user_id: asString(row.user_id, 'user_id'),
        deck_id: asString(row.deck_id, 'deck_id'),
        created_at: toEpochMillis(row.created_at, 'created_at')
      };
    case 'review_session_cards':
      return {
        session_id: asString(row.session_id, 'session_id'),
        card_id: asString(row.card_id, 'card_id'),
        ord: Math.trunc(asNumber(row.ord, 'ord'))
      };
    case 'review_logs':
      return {
        review_log_id: asString(row.review_log_id, 'review_log_id'),
        user_id: asString(row.user_id, 'user_id'),
        card_id: asString(row.card_id, 'card_id'),
        session_id: asString(row.session_id, 'session_id'),
        rating_source: asString(row.rating_source, 'rating_source'),
        final_rating: asString(row.final_rating, 'final_rating'),
        is_new_card: asBoolean(row.is_new_card, 'is_new_card'),
        rated_at: toEpochMillis(row.rated_at, 'rated_at'),
        fsrs_snapshot: normalizeFsrsSnapshot(row.fsrs_snapshot)
      };
    default:
      throw new Error(`unknown table: ${table}`);
  }
}

function normalizeD1Row(table: MigrationTable, row: SnapshotRow): SnapshotRow {
  switch (table) {
    case 'users':
      return {
        user_id: row.userId,
        email: row.email,
        password_hash: row.passwordHash,
        nickname: row.nickname ?? null,
        created_at: row.createdAt
      };
    case 'decks':
      return {
        deck_id: row.deckId,
        user_id: row.userId,
        name: row.name,
        is_default: Boolean(row.isDefault),
        new_count: row.newCount,
        learning_count: row.learningCount,
        due_count: row.dueCount,
        created_at: row.createdAt
      };
    case 'cards':
      return {
        card_id: row.cardId,
        user_id: row.userId,
        deck_id: row.deckId,
        front_text: row.frontText,
        back_text: row.backText,
        source_lang: row.sourceLang,
        target_lang: row.targetLang,
        due_at: row.dueAt,
        stability: row.stability,
        difficulty: row.difficulty,
        reps: row.reps,
        lapses: row.lapses,
        created_at: row.createdAt,
        updated_at: row.updatedAt
      };
    case 'review_sessions':
      return {
        session_id: row.sessionId,
        user_id: row.userId,
        deck_id: row.deckId,
        created_at: row.createdAt
      };
    case 'review_session_cards':
      return {
        session_id: row.sessionId,
        card_id: row.cardId,
        ord: row.ord
      };
    case 'review_logs':
      return {
        review_log_id: row.reviewLogId,
        user_id: row.userId,
        card_id: row.cardId,
        session_id: row.sessionId,
        rating_source: row.ratingSource,
        final_rating: row.finalRating,
        is_new_card: Boolean(row.isNewCard),
        rated_at: row.ratedAt,
        fsrs_snapshot: normalizeFsrsSnapshot(row.fsrsSnapshot)
      };
    default:
      throw new Error(`unknown table: ${table}`);
  }
}

export function parseMigrationSnapshot(raw: unknown): MigrationSnapshot {
  if (!raw || typeof raw !== 'object') {
    throw new Error('snapshot must be an object');
  }
  const snapshot = raw as Partial<MigrationSnapshot>;
  if (snapshot.source !== 'postgres') {
    throw new Error('snapshot.source must be postgres');
  }
  if (typeof snapshot.exported_at !== 'string' || snapshot.exported_at.trim().length === 0) {
    throw new Error('snapshot.exported_at is required');
  }
  if (!snapshot.tables || typeof snapshot.tables !== 'object') {
    throw new Error('snapshot.tables is required');
  }

  const tables = {} as MigrationSnapshot['tables'];
  for (const table of MIGRATION_TABLE_ORDER) {
    const tableRows = (snapshot.tables as Record<string, unknown>)[table];
    if (!Array.isArray(tableRows)) {
      throw new Error(`snapshot.tables.${table} must be an array`);
    }
    tables[table] = tableRows.map((row) => normalizeSnapshotRow(table, row as SnapshotRow));
  }

  return {
    source: 'postgres',
    exported_at: snapshot.exported_at,
    tables
  };
}

async function clearD1Data(db: MigrationDb) {
  for (const table of D1_DELETE_ORDER) {
    if (table === 'review_logs') {
      await db.delete(schema.reviewLogs);
      continue;
    }
    if (table === 'review_session_cards') {
      await db.delete(schema.reviewSessionCards);
      continue;
    }
    if (table === 'review_sessions') {
      await db.delete(schema.reviewSessions);
      continue;
    }
    if (table === 'cards') {
      await db.delete(schema.cards);
      continue;
    }
    if (table === 'decks') {
      await db.delete(schema.decks);
      continue;
    }
    await db.delete(schema.users);
  }
}

export async function importSnapshotToD1(db: MigrationDb, snapshot: MigrationSnapshot) {
  await clearD1Data(db);

  for (const row of snapshot.tables.users) {
    await db.insert(schema.users).values({
      userId: asString(row.user_id, 'user_id'),
      email: asString(row.email, 'email'),
      passwordHash: asString(row.password_hash, 'password_hash'),
      nickname: asOptionalString(row.nickname),
      createdAt: toEpochMillis(row.created_at, 'created_at')
    });
  }

  for (const row of snapshot.tables.decks) {
    await db.insert(schema.decks).values({
      deckId: asString(row.deck_id, 'deck_id'),
      userId: asString(row.user_id, 'user_id'),
      name: asString(row.name, 'name'),
      isDefault: asBoolean(row.is_default, 'is_default'),
      newCount: Math.trunc(asNumber(row.new_count, 'new_count')),
      learningCount: Math.trunc(asNumber(row.learning_count, 'learning_count')),
      dueCount: Math.trunc(asNumber(row.due_count, 'due_count')),
      createdAt: toEpochMillis(row.created_at, 'created_at')
    });
  }

  for (const row of snapshot.tables.cards) {
    await db.insert(schema.cards).values({
      cardId: asString(row.card_id, 'card_id'),
      userId: asString(row.user_id, 'user_id'),
      deckId: asString(row.deck_id, 'deck_id'),
      frontText: asString(row.front_text, 'front_text'),
      backText: asString(row.back_text, 'back_text'),
      sourceLang: asString(row.source_lang, 'source_lang'),
      targetLang: asString(row.target_lang, 'target_lang'),
      dueAt: toEpochMillis(row.due_at, 'due_at'),
      stability: asNumber(row.stability, 'stability'),
      difficulty: asNumber(row.difficulty, 'difficulty'),
      reps: Math.trunc(asNumber(row.reps, 'reps')),
      lapses: Math.trunc(asNumber(row.lapses, 'lapses')),
      createdAt: toEpochMillis(row.created_at, 'created_at'),
      updatedAt: toEpochMillis(row.updated_at, 'updated_at')
    });
  }

  for (const row of snapshot.tables.review_sessions) {
    await db.insert(schema.reviewSessions).values({
      sessionId: asString(row.session_id, 'session_id'),
      userId: asString(row.user_id, 'user_id'),
      deckId: asString(row.deck_id, 'deck_id'),
      createdAt: toEpochMillis(row.created_at, 'created_at')
    });
  }

  for (const row of snapshot.tables.review_session_cards) {
    await db.insert(schema.reviewSessionCards).values({
      sessionId: asString(row.session_id, 'session_id'),
      cardId: asString(row.card_id, 'card_id'),
      ord: Math.trunc(asNumber(row.ord, 'ord'))
    });
  }

  for (const row of snapshot.tables.review_logs) {
    await db.insert(schema.reviewLogs).values({
      reviewLogId: asString(row.review_log_id, 'review_log_id'),
      userId: asString(row.user_id, 'user_id'),
      cardId: asString(row.card_id, 'card_id'),
      sessionId: asString(row.session_id, 'session_id'),
      ratingSource: asString(row.rating_source, 'rating_source') as 'manual' | 'ai',
      finalRating: asString(row.final_rating, 'final_rating') as 'again' | 'hard' | 'good' | 'easy',
      isNewCard: asBoolean(row.is_new_card, 'is_new_card'),
      ratedAt: toEpochMillis(row.rated_at, 'rated_at'),
      fsrsSnapshot: normalizeFsrsSnapshot(row.fsrs_snapshot)
    });
  }
}

async function listTargetRows(db: MigrationDb, table: MigrationTable): Promise<SnapshotRow[]> {
  if (table === 'users') {
    return (await db.select().from(schema.users)).map((row) => normalizeD1Row(table, row));
  }
  if (table === 'decks') {
    return (await db.select().from(schema.decks)).map((row) => normalizeD1Row(table, row));
  }
  if (table === 'cards') {
    return (await db.select().from(schema.cards)).map((row) => normalizeD1Row(table, row));
  }
  if (table === 'review_sessions') {
    return (await db.select().from(schema.reviewSessions)).map((row) => normalizeD1Row(table, row));
  }
  if (table === 'review_session_cards') {
    return (await db.select().from(schema.reviewSessionCards)).map((row) => normalizeD1Row(table, row));
  }
  return (await db.select().from(schema.reviewLogs)).map((row) => normalizeD1Row(table, row));
}

export type TableVerificationResult = {
  table: MigrationTable;
  source_count: number;
  target_count: number;
  count_match: boolean;
  hash_match: boolean;
  source_sample_hashes: string[];
  target_sample_hashes: string[];
};

export type MigrationVerificationReport = {
  ok: boolean;
  generated_at: string;
  tables: TableVerificationResult[];
};

export async function verifySnapshotAgainstD1(
  db: MigrationDb,
  snapshot: MigrationSnapshot
): Promise<MigrationVerificationReport> {
  const tableResults: TableVerificationResult[] = [];

  for (const table of MIGRATION_TABLE_ORDER) {
    const sourceRows = sortRowsByPrimaryKey(table, snapshot.tables[table].map((row) => normalizeSnapshotRow(table, row)));
    const targetRows = sortRowsByPrimaryKey(table, await listTargetRows(db, table));

    const sourceHashes = sourceRows.map((row) => hashRow(row));
    const targetHashes = targetRows.map((row) => hashRow(row));
    const hashMatch = sourceHashes.length === targetHashes.length &&
      sourceHashes.every((hash, index) => hash === targetHashes[index]);

    tableResults.push({
      table,
      source_count: sourceRows.length,
      target_count: targetRows.length,
      count_match: sourceRows.length === targetRows.length,
      hash_match: hashMatch,
      source_sample_hashes: sourceHashes.slice(0, 3),
      target_sample_hashes: targetHashes.slice(0, 3)
    });
  }

  return {
    ok: tableResults.every((result) => result.count_match && result.hash_match),
    generated_at: new Date().toISOString(),
    tables: tableResults
  };
}
