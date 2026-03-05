import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('CORS 骨架', () => {
  it('预检请求返回显式 origin 且允许 credentials', async () => {
    const origin = 'http://localhost:5173';

    const res = await app.request(
      'http://local.test/health',
      {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET'
        }
      },
      {
        APP_CORS_ALLOW_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173'
      }
    );

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });
});
