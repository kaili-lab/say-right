/**
 * API 基地址解析工具。
 *
 * WHAT: 统一解析并规范化前端请求使用的 API base URL。
 * WHY: Hono 迁移期间，避免本地残留旧 FastAPI 端口配置导致请求打到 8000。
 */
export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";

const LEGACY_LOCAL_API_BASE_URLS = new Set([
  "http://127.0.0.1:8000",
  "http://localhost:8000",
]);

export function normalizeApiBaseUrl(rawBase: string): string {
  const normalizedBase = rawBase.trim().replace(/\/+$/, "");
  // 迁移兼容：若读取到旧本地端口，自动回落到 Hono 默认端口，避免登录请求连接被拒绝。
  if (LEGACY_LOCAL_API_BASE_URLS.has(normalizedBase)) {
    return DEFAULT_API_BASE_URL;
  }
  return normalizedBase;
}

export function getApiBaseUrl(envBase: unknown = import.meta.env.VITE_API_BASE_URL): string {
  if (typeof envBase !== "string" || !envBase.trim()) {
    return DEFAULT_API_BASE_URL;
  }

  return normalizeApiBaseUrl(envBase);
}
