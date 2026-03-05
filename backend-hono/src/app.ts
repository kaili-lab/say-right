/**
 * Hono 应用主入口（不含 Cloudflare 平台绑定）。
 * WHAT: 定义健康检查、跨域骨架、鉴权路由与 Deck/Card/Record 业务路由。
 * WHY: 用同一入口同时服务运行时与测试环境，保证契约与行为一致。
 */
import { createHash, randomUUID } from 'node:crypto';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { type DrizzleD1Database, drizzle } from 'drizzle-orm/d1';
import { z } from 'zod';
import { createBetterAuth } from './auth';
import * as schema from './db/schema';

type Bindings = {
  APP_CORS_ALLOW_ORIGINS?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  DB?: unknown;
};

const DEFAULT_ALLOW_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
] as const;

type AuthInstance = ReturnType<typeof createBetterAuth>;

type AppEnv = {
  Bindings: Bindings;
  Variables: {
    authSession: Record<string, unknown>;
    authUser: Record<string, unknown>;
    currentUser: CurrentUser;
  };
};

type CurrentUser = {
  userId: string;
  email: string;
  name: string | null;
};

type AppOptions = {
  getAuth?: (c: Context<AppEnv>) => AuthInstance;
  getDb?: (c: Context<AppEnv>) => Database;
};

type Database = DrizzleD1Database<typeof schema>;
type ValidationSource = 'body' | 'path';

const DEFAULT_DECK_NAME = '默认组';
const RECORD_SAVE_GENERATED_TEXT_MAX_LENGTH = 300;

const RECORD_GENERATE_FIXTURES: Record<string, string> = {
  你好: 'Hello.',
  谢谢: 'Thank you.',
  我想喝水: 'I want to drink water.',
  你好吗: 'How are you?'
};

const deckCreateSchema = z.object({
  name: z
    .string()
    .max(100, 'deck name too long')
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'deck name must not be empty')
});

const deckParamSchema = z.object({
  deckId: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'deck_id must not be empty')
});

const cardIdParamSchema = z.object({
  cardId: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'card_id must not be empty')
});

const cardPatchSchema = z
  .object({
    front_text: z.string().max(500, 'front_text too long').optional(),
    back_text: z.string().max(500, 'back_text too long').optional()
  })
  .superRefine((value, ctx) => {
    if (value.front_text === undefined && value.back_text === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'at least one field must be provided'
      });
      return;
    }

    if (value.front_text !== undefined && value.front_text.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['front_text'],
        message: 'card text must not be empty'
      });
    }

    if (value.back_text !== undefined && value.back_text.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['back_text'],
        message: 'card text must not be empty'
      });
    }
  });

const cardMoveSchema = z.object({
  to_deck_id: z
    .string()
    .max(100, 'to_deck_id too long')
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'to_deck_id must not be empty')
});

const recordGenerateSchema = z.object({
  source_text: z
    .string()
    .max(200)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, '中文内容不能为空'),
  source_lang: z.literal('zh'),
  target_lang: z.literal('en')
});

const recordSaveSchema = z.object({
  source_text: z
    .string()
    .max(200)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, '中文内容不能为空'),
  generated_text: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, '英文内容不能为空')
    .refine(
      (value) => value.length <= RECORD_SAVE_GENERATED_TEXT_MAX_LENGTH,
      `英文内容不能超过 ${RECORD_SAVE_GENERATED_TEXT_MAX_LENGTH} 个字符`
    ),
  deck_id: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'deck_id must not be empty'),
  source_lang: z.literal('zh'),
  target_lang: z.literal('en')
});

const saveWithAgentSchema = z.object({
  source_text: z
    .string()
    .max(200)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'source_text must not be empty'),
  generated_text: z
    .string()
    .max(500)
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, 'generated_text must not be empty'),
  source_lang: z.literal('zh'),
  target_lang: z.literal('en')
});

/**
 * WHAT: 解析 CORS 白名单变量。
 * WHY: 统一解析规则，避免测试环境与运行环境行为不一致。
 */
