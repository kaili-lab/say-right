import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('GET /health', () => {
  it('返回 200 和契约体', async () => {
    const res = await app.request('http://local.test/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});
