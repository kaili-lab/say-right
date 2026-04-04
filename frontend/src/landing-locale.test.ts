import { afterEach, describe, expect, it } from "vitest";

import {
  LANDING_LOCALE_STORAGE_KEY,
  normalizeLandingLocale,
  persistLandingLocale,
  readLandingLocale,
  readPersistedLandingLocale,
} from "./pages/landingLocale";

describe("landing-locale", () => {
  afterEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
  });

  it("可识别 zh 和 en 语言输入", () => {
    expect(normalizeLandingLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLandingLocale("zh-TW")).toBe("zh-CN");
    expect(normalizeLandingLocale("en")).toBe("en");
    expect(normalizeLandingLocale("en-US")).toBe("en");
  });

  it("优先读取本地持久化语言", () => {
    persistLandingLocale("zh-CN");
    expect(readPersistedLandingLocale()).toBe("zh-CN");
    expect(readLandingLocale()).toBe("zh-CN");
  });
});

