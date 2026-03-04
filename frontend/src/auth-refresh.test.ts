import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __setRedirectToLoginForTest,
  ACCESS_TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  clearSession,
  fetchWithAuth,
} from "./pages/authApi";

describe("auth-refresh", () => {
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

  it("401 后应自动刷新 access token 并重试原请求", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-old");
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");

    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const auth = new Headers(init?.headers).get("Authorization");

      if (url.endsWith("/dashboard/home-summary")) {
        if (auth === "Bearer access-old") {
          return Promise.resolve(new Response(JSON.stringify({ detail: "invalid access token" }), { status: 401 }));
        }

        if (auth === "Bearer access-new") {
          return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        }
      }

      if (url.endsWith("/auth/refresh")) {
        expect(auth).toBe("Bearer refresh-1");
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "access-new", token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected" }), { status: 500 }));
    });

    const response = await fetchWithAuth("http://127.0.0.1:8000/dashboard/home-summary", { method: "GET" }, fetchMock);

    expect(response.status).toBe(200);
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe("access-new");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("refresh 返回 401 时应清理会话并跳转登录", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-old");
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-expired");

    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(new Response(JSON.stringify({ detail: "invalid refresh token" }), { status: 401 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ detail: "invalid access token" }), { status: 401 }));
    });

    await expect(fetchWithAuth("http://127.0.0.1:8000/decks", { method: "GET" }, fetchMock)).rejects.toThrow();

    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)).toBeNull();
    expect(redirectToLoginCount).toBe(1);
  });

  it("无 refresh token 时应直接清理会话并跳转登录", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-old");

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "invalid access token" }), { status: 401 }));

    await expect(fetchWithAuth("http://127.0.0.1:8000/review/decks", { method: "GET" }, fetchMock)).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(redirectToLoginCount).toBe(1);
  });

  it("并发 401 仅触发一次 refresh", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "access-old");
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, "refresh-1");

    let refreshCallCount = 0;
    const first401ByUrl = new Set<string>();

    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = typeof input === "string" ? input : input.url;
      const auth = new Headers(init?.headers).get("Authorization");

      if (url.endsWith("/auth/refresh")) {
        refreshCallCount += 1;
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: "access-new", token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }

      const key = `${url}-${auth}`;
      if (auth === "Bearer access-old" && !first401ByUrl.has(url)) {
        first401ByUrl.add(url);
        return Promise.resolve(new Response(JSON.stringify({ detail: "invalid access token" }), { status: 401 }));
      }

      if (auth === "Bearer access-new") {
        return Promise.resolve(new Response(JSON.stringify({ ok: key }), { status: 200 }));
      }

      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected" }), { status: 500 }));
    });

    const [responseA, responseB] = await Promise.all([
      fetchWithAuth("http://127.0.0.1:8000/decks", { method: "GET" }, fetchMock),
      fetchWithAuth("http://127.0.0.1:8000/review/decks", { method: "GET" }, fetchMock),
    ]);

    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(refreshCallCount).toBe(1);
  });
});
