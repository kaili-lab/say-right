import { useParams } from "react-router-dom";

export function ReviewSessionPlaceholderPage() {
  const { deckId } = useParams();

  return (
    <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-amber-800">复习 Session（占位）</h1>
      <p className="mt-3 text-sm text-stone-600">当前 Deck：{deckId ?? "-"}</p>
      <p className="mt-1 text-sm text-stone-500">UI-008 将在此路由实现完整翻卡与评级流程。</p>
    </section>
  );
}
