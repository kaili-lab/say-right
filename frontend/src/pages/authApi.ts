/**
 * 认证 API 访问层。
 *
 * WHAT: 封装注册/登录接口与本地会话读写。
 * WHY: 统一处理鉴权令牌和错误解析，避免页面层重复维护相同逻辑。
 */
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

export const ACCESS_TOKEN_STORAGE_KEY = "say_right_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "say_right_refresh_token";
export const SESSION_EMAIL_STORAGE_KEY = "say_right_user_email";

type RegisterApiResponse = {
  user_id: string;
  email: string;
};

type LoginApiResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};

type RefreshAccessTokenApiResponse = {
  access_token: string;
  token_type: "bearer";
};

export type RegisterResult = {
  userId: string;
  email: string;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

let refreshInFlight: Promise<string> | null = null;
let redirectToLoginForTest: (() => void) | null = null;

function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const rawBase = typeof envBase === "string" && envBase.trim() ? envBase : DEFAULT_API_BASE_URL;
  return rawBase.replace(/\/+$/, "");
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      detail = payload.detail;
    }
  } catch {
    // 错误响应兜底处理，避免 JSON 解析失败打断业务提示。
  }
  return detail;
}

function saveAccessToken(accessToken: string) {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  } catch {
    // localStorage 在某些环境可能不可用，失败时让后续鉴权流程走兜底分支。
  }
}

function redirectToLogin() {
  if (redirectToLoginForTest) {
    redirectToLoginForTest();
    return;
  }

  window.location.assign("/auth/login");
}

function buildAuthHeaders(init: RequestInit, accessToken: string | null) {
  const headers = new Headers(init.headers ?? {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  } else {
    headers.delete("Authorization");
  }
  return headers;
}

function isRefreshEndpoint(url: string) {
  return url.replace(/\/+$/, "").endsWith("/auth/refresh");
}

async function requestAuthJson<T>(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new AuthApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export async function registerAccount(
  params: { email: string; password: string },
  fetchImpl: typeof fetch = fetch,
): Promise<RegisterResult> {
  const payload = await requestAuthJson<RegisterApiResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email: params.email, password: params.password }),
    },
    fetchImpl,
  );

  return {
    userId: payload.user_id,
    email: payload.email,
  };
}

export async function loginAccount(
  params: { email: string; password: string },
  fetchImpl: typeof fetch = fetch,
): Promise<LoginResult> {
  const payload = await requestAuthJson<LoginApiResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email: params.email, password: params.password }),
    },
    fetchImpl,
  );

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenType: payload.token_type,
  };
}

export function persistSession(session: LoginResult, email: string) {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
    window.localStorage.setItem(SESSION_EMAIL_STORAGE_KEY, email);
  } catch {
    // localStorage 在某些环境可能不可用，失败时降级为无状态。
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_EMAIL_STORAGE_KEY);
  } catch {
    // localStorage 在某些环境可能不可用，失败时保持幂等。
  }
}

export function readSessionEmail() {
  try {
    return window.localStorage.getItem(SESSION_EMAIL_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readAccessToken() {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function __setRedirectToLoginForTest(handler: (() => void) | null) {
  redirectToLoginForTest = handler;
}

export async function refreshAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const refreshToken = readRefreshToken();
  if (!refreshToken) {
    clearSession();
    redirectToLogin();
    throw new AuthApiError("missing refresh token", 401);
  }

  const response = await fetchImpl(`${getApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    if (response.status === 401) {
      clearSession();
      redirectToLogin();
    }
    throw new AuthApiError(detail, response.status);
  }

  const payload = (await response.json()) as RefreshAccessTokenApiResponse;
  const accessToken = payload.access_token?.trim();
  if (!accessToken) {
    throw new AuthApiError("invalid refresh response", 500);
  }

  saveAccessToken(accessToken);
  return accessToken;
}

async function refreshAccessTokenSingleFlight(fetchImpl: typeof fetch) {
  if (!refreshInFlight) {
    // 并发 401 时共享同一个刷新请求，避免瞬时重复 refresh。
    refreshInFlight = refreshAccessToken(fetchImpl).finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

export async function fetchWithAuth(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  async function requestWithCurrentToken() {
    const accessToken = readAccessToken();
    const headers = buildAuthHeaders(init, accessToken);
    return fetchImpl(url, { ...init, headers });
  }

  const response = await requestWithCurrentToken();
  if (response.status !== 401 || isRefreshEndpoint(url)) {
    return response;
  }

  await refreshAccessTokenSingleFlight(fetchImpl);
  const retried = await requestWithCurrentToken();
  if (retried.status === 401) {
    clearSession();
    redirectToLogin();
  }
  return retried;
}

type MeApiResponse = {
  user_id: string;
  email: string;
  nickname: string | null;
  display_name: string;
};

export type MeInfo = {
  userId: string;
  email: string;
  nickname: string | null;
  displayName: string;
};

export async function fetchMe(fetchImpl: typeof fetch = fetch): Promise<MeInfo> {
  const response = await fetchWithAuth(`${getApiBaseUrl()}/me`, { method: "GET" }, fetchImpl);

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new AuthApiError(detail, response.status);
  }

  const payload = (await response.json()) as MeApiResponse;
  return {
    userId: payload.user_id,
    email: payload.email,
    nickname: payload.nickname,
    displayName: payload.display_name,
  };
}

export async function logoutAccount(fetchImpl: typeof fetch = fetch) {
  const accessToken = readAccessToken();
  if (!accessToken) {
    return;
  }

  const response = await fetchImpl(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 401) {
    const detail = await parseErrorMessage(response);
    throw new AuthApiError(detail, response.status);
  }
}
