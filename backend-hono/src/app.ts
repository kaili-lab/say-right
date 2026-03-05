/**
 * Hono 应用主入口（不含 Cloudflare 平台绑定）。
 * WHAT: 定义路由与跨域骨架。
 * WHY: 让业务逻辑可在 Vitest 中直接调用，减少对运行时的耦合。
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  APP_CORS_ALLOW_ORIGINS?: string;
};

const DEFAULT_ALLOW_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173'
] as const;

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

export const app = new Hono<{ Bindings: Bindings }>();

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
