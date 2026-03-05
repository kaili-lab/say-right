import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __setRedirectToLoginForTest,
  SESSION_ACTIVE_STORAGE_KEY,
  clearSession,
  fetchWithAuth,
} from './pages/authApi';

describe('auth-refresh(session-mode)', () => {
  let redirectToLoginCount = 0;

  beforeEach(() => {
    clearSession();
    redirectToLoginCount = 0;
    __setRedirectToLoginForTest(() => {
      redirectToLoginCount += 1;
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearSession();
    __setRedirectToLoginForTest(null);
    vi.restoreAllMocks();
  });

  it('fetchWithAuth 应携带 credentials=include', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const response = await fetchWithAuth('http://127.0.0.1:8787/dashboard/home-summary', { method: 'GET' }, fetchMock);

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8787/dashboard/home-summary',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
  });

  it('401 时应清理会话并跳转登录（不再 refresh）', async () => {
    window.localStorage.setItem(SESSION_ACTIVE_STORAGE_KEY, '1');

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'unauthorized' }), { status: 401 }));

    const response = await fetchWithAuth('http://127.0.0.1:8787/decks', { method: 'GET' }, fetchMock);

    expect(response.status).toBe(401);
    expect(window.localStorage.getItem(SESSION_ACTIVE_STORAGE_KEY)).toBeNull();
    expect(redirectToLoginCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('登录/注册端点返回 401 不应触发登录跳转', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'invalid credentials' }), { status: 401 }));

    const response = await fetchWithAuth(
      'http://127.0.0.1:8787/api/auth/sign-in/email',
      {
        method: 'POST',
      },
      fetchMock,
    );

    expect(response.status).toBe(401);
    expect(redirectToLoginCount).toBe(0);
  });

  it('并发 401 仅触发一次跳转', async () => {
    window.localStorage.setItem(SESSION_ACTIVE_STORAGE_KEY, '1');

    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => {
      return Promise.resolve(new Response(JSON.stringify({ detail: 'unauthorized' }), { status: 401 }));
    });

    const [responseA, responseB] = await Promise.all([
      fetchWithAuth('http://127.0.0.1:8787/decks', { method: 'GET' }, fetchMock),
      fetchWithAuth('http://127.0.0.1:8787/review/decks', { method: 'GET' }, fetchMock),
    ]);

    expect(responseA.status).toBe(401);
    expect(responseB.status).toBe(401);
    expect(redirectToLoginCount).toBe(1);
  });
});
