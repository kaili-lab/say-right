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
