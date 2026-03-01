import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { fetchReviewDecks } from "./reviewApi";
import type { ReviewDeckSummary } from "./reviewApi";

type ReviewDeckLoadStatus = "loading" | "ready" | "error";

export function ReviewDeckListPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<ReviewDeckLoadStatus>("loading");
  const [decks, setDecks] = useState<ReviewDeckSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const forceEmpty = searchParams.get("state") === "empty";

  useEffect(() => {
    let disposed = false;

    if (forceEmpty) {
      return () => {
        disposed = true;
      };
    }

    async function loadDecks() {
      setStatus("loading");
      setErrorMessage("");
      try {
        const result = await fetchReviewDecks();
        if (disposed) {
          return;
        }
        setDecks(result);
        setStatus("ready");
      } catch (error) {
        if (disposed) {
          return;
        }
        setStatus("error");
        if (error instanceof Error) {
          setErrorMessage(error.message);
          return;
        }
        setErrorMessage("加载失败，请稍后重试");
      }
    }

    void loadDecks();

    return () => {
      disposed = true;
    };
  }, [forceEmpty]);

  const sortedDecks = useMemo(
    () => [...decks].sort((left, right) => right.dueCount - left.dueCount),
    [decks],
  );
  const effectiveDecks = forceEmpty ? [] : sortedDecks;
  const totalDue = effectiveDecks.reduce((sum, deck) => sum + deck.dueCount, 0);
  const shouldShowEmpty = forceEmpty || (status === "ready" && effectiveDecks.length === 0);

  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <article className="rounded-2xl border border-orange-100 bg-gradient-to-br from-[#fffcf7] to-[#fff7ed] p-6 shadow-sm lg:col-span-4">
        <h1 className="text-lg font-bold text-amber-800">今日复习总览</h1>
        <p className="mt-3 text-5xl font-extrabold text-orange-500">{totalDue}</p>
        <p className="mt-2 text-xs text-stone-500">张待复习卡片（按 Deck 进入）</p>
      </article>

      {shouldShowEmpty ? (
        <article className="rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm lg:col-span-8">
          <h2 className="text-2xl font-bold text-amber-800">暂无待复习内容</h2>
          <p className="mt-2 text-sm text-stone-600">今天没有到期卡片，可以先记录新表达。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/record"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              去记录新内容
            </Link>
            <Link
              to="/decks"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
            >
              查看全部卡片组
            </Link>
          </div>
        </article>
      ) : (
        <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-8">
          <header className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-base font-semibold text-stone-700">Deck 列表</h2>
            <span className="text-xs text-stone-500">按待复习数量降序</span>
          </header>

          {status === "loading" ? <p className="text-sm text-stone-500">加载中...</p> : null}

          {status === "error" ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              加载失败：{errorMessage}
            </div>
          ) : null}

          {status === "ready" ? (
            <div data-testid="review-deck-list" className="grid gap-3">
              {effectiveDecks.map((deck, index) => (
                <article
                  key={deck.deckId}
                  className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border p-3 ${
                    index === 0 ? "border-orange-200 bg-orange-50/50" : "border-stone-200 bg-white"
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-bold text-stone-700">
                      {deck.deckName}
                      {index === 0 ? " · 推荐先复习" : ""}
                    </h3>
                    <p className="mt-1 text-xs text-stone-500">待复习 {deck.dueCount}</p>
                  </div>

                  <div className="grid justify-items-end gap-2">
                    <span className="text-2xl font-extrabold text-orange-500">{deck.dueCount}</span>
                    <Link
                      to={`/review/session/${deck.deckId}`}
                      aria-label={`进入 Deck ${deck.deckName}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white transition hover:bg-orange-600"
                    >
                      进入 Deck
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </article>
      )}
    </section>
  );
}
