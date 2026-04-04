export const LANDING_LOCALE_STORAGE_KEY = "say_right_landing_locale";

export type LandingLocale = "zh-CN" | "en";

const SUPPORTED_LOCALES: LandingLocale[] = ["zh-CN", "en"];

export function normalizeLandingLocale(value: string | null | undefined): LandingLocale {
  if (!value) {
    return "en";
  }

  if (SUPPORTED_LOCALES.includes(value as LandingLocale)) {
    return value as LandingLocale;
  }

  return value.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function readPersistedLandingLocale(): LandingLocale | null {
  try {
    const value = window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY);
    return value ? normalizeLandingLocale(value) : null;
  } catch {
    return null;
  }
}

export function readLandingLocale(): LandingLocale {
  const persisted = readPersistedLandingLocale();
  if (persisted) {
    return persisted;
  }

  if (typeof navigator === "undefined") {
    return "en";
  }

  return normalizeLandingLocale(navigator.language);
}

export function persistLandingLocale(locale: LandingLocale) {
  try {
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage is optional in constrained runtime.
  }
}