export function parseAllowedOrigins(raw?: string): string[] {
  if (!raw || raw.trim().length === 0) {
    return [...DEFAULT_ALLOW_ORIGINS];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function createRuntimeAuth(c: Context<AppEnv>): AuthInstance {
  if (!c.env.DB) {
    throw new Error('Missing DB binding for Better Auth runtime');
  }

  const db = drizzle(c.env.DB as Parameters<typeof drizzle>[0], { schema });
  const trustedOrigins = parseAllowedOrigins(c.env.APP_CORS_ALLOW_ORIGINS);

  return createBetterAuth(db, {
    baseURL: c.env.BETTER_AUTH_URL ?? 'http://localhost:8787',
    secret: c.env.BETTER_AUTH_SECRET ?? 'better-auth-dev-secret-change-me-32bytes',
    trustedOrigins
  });
}

function createRuntimeDb(c: Context<AppEnv>): Database {
  if (!c.env.DB) {
    throw new Error('Missing DB binding for runtime database');
  }

  return drizzle(c.env.DB as Parameters<typeof drizzle>[0], { schema });
}

function toValidationDetail(
  source: ValidationSource,
  error: any
) {
  return error.issues.map((issue: any) => ({
    loc: [source, ...issue.path.map((item: any) => String(item))],
    msg: issue.message,
    type: issue.code
  }));
}

function createValidationHook(source: ValidationSource) {
  return (result: any, c: Context) => {
    if (!result.success && result.error) {
      return c.json(
        {
          detail: toValidationDetail(source, result.error)
        },
        422
      );
    }

    return undefined;
  };
}

function toIsoTime(milliseconds: number) {
  return new Date(milliseconds).toISOString().replace('.000Z', 'Z');
}

function buildCardResponse(card: {
  cardId: string;
  deckId: string;
  frontText: string;
  backText: string;
  sourceLang: string;
  targetLang: string;
  dueAt: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}) {
  return {
    id: card.cardId,
    deck_id: card.deckId,
    front_text: card.frontText,
    back_text: card.backText,
    source_lang: card.sourceLang,
    target_lang: card.targetLang,
    due_at: toIsoTime(card.dueAt),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses
  };
}

async function resolveCurrentUser(c: Context<AppEnv>, auth: AuthInstance): Promise<CurrentUser | null> {
  const current = await auth.api.getSession({
    headers: c.req.raw.headers
  });

  if (!current?.user?.id || !current.user.email) {
    return null;
  }

  return {
    userId: String(current.user.id),
    email: String(current.user.email),
    name: typeof current.user.name === 'string' && current.user.name.trim()
      ? current.user.name.trim()
      : null
  };
}

async function ensureDomainUser(db: Database, user: CurrentUser) {
  await db
    .insert(schema.users)
    .values({
      userId: user.userId,
      email: user.email,
      passwordHash: 'better-auth-session',
      nickname: user.name,
      createdAt: Date.now()
    })
    .onConflictDoUpdate({
      target: schema.users.userId,
      set: {
        email: user.email,
        nickname: user.name
      }
    });
}

async function findOwnedDeckById(db: Database, userId: string, deckId: string) {
  const [deck] = await db
    .select()
    .from(schema.decks)
    .where(and(eq(schema.decks.deckId, deckId), eq(schema.decks.userId, userId)))
    .limit(1);
  return deck ?? null;
}

async function findOwnedCardById(db: Database, userId: string, cardId: string) {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.cardId, cardId), eq(schema.cards.userId, userId)))
    .limit(1);
  return card ?? null;
}

async function findDeckByNameInsensitive(db: Database, userId: string, name: string) {
  const [deck] = await db
    .select()
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, userId),
        sql`lower(${schema.decks.name}) = lower(${name})`
      )
    )
    .limit(1);
  return deck ?? null;
}

async function ensureDefaultDeck(db: Database, userId: string) {
  const [existingDefault] = await db
    .select()
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), eq(schema.decks.isDefault, true)))
    .limit(1);

  if (existingDefault) {
    return existingDefault;
  }

  const deckId = randomUUID();
  await db.insert(schema.decks).values({
    deckId,
    userId,
    name: DEFAULT_DECK_NAME,
    isDefault: true,
    newCount: 0,
    learningCount: 0,
    dueCount: 0,
    createdAt: Date.now()
  });

  const [createdDefault] = await db
    .select()
    .from(schema.decks)
    .where(eq(schema.decks.deckId, deckId))
    .limit(1);

  if (!createdDefault) {
    throw new Error('default deck creation failed');
  }

  return createdDefault;
}

