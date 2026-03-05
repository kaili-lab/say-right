/**
 * 认证 API 访问层。
 *
 * WHAT: 封装注册/登录/会话查询/登出，并统一 cookie session 请求行为。
 * WHY: 前端从 token + refresh 流程迁移到 Better Auth 会话机制。
 */
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

// 兼容常量保留：迁移期用于清理旧键，后续可删除。
export const ACCESS_TOKEN_STORAGE_KEY = 'say_right_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = 'say_right_refresh_token';
export const SESSION_EMAIL_STORAGE_KEY = 'say_right_user_email';
export const SESSION_ACTIVE_STORAGE_KEY = 'say_right_session_active';

type RegisterApiResponse = {
  user: {
    id: string;
    email: string;
  };
};

type LoginApiResponse = {
  user: {
    id: string;
    email: string;
  };
};

export type RegisterResult = {
  userId: string;
  email: string;
};

export type LoginResult = {
  userId: string;
  email: string;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

let redirectToLoginForTest: (() => void) | null = null;
let redirectScheduled = false;

function getApiBaseUrl() {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  const rawBase = typeof envBase === 'string' && envBase.trim() ? envBase : DEFAULT_API_BASE_URL;
  return rawBase.replace(/\/+$/, '');
}

async function parseErrorMessage(response: Response) {
  let detail = `request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    if (typeof payload.detail === 'string' && payload.detail.trim()) {
      detail = payload.detail;
    } else if (typeof payload.message === 'string' && payload.message.trim()) {
      detail = payload.message;
    }
  } catch {
    // 错误响应兜底处理，避免 JSON 解析失败打断业务提示。
  }

  return detail;
}

function redirectToLogin() {
  if (redirectToLoginForTest) {
    redirectToLoginForTest();
    return;
  }

  window.location.assign('/auth/login');
}

function scheduleRedirectToLogin() {
  if (redirectScheduled) {
    return;
  }

  redirectScheduled = true;
  redirectToLogin();
  queueMicrotask(() => {
    redirectScheduled = false;
  });
}

function isPublicAuthEndpoint(url: string) {
  try {
    const pathname = new URL(url, window.location.origin).pathname.replace(/\/+$/, '');
    return pathname.endsWith('/api/auth/sign-in/email') || pathname.endsWith('/api/auth/sign-up/email');
  } catch {
    return false;
  }
}

function writeSessionMarker(email?: string) {
  try {
    window.localStorage.setItem(SESSION_ACTIVE_STORAGE_KEY, '1');
    if (email) {
      window.localStorage.setItem(SESSION_EMAIL_STORAGE_KEY, email);
    }
    // 清理历史 token 键，确保前端不再依赖 token 存储。
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage 在某些环境可能不可用，失败时保持幂等。
  }
}

async function requestAuthJson<T>(path: string, init: RequestInit, fetchImpl: typeof fetch = fetch): Promise<T> {
  const response = await fetchImpl(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    credentials: 'include',
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
  const normalizedEmail = params.email.trim().toLowerCase();
  const payload = await requestAuthJson<RegisterApiResponse>(
    '/api/auth/sign-up/email',
    {
      method: 'POST',
      body: JSON.stringify({
        email: normalizedEmail,
        password: params.password,
        name: normalizedEmail.split('@')[0] || 'Learner',
      }),
    },
    fetchImpl,
  );

  return {
    userId: payload.user.id,
    email: payload.user.email,
  };
}

export async function loginAccount(
  params: { email: string; password: string },
  fetchImpl: typeof fetch = fetch,
): Promise<LoginResult> {
  const payload = await requestAuthJson<LoginApiResponse>(
    '/api/auth/sign-in/email',
    {
      method: 'POST',
      body: JSON.stringify({
        email: params.email.trim().toLowerCase(),
        password: params.password,
      }),
    },
    fetchImpl,
  );

  return {
    userId: payload.user.id,
    email: payload.user.email,
  };
}

export function persistSession(session: LoginResult, email: string) {
  writeSessionMarker(email || session.email);
}

export function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_ACTIVE_STORAGE_KEY);
    window.localStorage.removeItem(SESSION_EMAIL_STORAGE_KEY);
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
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

/**
 * 兼容函数：历史路由守卫使用 readAccessToken 判断登录态。
 * 迁移后该函数返回 session marker，而非 token 本身。
 */
export function readAccessToken() {
  try {
    return window.localStorage.getItem(SESSION_ACTIVE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readRefreshToken() {
  return null;
}

export function __setRedirectToLoginForTest(handler: (() => void) | null) {
  redirectToLoginForTest = handler;
}

export async function fetchWithAuth(
  url: string,
  init: RequestInit = {},
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetchImpl(url, {
    ...init,
    headers: init.headers ?? {},
    credentials: 'include',
  });

  if (response.status === 401 && !isPublicAuthEndpoint(url)) {
    clearSession();
    scheduleRedirectToLogin();
  }

  return response;
}

type MeApiResponse = {
  session: {
    id: string;
    userId: string;
  };
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
};

export type MeInfo = {
  userId: string;
  email: string;
  nickname: string | null;
  displayName: string;
};

export async function fetchMe(fetchImpl: typeof fetch = fetch): Promise<MeInfo> {
  const response = await fetchImpl(`${getApiBaseUrl()}/api/auth/session`, {
    method: 'GET',
    credentials: 'include',
  });

  if (response.status === 401) {
    clearSession();
    throw new AuthApiError('unauthorized', 401);
  }

  if (!response.ok) {
    const detail = await parseErrorMessage(response);
    throw new AuthApiError(detail, response.status);
  }

  const payload = (await response.json()) as MeApiResponse;
  const email = payload.user.email;
  writeSessionMarker(email);

  return {
    userId: payload.user.id,
    email,
    nickname: payload.user.name ?? null,
    displayName: payload.user.name?.trim() || email.split('@')[0] || 'Learner',
  };
}

export async function logoutAccount(fetchImpl: typeof fetch = fetch) {
  await fetchImpl(`${getApiBaseUrl()}/api/auth/sign-out`, {
    method: 'POST',
    credentials: 'include',
  });
}
