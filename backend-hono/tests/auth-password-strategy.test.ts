import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createClient } from '@libsql/client';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createBetterAuth } from '../src/auth';
import * as schema from '../src/db/schema';

async function createFixture() {
  const dbPath = `/tmp/say-right-auth-password-${randomUUID()}.db`;
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

  return {
    auth,
    db,
    async cleanup() {
      client.close();
      await rm(dbPath, { force: true });
    }
  };
}

describe('Better Auth 密码策略', () => {
  it('注册后应持久化 Workers 友好密码格式', async () => {
    const fixture = await createFixture();
    try {
      const email = `user-${randomUUID()}@example.com`;
      const password = 'Password123!';

      await fixture.auth.api.signUpEmail({
        body: {
          email,
          password,
          name: 'Tester'
        }
      });

      const [credentialAccount] = await fixture.db
        .select({ password: schema.authAccounts.password })
        .from(schema.authAccounts)
        .where(eq(schema.authAccounts.provider_id, 'credential'));

      expect(credentialAccount?.password).toMatch(/^pbkdf2_sha256\$/);
    } finally {
      await fixture.cleanup();
    }
  });
});