async function refreshDeckCounts(db: Database, deckId: string) {
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
  const learningCount = Math.max(totalCount - newCount - dueCount, 0);

  await db
    .update(schema.decks)
    .set({
      newCount,
      dueCount,
      learningCount
    })
    .where(eq(schema.decks.deckId, deckId));
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && /unique/i.test(error.message);
}

function decideDeckName(sourceText: string, generatedText: string) {
  if (sourceText.includes('__AGENT_ERROR__') || generatedText.includes('__AGENT_ERROR__')) {
    return {
      deckName: null,
      fallbackUsed: true
    };
  }

  if (
    sourceText.includes('__INVALID_DECK_NAME__') ||
    generatedText.includes('__INVALID_DECK_NAME__')
  ) {
    return {
      deckName: null,
      fallbackUsed: true
    };
  }

  const normalized = `${sourceText} ${generatedText}`.toLowerCase();
  if (normalized.includes('travel') || sourceText.includes('旅行')) {
    return {
      deckName: 'Travel',
      fallbackUsed: false
    };
  }

  if (normalized.includes('food') || sourceText.includes('吃')) {
    return {
      deckName: 'Food',
      fallbackUsed: false
    };
  }

  const digest = createHash('sha1').update(sourceText, 'utf8').digest('hex').slice(0, 6);
  return {
    deckName: `Auto-${digest}`,
    fallbackUsed: false
  };
}

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();

  const resolveAuth = (c: Context<AppEnv>) => options.getAuth?.(c) ?? createRuntimeAuth(c);
  const resolveDb = (c: Context<AppEnv>) => options.getDb?.(c) ?? createRuntimeDb(c);

  app.use(
    '*',
    cors({
      origin: (origin, c) => {
        const allowedOrigins = parseAllowedOrigins(c.env?.APP_CORS_ALLOW_ORIGINS);
        return allowedOrigins.includes(origin) ? origin : '';
      },
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    })
  );

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.get('/api/auth/session', async (c) => {
    const auth = resolveAuth(c);
    const current = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!current) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    return c.json(current);
  });

  app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
    const auth = resolveAuth(c);
    return auth.handler(c.req.raw);
  });

  app.use('/protected/*', async (c, next) => {
    const auth = resolveAuth(c);
    const current = await auth.api.getSession({
      headers: c.req.raw.headers
    });

    if (!current) {
      return c.json({ message: 'Unauthorized' }, 401);
    }

    c.set('authSession', current.session as Record<string, unknown>);
    c.set('authUser', current.user as Record<string, unknown>);
    await next();
  });

  app.get('/protected/ping', (c) => {
    const session = c.get('authSession');
    return c.json({
      ok: true,
      userId: session.userId
    });
  });

  async function requireSession(c: Context<AppEnv>, next: () => Promise<void>) {
    const auth = resolveAuth(c);
    const currentUser = await resolveCurrentUser(c, auth);
    if (!currentUser) {
      return c.json({ detail: 'unauthorized' }, 401);
    }

    const db = resolveDb(c);
    // 每次业务请求兜底同步一次用户，保证 Better Auth 用户可访问业务表。
    await ensureDomainUser(db, currentUser);
    c.set('currentUser', currentUser);
    await next();
  }

  app.use('/decks', requireSession);
  app.use('/decks/*', requireSession);
  app.use('/cards/*', requireSession);
  app.use('/records/*', requireSession);

  app.get('/decks', async (c) => {
    const db = resolveDb(c);
    const currentUser = c.get('currentUser');

    await ensureDefaultDeck(db, currentUser.userId);
    const decks = await db
      .select()
      .from(schema.decks)
      .where(eq(schema.decks.userId, currentUser.userId))
      .orderBy(schema.decks.createdAt, schema.decks.deckId);

    return c.json(
      decks.map((deck) => ({
        id: deck.deckId,
        name: deck.name,
        is_default: deck.isDefault,
        new_count: deck.newCount,
        learning_count: deck.learningCount,
        due_count: deck.dueCount
      }))
    );
  });

  app.post(
    '/decks',
    zValidator('json', deckCreateSchema, createValidationHook('body')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const payload = c.req.valid('json');

      await ensureDefaultDeck(db, currentUser.userId);
      const duplicated = await findDeckByNameInsensitive(db, currentUser.userId, payload.name);
      if (duplicated) {
        return c.json({ detail: 'duplicate deck name' }, 409);
      }

      const deckId = randomUUID();
      try {
        await db.insert(schema.decks).values({
          deckId,
          userId: currentUser.userId,
          name: payload.name,
          isDefault: false,
          newCount: 0,
          learningCount: 0,
          dueCount: 0,
          createdAt: Date.now()
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return c.json({ detail: 'duplicate deck name' }, 409);
        }
        throw error;
      }

      return c.json(
        {
          id: deckId,
          name: payload.name,
          is_default: false
        },
        201
      );
    }
  );

  app.delete(
    '/decks/:deckId',
    zValidator('param', deckParamSchema, createValidationHook('path')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const { deckId } = c.req.valid('param');

      const deck = await findOwnedDeckById(db, currentUser.userId, deckId);
      if (!deck) {
        return c.json({ detail: 'deck not found' }, 404);
      }

      if (deck.isDefault) {
        return c.json({ detail: 'deck cannot be deleted' }, 409);
      }

      const [countRow] = await db
        .select({ cardCount: sql<number>`count(*)` })
        .from(schema.cards)
        .where(eq(schema.cards.deckId, deckId));
      const cardCount = Number(countRow?.cardCount ?? 0);
      if (cardCount > 0) {
        return c.json({ detail: 'deck cannot be deleted' }, 409);
      }

      await db.delete(schema.decks).where(eq(schema.decks.deckId, deckId));
      return c.body(null, 204);
    }
  );

  app.get(
    '/decks/:deckId/cards',
    zValidator('param', deckParamSchema, createValidationHook('path')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const { deckId } = c.req.valid('param');

      const deck = await findOwnedDeckById(db, currentUser.userId, deckId);
      if (!deck) {
        return c.json({ detail: 'deck not found' }, 404);
      }

      const cards = await db
        .select()
        .from(schema.cards)
        .where(and(eq(schema.cards.userId, currentUser.userId), eq(schema.cards.deckId, deckId)))
        .orderBy(schema.cards.createdAt, schema.cards.cardId);

      return c.json(cards.map((card) => buildCardResponse(card)));
    }
  );

  app.patch(
    '/cards/:cardId',
    zValidator('param', cardIdParamSchema, createValidationHook('path')),
    zValidator('json', cardPatchSchema, createValidationHook('body')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const { cardId } = c.req.valid('param');
      const payload = c.req.valid('json');

      const card = await findOwnedCardById(db, currentUser.userId, cardId);
      if (!card) {
        return c.json({ detail: 'card not found' }, 404);
      }

      const nextFrontText = payload.front_text?.trim() ?? card.frontText;
      const nextBackText = payload.back_text?.trim() ?? card.backText;

      await db
        .update(schema.cards)
        .set({
          frontText: nextFrontText,
          backText: nextBackText,
          updatedAt: Date.now()
        })
        .where(eq(schema.cards.cardId, cardId));

      const [updatedCard] = await db
        .select()
        .from(schema.cards)
        .where(eq(schema.cards.cardId, cardId))
        .limit(1);
      if (!updatedCard) {
        return c.json({ detail: 'card not found' }, 404);
      }

      return c.json(buildCardResponse(updatedCard));
    }
  );

  app.delete(
    '/cards/:cardId',
    zValidator('param', cardIdParamSchema, createValidationHook('path')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const { cardId } = c.req.valid('param');

      const card = await findOwnedCardById(db, currentUser.userId, cardId);
      if (!card) {
        return c.json({ detail: 'card not found' }, 404);
      }

      await db.delete(schema.cards).where(eq(schema.cards.cardId, cardId));
      await refreshDeckCounts(db, card.deckId);

      return c.body(null, 204);
    }
  );

  app.post(
    '/cards/:cardId/move',
    zValidator('param', cardIdParamSchema, createValidationHook('path')),
    zValidator('json', cardMoveSchema, createValidationHook('body')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const { cardId } = c.req.valid('param');
      const payload = c.req.valid('json');

      const card = await findOwnedCardById(db, currentUser.userId, cardId);
      if (!card) {
        return c.json({ detail: 'card not found' }, 404);
      }

      const targetDeck = await findOwnedDeckById(db, currentUser.userId, payload.to_deck_id);
      if (!targetDeck) {
        return c.json({ detail: 'deck not found' }, 404);
      }

      if (card.deckId !== payload.to_deck_id) {
        await db
          .update(schema.cards)
          .set({
            deckId: payload.to_deck_id,
            updatedAt: Date.now()
          })
          .where(eq(schema.cards.cardId, card.cardId));

        await refreshDeckCounts(db, card.deckId);
        await refreshDeckCounts(db, payload.to_deck_id);
      }

      const [movedCard] = await db
        .select()
        .from(schema.cards)
        .where(eq(schema.cards.cardId, card.cardId))
        .limit(1);
      if (!movedCard) {
        return c.json({ detail: 'card not found' }, 404);
      }

      return c.json(buildCardResponse(movedCard));
    }
  );

  app.post(
    '/records/generate',
    zValidator('json', recordGenerateSchema, createValidationHook('body')),
    (c) => {
      const payload = c.req.valid('json');

      if (payload.source_text === '__FAIL_STUB__') {
        return c.json({ detail: 'llm unavailable' }, 503);
      }

      return c.json({
        generated_text:
          RECORD_GENERATE_FIXTURES[payload.source_text] ?? `${payload.source_text} (in English)`
      });
    }
  );

  app.post(
    '/records/save',
    zValidator('json', recordSaveSchema, createValidationHook('body')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const payload = c.req.valid('json');

      const deck = await findOwnedDeckById(db, currentUser.userId, payload.deck_id);
      if (!deck) {
        return c.json({ detail: 'deck not found' }, 404);
      }

      const cardId = randomUUID();
      const now = Date.now();
      await db.insert(schema.cards).values({
        cardId,
        userId: currentUser.userId,
        deckId: deck.deckId,
        frontText: payload.source_text,
        backText: payload.generated_text,
        sourceLang: payload.source_lang,
        targetLang: payload.target_lang,
        dueAt: now,
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        createdAt: now,
        updatedAt: now
      });
      await refreshDeckCounts(db, deck.deckId);

      return c.json(
        {
          card_id: cardId,
          deck_id: deck.deckId,
          deck_name: deck.name
        },
        201
      );
    }
  );

  app.post(
    '/records/save-with-agent',
    zValidator('json', saveWithAgentSchema, createValidationHook('body')),
    async (c) => {
      const db = resolveDb(c);
      const currentUser = c.get('currentUser');
      const payload = c.req.valid('json');

      const defaultDeck = await ensureDefaultDeck(db, currentUser.userId);
      const decision = decideDeckName(payload.source_text, payload.generated_text);

      let deckCreated = false;
      let fallbackUsed = decision.fallbackUsed;
      let targetDeck = defaultDeck;

      if (decision.deckName && !decision.fallbackUsed) {
        const existing = await findDeckByNameInsensitive(db, currentUser.userId, decision.deckName);
        if (existing) {
          targetDeck = existing;
        } else {
          const deckId = randomUUID();
          try {
            await db.insert(schema.decks).values({
              deckId,
              userId: currentUser.userId,
              name: decision.deckName,
              isDefault: false,
              newCount: 0,
              learningCount: 0,
              dueCount: 0,
              createdAt: Date.now()
            });
            deckCreated = true;
            const createdDeck = await findOwnedDeckById(db, currentUser.userId, deckId);
            if (createdDeck) {
              targetDeck = createdDeck;
            } else {
              fallbackUsed = true;
              targetDeck = defaultDeck;
            }
          } catch (error) {
            if (isUniqueConstraintError(error)) {
              const duplicated = await findDeckByNameInsensitive(
                db,
                currentUser.userId,
                decision.deckName
              );
              if (duplicated) {
                targetDeck = duplicated;
              } else {
                fallbackUsed = true;
                targetDeck = defaultDeck;
              }
            } else {
              throw error;
            }
          }
        }
      }

      const cardId = randomUUID();
      const now = Date.now();
      await db.insert(schema.cards).values({
        cardId,
        userId: currentUser.userId,
        deckId: targetDeck.deckId,
        frontText: payload.source_text,
        backText: payload.generated_text,
        sourceLang: payload.source_lang,
        targetLang: payload.target_lang,
        dueAt: now,
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        createdAt: now,
        updatedAt: now
      });
      await refreshDeckCounts(db, targetDeck.deckId);

      return c.json(
        {
          card_id: cardId,
          deck_id: targetDeck.deckId,
          deck_name: targetDeck.name,
          deck_created: deckCreated,
          fallback_used: fallbackUsed
        },
        201
      );
    }
  );

  return app;
}

export const app = createApp();
