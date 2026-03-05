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

function pickCookie(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? '';
}

async function createAuthFixture() {
  const dbPath = `/tmp/say-right-auth-${randomUUID()}.db`;
  const client = createClient({ url: `file:${dbPath}` });
  const db = drizzle(client, { schema });
  await client.execute('PRAGMA foreign_keys = ON');

  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });

  const auth = createBetterAuth(db, {
    baseURL: 'http://local.test',
    secret: 'test-secret-32-char-long-for-dev-only',
    trustedOrigins: ['http://localhost:5173']
  });

  const app = createApp({
    getAuth: () => auth
  });

  return {
    app,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('Better Auth 会话链路', () => {
  it('注册后可读会话，登出后会话失效', async () => {
    const fixture = await createAuthFixture();
    try {
      const origin = 'http://localhost:5173';
      const email = `user-${randomUUID()}@example.com`;
      const password = 'Password123!';

      const signUpResponse = await fixture.app.request(
        'http://local.test/api/auth/sign-up/email',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin
          },
          body: JSON.stringify({
            email,
            password,
            name: 'Tester'
          })
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );

      expect(signUpResponse.status).toBe(200);
      expect(signUpResponse.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(signUpResponse.headers.get('Access-Control-Allow-Credentials')).toBe('true');

      const setCookie = signUpResponse.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();

      const cookie = pickCookie(setCookie ?? '');
      const sessionResponse = await fixture.app.request(
        'http://local.test/api/auth/session',
        {
          method: 'GET',
          headers: {
            cookie,
            origin
          }
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );

      expect(sessionResponse.status).toBe(200);
      const sessionBody = await sessionResponse.json();
      expect(sessionBody?.user?.email).toBe(email);

      const protectedResponse = await fixture.app.request(
        'http://local.test/protected/ping',
        {
          method: 'GET',
          headers: {
            cookie,
            origin
          }
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );
      expect(protectedResponse.status).toBe(200);

      const signOutResponse = await fixture.app.request(
        'http://local.test/api/auth/sign-out',
        {
          method: 'POST',
          headers: {
            cookie,
            origin
          }
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );
      expect(signOutResponse.status).toBe(200);

      const sessionAfterSignOut = await fixture.app.request(
        'http://local.test/api/auth/session',
        {
          method: 'GET',
          headers: {
            cookie,
            origin
          }
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );
      expect(sessionAfterSignOut.status).toBe(401);
    } finally {
      await fixture.cleanup();
    }
  });

  it('未携带 cookie 访问受保护路由返回 401', async () => {
    const fixture = await createAuthFixture();
    try {
      const response = await fixture.app.request(
        'http://local.test/protected/ping',
        {
          method: 'GET',
          headers: {
            origin: 'http://localhost:5173'
          }
        },
        {
          APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173'
        }
      );

      expect(response.status).toBe(401);
    } finally {
      await fixture.cleanup();
    }
  });
});
