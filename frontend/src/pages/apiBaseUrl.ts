/**
 * API 基地址解析工具。
 *
 * WHAT: 统一解析并规范化前端请求使用的 API base URL。
 * WHY: 本地开发需要让前后端共享同一主机名，避免 Better Auth cookie 因 localhost/127 跨站而丢失。
 */
export const DEFAULT_API_PORT = 8787;

const LOCAL_DEV_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

const LEGACY_LOCAL_API_BASE_URLS = new Set([
  "http://127.0.0.1:8000",
  "http://localhost:8000",
]);

export function getDefaultApiBaseUrl(hostname?: string): string {
  const resolvedHostname =
    typeof hostname === "string" && hostname.trim() ? hostname.trim() : window.location.hostname;

  if (LOCAL_DEV_HOSTNAMES.has(resolvedHostname)) {
    return `http://${resolvedHostname}:${DEFAULT_API_PORT}`;
  }

  return `http://127.0.0.1:${DEFAULT_API_PORT}`;
}

export function normalizeApiBaseUrl(rawBase: string): string {
  const normalizedBase = rawBase.trim().replace(/\/+$/, "");
  // 迁移兼容：若读取到旧本地端口，自动回落到 Hono 默认端口，避免登录请求连接被拒绝。
  if (LEGACY_LOCAL_API_BASE_URLS.has(normalizedBase)) {
    return getDefaultApiBaseUrl();
  }
  return normalizedBase;
}

export function getApiBaseUrl(envBase: unknown = import.meta.env.VITE_API_BASE_URL): string {
  if (typeof envBase !== "string" || !envBase.trim()) {
    return getDefaultApiBaseUrl();
  }

  return normalizeApiBaseUrl(envBase);
}
