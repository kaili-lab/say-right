/**
 * Better Auth 初始化封装。
 * WHAT: 统一创建 auth 实例并绑定 Drizzle adapter。
 * WHY: 让 Hono 路由与测试都复用同一套鉴权配置。
 */
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth';
import { createWorkerFriendlyPasswordStrategy } from './auth-password';
import * as schema from './db/schema';

type BetterAuthDatabase = Parameters<typeof drizzleAdapter>[0];

type BetterAuthRuntimeConfig = {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
};

export function createBetterAuth(database: BetterAuthDatabase, config: BetterAuthRuntimeConfig) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: 'sqlite',
      schema: {
        ...schema,
        user: schema.authUsers,
        session: schema.authSessions,
        account: schema.authAccounts,
        verification: schema.authVerifications,
        auth_users: schema.authUsers,
        auth_sessions: schema.authSessions,
        auth_accounts: schema.authAccounts,
        auth_verifications: schema.authVerifications
      }
    }),
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      password: createWorkerFriendlyPasswordStrategy(config.secret)
    },
    user: {
      modelName: 'auth_users',
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    },
    session: {
      modelName: 'auth_sessions',
      fields: {
        userId: 'user_id',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    },
    account: {
      modelName: 'auth_accounts',
      fields: {
        userId: 'user_id',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    },
    verification: {
      modelName: 'auth_verifications',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at'
      }
    }
  });
}
