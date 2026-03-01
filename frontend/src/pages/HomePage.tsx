import { Link, useSearchParams } from "react-router-dom";

type DeckPreview = {
  id: string;
  name: string;
  dueCount: number;
};

const DECK_PREVIEW: DeckPreview[] = [
  { id: "travel", name: "Travel", dueCount: 12 },
  { id: "daily", name: "Daily Conversation", dueCount: 6 },
  { id: "work", name: "Work Email", dueCount: 3 },
];

export function HomePage() {
  const [searchParams] = useSearchParams();
  // 通过 URL 参数强制空状态，既便于联调也便于测试覆盖首次使用场景。
  const isEmpty = searchParams.get("state") === "empty";
  const totalDue = isEmpty ? 0 : DECK_PREVIEW.reduce((sum, deck) => sum + deck.dueCount, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-7">
        <h1 className="text-2xl font-bold text-amber-800">Hi, Kai 👋</h1>
        <p className="mt-2 text-sm text-stone-600">比起一次学很多，持续复习和记录更容易形成长期记忆。</p>

        <h2 className="mt-6 text-base font-semibold text-stone-700">Welcome Stats</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-stone-200 bg-orange-50/60 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{isEmpty ? 0 : 5}</p>
            <p className="mt-1 text-xs text-stone-500">已学习天数</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-orange-50/60 p-3 text-center">
            <p className="text-2xl font-bold text-amber-700">{isEmpty ? 0 : 28}</p>
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
      ) : (
        <>
          <article className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-700">最近卡片组</h2>
              <Link to="/decks" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
                查看全部
              </Link>
            </div>
            <ul className="grid gap-2">
              {DECK_PREVIEW.map((deck) => (
                <li key={deck.id}>
                  <Link
                    to="/review"
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
      )}
    </div>
  );
}
