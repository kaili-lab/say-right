import { describe, expect, it } from "vitest";

import { DEFAULT_API_BASE_URL, getApiBaseUrl, normalizeApiBaseUrl } from "./apiBaseUrl";

describe("apiBaseUrl", () => {
  it("未提供 env 时应回落到 Hono 默认端口", () => {
    expect(getApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(getApiBaseUrl("   ")).toBe(DEFAULT_API_BASE_URL);
  });

  it("应去除尾部斜杠并保留自定义地址", () => {
    expect(normalizeApiBaseUrl("https://api.example.com/v1/")).toBe("https://api.example.com/v1");
    expect(getApiBaseUrl("http://127.0.0.1:8787/")).toBe("http://127.0.0.1:8787");
  });

  it("读取到旧 FastAPI 本地端口时应自动回落到 Hono 端口", () => {
    expect(getApiBaseUrl("http://127.0.0.1:8000")).toBe(DEFAULT_API_BASE_URL);
    expect(getApiBaseUrl("http://localhost:8000/")).toBe(DEFAULT_API_BASE_URL);
  });
});
