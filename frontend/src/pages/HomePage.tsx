import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchHomeSummary } from "./homeApi";
import type { HomeSummary } from "./homeApi";

type HomeLoadStatus = "loading" | "ready" | "error";

export function HomePage() {
  const [status, setStatus] = useState<HomeLoadStatus>("loading");
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let disposed = false;

    async function loadSummary() {
      setStatus("loading");
      setErrorMessage("");
      try {
        const result = await fetchHomeSummary();
        if (disposed) {
          return;
        }
        setSummary(result);
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

    void loadSummary();
    return () => {
      disposed = true;
    };
  }, []);

  const totalDue = summary?.totalDue ?? 0;
  const studyDays = summary?.studyDays ?? 0;
  const masteredCount = summary?.masteredCount ?? 0;
  const totalCards = summary?.totalCards ?? 0;
  const recentDecks = useMemo(() => summary?.recentDecks ?? [], [summary]);
  const isEmpty = status === "ready" && totalCards === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-7">
        <h1 className="text-2xl font-bold text-amber-800">Hi, Kai 👋</h1>
        <p className="mt-2 text-sm text-stone-600">比起一次学很多，持续复习和记录更容易形成长期记忆。</p>

        <h2 className="mt-6 text-base font-semibold text-stone-700">Welcome Stats</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-200 bg-orange-50/60 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{studyDays}</p>
            <p className="mt-1 text-xs text-stone-500">已学习天数</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-orange-50/60 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{masteredCount}</p>
            <p className="mt-1 text-xs text-stone-500">已掌握卡片数</p>
          </div>
        </div>
      </article>

      <article className="flex flex-col rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-5">
        <h2 className="text-base font-semibold text-stone-700">今日待复习</h2>
        <p className="mt-3 text-5xl font-extrabold text-orange-500">{totalDue}</p>
        <p className="mt-2 text-xs text-stone-500">张待复习卡片</p>

        <div className="mt-6 grid gap-2">
          <Link
            to="/review"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            开始复习
          </Link>
          <Link
            to="/record"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
          >
            去记录新内容
          </Link>
        </div>
      </article>

      {status === "loading" ? (
        <article className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-stone-500 shadow-sm lg:col-span-12">
          正在加载首页数据...
        </article>
      ) : null}

      {status === "error" ? (
        <article
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm lg:col-span-12"
        >
          首页数据加载失败：{errorMessage}
        </article>
      ) : null}

      {isEmpty ? (
        <article className="rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm lg:col-span-12">
          <h2 className="text-2xl font-bold text-amber-800">还没有学习卡片</h2>
          <p className="mt-2 text-sm text-stone-600">从记录一句你常用但不会说的中文开始。</p>
          <Link
            to="/record"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            创建第一张卡片
          </Link>
        </article>
      ) : null}

      {status === "ready" && !isEmpty ? (
        <>
          <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-700">最近卡片组</h2>
              <Link to="/decks" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                查看全部
              </Link>
            </div>
            <ul className="grid gap-2">
              {recentDecks.map((deck) => (
                <li key={deck.id}>
                  <Link
                    to={`/review/session/${deck.id}`}
                    className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 transition hover:border-orange-200"
                  >
                    <span className="text-sm font-semibold text-stone-700">{deck.name}</span>
                    <span className="text-lg font-bold text-orange-500">{deck.dueCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-5">
            <h2 className="text-base font-semibold text-stone-700">你知道吗？</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              每天 10 分钟复习，比一周突击 2 小时更容易长期记住表达。
            </p>
          </article>
        </>
      ) : null}
    </div>
  );
}
