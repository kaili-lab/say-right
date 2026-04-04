import { useState } from "react";
import { Link } from "react-router-dom";

import { readAccessToken } from "./authApi";
import { LANDING_COPY } from "./landingCopy";
import type { LandingLocale } from "./landingLocale";
import { persistLandingLocale, readLandingLocale } from "./landingLocale";

const STEP_ICONS = ["✍️", "🤖", "🔁"];

function localeButtonClass(active: boolean) {
  return active
    ? "rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white"
    : "rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100";
}

export function LandingPage() {
  const [locale, setLocale] = useState<LandingLocale>(() => readLandingLocale());
  const copy = LANDING_COPY[locale];
  const isAuthed = Boolean(readAccessToken());

  function handleLocaleChange(nextLocale: LandingLocale) {
    setLocale(nextLocale);
    persistLandingLocale(nextLocale);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,#fff7ed_0%,#faf9f6_45%,#fffdf9_100%)] text-stone-800">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-orange-100/80 bg-[#faf9f6]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-orange-500 text-xs font-extrabold text-white">
              SR
            </span>
            <div>
              <p className="text-sm font-bold text-amber-800">Say Right</p>
              <p className="text-[11px] text-stone-500">AI English Expression Coach</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-stone-500 sm:inline">{copy.localeLabel}</span>
            <button type="button" className={localeButtonClass(locale === "zh-CN")} onClick={() => handleLocaleChange("zh-CN")}>
              中
            </button>
            <button type="button" className={localeButtonClass(locale === "en")} onClick={() => handleLocaleChange("en")}>
              EN
            </button>
            {isAuthed ? (
              <Link
                to="/app"
                className="ml-1 inline-flex h-9 items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                {copy.backToApp}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/login"
                  className="ml-1 hidden h-9 items-center justify-center rounded-lg bg-orange-50 px-3 text-sm font-semibold text-orange-700 hover:bg-orange-100 sm:inline-flex"
                >
                  {copy.login}
                </Link>
                <Link
                  to="/auth/register"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  {copy.register}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1160px] px-4 pb-16 md:px-6">
        {/* Hero */}
        <section className="py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-[800px] text-3xl font-black leading-tight text-amber-900 md:text-5xl">
            {copy.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-sm leading-7 text-stone-600 md:text-base">
            {copy.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isAuthed ? "/app" : "/auth/register"}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600"
            >
              {copy.heroPrimaryCta}
            </Link>
            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-orange-200 bg-white px-6 text-sm font-semibold text-orange-700 hover:bg-orange-50"
            >
              {copy.heroSecondaryCta}
            </a>
          </div>
        </section>

        {/* Pain point: before / after */}
        <section className="rounded-3xl border border-orange-100 bg-white p-7 shadow-sm">
          <h2 className="text-center text-2xl font-bold text-amber-900">{copy.painTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
              <p className="text-sm font-bold text-stone-500">{copy.painBefore}</p>
              <ul className="mt-3 grid gap-2">
                {copy.painBeforeItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-500">
                    <span className="mt-0.5 text-stone-400">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5">
              <p className="text-sm font-bold text-orange-700">{copy.painAfter}</p>
              <ul className="mt-3 grid gap-2">
                {copy.painAfterItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-stone-700">
                    <span className="mt-0.5 text-orange-500">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mt-10 rounded-3xl border border-orange-100 bg-white p-7 shadow-sm">
          <h2 className="text-center text-2xl font-bold text-amber-900">{copy.workflowTitle}</h2>
          <p className="mt-2 text-center text-sm text-stone-600">{copy.workflowIntro}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.workflowSteps.map((step, i) => (
              <article key={step.title} className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5 text-center">
                <span className="text-3xl">{STEP_ICONS[i]}</span>
                <h3 className="mt-3 text-sm font-bold text-amber-800">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mt-10 rounded-3xl border border-orange-100 bg-white p-7 shadow-sm">
          <h2 className="text-center text-2xl font-bold text-amber-900">{copy.benefitTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.benefitItems.map((item) => (
              <article key={item.title} className="rounded-2xl border border-orange-100 bg-gradient-to-b from-orange-50/50 to-white p-5">
                <h3 className="text-sm font-bold text-amber-800">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-10 rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-amber-900">{copy.finalCtaTitle}</h2>
          <p className="mt-2 text-sm text-stone-600">{copy.finalCtaDescription}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={isAuthed ? "/app" : "/auth/register"}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white shadow-md shadow-orange-200 hover:bg-orange-600"
            >
              {copy.heroPrimaryCta}
            </Link>
            {!isAuthed && (
              <Link
                to="/auth/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-orange-200 bg-white px-6 text-sm font-semibold text-orange-700 hover:bg-orange-50"
              >
                {copy.login}
              </Link>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
