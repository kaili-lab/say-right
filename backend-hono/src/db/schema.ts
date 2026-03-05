/**
 * D1/SQLite 领域模型 schema。
 * WHAT: 定义 users/decks/cards/review_sessions/review_session_cards/review_logs 六张核心表。
 * WHY: 让后续 Hono API 平移在类型层与迁移层共享同一事实来源。
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  nickname: text('nickname'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`)
});

export const decks = sqliteTable(
  'decks',
  {
    deckId: text('deck_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
    newCount: integer('new_count').notNull().default(0),
    learningCount: integer('learning_count').notNull().default(0),
    dueCount: integer('due_count').notNull().default(0),
    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => ({
    // 使用复合唯一约束兜底同用户下的同名组，后续可按需要增强为 NOCASE 索引。
    uqDecksUserName: uniqueIndex('uq_decks_user_name').on(table.userId, table.name),
    ckDeckNewCountNonNegative: check('ck_decks_new_count_non_negative', sql`${table.newCount} >= 0`),
    ckDeckLearningCountNonNegative: check(
      'ck_decks_learning_count_non_negative',
      sql`${table.learningCount} >= 0`
    ),
    ckDeckDueCountNonNegative: check('ck_decks_due_count_non_negative', sql`${table.dueCount} >= 0`)
  })
);

export const cards = sqliteTable(
  'cards',
  {
    cardId: text('card_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.deckId, { onDelete: 'cascade' }),
    frontText: text('front_text').notNull(),
    backText: text('back_text').notNull(),
    sourceLang: text('source_lang').notNull(),
    targetLang: text('target_lang').notNull(),
    dueAt: integer('due_at').notNull(),
    stability: real('stability').notNull().default(0),
    difficulty: real('difficulty').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => ({
    idxCardsUserDeck: index('idx_cards_user_deck').on(table.userId, table.deckId),
    idxCardsDueAt: index('idx_cards_due_at').on(table.dueAt),
    ckCardsRepsNonNegative: check('ck_cards_reps_non_negative', sql`${table.reps} >= 0`),
    ckCardsLapsesNonNegative: check('ck_cards_lapses_non_negative', sql`${table.lapses} >= 0`)
  })
);

export const reviewSessions = sqliteTable(
  'review_sessions',
  {
    sessionId: text('session_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    deckId: text('deck_id')
      .notNull()
      .references(() => decks.deckId, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`)
  },
  (table) => ({
    idxReviewSessionsUserCreated: index('idx_review_sessions_user_created').on(
      table.userId,
      table.createdAt
    )
  })
);

export const reviewSessionCards = sqliteTable(
  'review_session_cards',
  {
    sessionId: text('session_id')
      .notNull()
      .references(() => reviewSessions.sessionId, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.cardId, { onDelete: 'cascade' }),
    ord: integer('ord').notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.sessionId, table.cardId] }),
    idxReviewSessionCardsSessionOrd: index('idx_review_session_cards_session_ord').on(
      table.sessionId,
      table.ord
    ),
    ckReviewSessionCardsOrdNonNegative: check(
      'ck_review_session_cards_ord_non_negative',
      sql`${table.ord} >= 0`
    )
  })
);

export const reviewLogs = sqliteTable(
  'review_logs',
  {
    reviewLogId: text('review_log_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.cardId, { onDelete: 'cascade' }),
    sessionId: text('session_id')
      .notNull()
      .references(() => reviewSessions.sessionId, { onDelete: 'cascade' }),
    ratingSource: text('rating_source').notNull(),
    finalRating: text('final_rating').notNull(),
    isNewCard: integer('is_new_card', { mode: 'boolean' }).notNull().default(false),
    ratedAt: integer('rated_at').notNull().default(sql`(unixepoch() * 1000)`),
    fsrsSnapshot: text('fsrs_snapshot').notNull()
  },
  (table) => ({
    idxReviewLogsUserRatedAt: index('idx_review_logs_user_rated_at').on(table.userId, table.ratedAt),
    idxReviewLogsSessionRatedAt: index('idx_review_logs_session_rated_at').on(
      table.sessionId,
      table.ratedAt
    ),
    idxReviewLogsCardRatedAt: index('idx_review_logs_card_rated_at').on(table.cardId, table.ratedAt),
    idxReviewLogsUserCardRatedAt: index('idx_review_logs_user_card_rated_at').on(
      table.userId,
      table.cardId,
      table.ratedAt
    ),
    ckReviewLogsRatingSource: check(
      'ck_review_logs_rating_source',
      sql`${table.ratingSource} in ('manual', 'ai')`
    ),
    ckReviewLogsFinalRating: check(
      'ck_review_logs_final_rating',
      sql`${table.finalRating} in ('again', 'hard', 'good', 'easy')`
    )
  })
);
