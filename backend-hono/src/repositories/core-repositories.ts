/**
 * 核心仓储基线实现。
 * WHAT: 提供用户/卡组/卡片/复习会话/复习日志的最小写入能力。
 * WHY: 为后续 API 平移提供可测试、可复用的数据访问层。
 */
import { asc, eq } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '../db/schema';

type Database = LibSQLDatabase<typeof schema>;

type CreateUserInput = {
  userId: string;
  email: string;
  passwordHash: string;
  nickname: string | null;
};

type CreateDeckInput = {
  deckId: string;
  userId: string;
  name: string;
  isDefault: boolean;
};

type CreateCardInput = {
  cardId: string;
  userId: string;
  deckId: string;
  frontText: string;
  backText: string;
  sourceLang: string;
  targetLang: string;
  dueAt: number;
};

type CreateReviewSessionInput = {
  sessionId: string;
  userId: string;
  deckId: string;
  cardIds: string[];
};

type AddReviewSessionCardInput = {
  sessionId: string;
  cardId: string;
  ord: number;
};

type CreateReviewLogInput = {
  reviewLogId: string;
  userId: string;
  cardId: string;
  sessionId: string;
  ratingSource: 'manual' | 'ai';
  finalRating: 'again' | 'hard' | 'good' | 'easy';
  isNewCard: boolean;
  fsrsSnapshot: string;
};

export class StudyRepository {
  constructor(private readonly db: Database) {}

  async createUser(input: CreateUserInput): Promise<void> {
    await this.db.insert(schema.users).values({
      userId: input.userId,
      email: input.email,
      passwordHash: input.passwordHash,
      nickname: input.nickname,
      createdAt: Date.now()
    });
  }

  async createDeck(input: CreateDeckInput): Promise<void> {
    await this.db.insert(schema.decks).values({
      deckId: input.deckId,
      userId: input.userId,
      name: input.name,
      isDefault: input.isDefault,
      newCount: 0,
      learningCount: 0,
      dueCount: 0,
      createdAt: Date.now()
    });
  }

  async createCard(input: CreateCardInput): Promise<void> {
    await this.db.insert(schema.cards).values({
      cardId: input.cardId,
      userId: input.userId,
      deckId: input.deckId,
      frontText: input.frontText,
      backText: input.backText,
      sourceLang: input.sourceLang,
      targetLang: input.targetLang,
      dueAt: input.dueAt,
      stability: 0,
      difficulty: 0,
      reps: 0,
      lapses: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  async createReviewSessionWithCards(input: CreateReviewSessionInput): Promise<void> {
    await this.db.insert(schema.reviewSessions).values({
      sessionId: input.sessionId,
      userId: input.userId,
      deckId: input.deckId,
      createdAt: Date.now()
    });

    for (let index = 0; index < input.cardIds.length; index += 1) {
      await this.addReviewSessionCard({
        sessionId: input.sessionId,
        cardId: input.cardIds[index]!,
        ord: index
      });
    }
  }

  async addReviewSessionCard(input: AddReviewSessionCardInput): Promise<void> {
    await this.db.insert(schema.reviewSessionCards).values({
      sessionId: input.sessionId,
      cardId: input.cardId,
      ord: input.ord
    });
  }

  async createReviewLog(input: CreateReviewLogInput): Promise<void> {
    await this.db.insert(schema.reviewLogs).values({
      reviewLogId: input.reviewLogId,
      userId: input.userId,
      cardId: input.cardId,
      sessionId: input.sessionId,
      ratingSource: input.ratingSource,
      finalRating: input.finalRating,
      isNewCard: input.isNewCard,
      ratedAt: Date.now(),
      fsrsSnapshot: input.fsrsSnapshot
    });
  }

  async deleteReviewSession(sessionId: string): Promise<void> {
    await this.db.delete(schema.reviewSessions).where(eq(schema.reviewSessions.sessionId, sessionId));
  }

  async listSessionCards(sessionId: string): Promise<string[]> {
    const rows = await this.db
      .select({ cardId: schema.reviewSessionCards.cardId })
      .from(schema.reviewSessionCards)
      .where(eq(schema.reviewSessionCards.sessionId, sessionId))
      .orderBy(asc(schema.reviewSessionCards.ord));

    return rows.map((row) => row.cardId);
  }
}
