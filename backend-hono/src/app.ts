/**
 * Hono 应用主入口（不含 Cloudflare 平台绑定）。
 * WHAT: 定义健康检查、跨域骨架、Better Auth 路由与受保护路由。
 * WHY: 用同一入口同时服务运行时与测试环境，保证契约与行为一致。
 */
import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';
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
  };
};

type AppOptions = {
  getAuth?: (c: Context<AppEnv>) => AuthInstance;
};

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

export function createApp(options: AppOptions = {}) {
  const app = new Hono<AppEnv>();

  const resolveAuth = (c: Context<AppEnv>) => options.getAuth?.(c) ?? createRuntimeAuth(c);

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

  return app;
}

export const app = createApp();
