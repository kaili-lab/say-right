import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DeckApiError, createDeck, fetchDecks } from "./decksApi";
import type { DeckSummary } from "./decksApi";

type DeckLoadStatus = "loading" | "ready" | "error";

export function DeckListPage() {
  const [searchParams] = useSearchParams();
  const [loadStatus, setLoadStatus] = useState<DeckLoadStatus>("loading");
  const [decks, setDecks] = useState<DeckSummary[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [manualExitEmpty, setManualExitEmpty] = useState(false);

  const forceEmpty = searchParams.get("state") === "empty";

  useEffect(() => {
    let disposed = false;

    if (forceEmpty && !manualExitEmpty) {
      // 通过 URL 强制空态，方便验收 UI 空状态，不触发真实接口请求。
      return () => {
        disposed = true;
      };
    }

    async function loadDecks() {
      setLoadStatus("loading");
      setErrorMessage("");
      try {
        const result = await fetchDecks();
        if (disposed) {
          return;
        }
        setDecks(result);
        setSelectedDeckId((previous) => previous ?? result[0]?.id ?? null);
        setLoadStatus("ready");
      } catch (error) {
        if (disposed) {
          return;
        }
        setLoadStatus("error");
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
  }, [forceEmpty, manualExitEmpty]);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedDeckId) ?? decks[0] ?? null,
    [decks, selectedDeckId],
  );

  const showEmptyState = forceEmpty && !manualExitEmpty && decks.length === 0;

  function openCreateModal() {
    setIsCreateModalOpen(true);
    setNewDeckName("");
    setFormError("");
  }

  function closeCreateModal() {
    if (isCreating) {
      return;
    }
    setIsCreateModalOpen(false);
  }

  async function handleCreateDeck() {
    const normalizedName = newDeckName.trim();
    if (!normalizedName) {
      setFormError("请输入卡片组名称。");
      return;
    }

    if (decks.some((deck) => deck.name.toLowerCase() === normalizedName.toLowerCase())) {
      setFormError("已存在同名卡片组，请换一个名称。");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const created = await createDeck(normalizedName);
      setDecks((previous) => [...previous, created]);
      setSelectedDeckId(created.id);
      if (forceEmpty && !manualExitEmpty) {
        // 空态下创建成功后退出强制空态，让用户立即看到新建结果。
        setManualExitEmpty(true);
      }
      setLoadStatus("ready");
      setIsCreateModalOpen(false);
    } catch (error) {
      if (error instanceof DeckApiError) {
        setFormError(`创建失败：${error.message}`);
      } else if (error instanceof Error) {
        setFormError(`创建失败：${error.message}`);
      } else {
        setFormError("创建失败，请稍后重试。");
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-amber-800">卡片组管理</h1>
          <p className="mt-1 text-sm text-stone-600">查看所有 Deck，按组维护卡片。</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
        >
          + 创建卡片组
        </button>
      </header>

      {showEmptyState ? (
        <article className="rounded-2xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-amber-800">默认组（0 张）</h2>
          <p className="mt-2 text-sm text-stone-600">当前还没有任何卡片。你可以先创建分组，或先去记录页生成第一张卡片。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              创建卡片组
            </button>
            <Link
              to="/record"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
            >
              去记录新内容
            </Link>
          </div>
        </article>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-stone-700">所有卡片组</h2>

            {loadStatus === "loading" ? <p className="text-sm text-stone-500">加载中...</p> : null}
            {loadStatus === "error" ? (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                加载失败：{errorMessage}
              </p>
            ) : null}

            {loadStatus === "ready" ? (
              <div className="grid gap-2">
                {decks.map((deck) => (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => setSelectedDeckId(deck.id)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      selectedDeck?.id === deck.id ? "border-orange-200 bg-orange-50/60" : "border-stone-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-stone-700">{deck.name}</p>
                      <p className="text-xl font-extrabold text-orange-500">{deck.dueCount}</p>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      新 {deck.newCount} · 学习中 {deck.learningCount} · 待复习 {deck.dueCount}
                    </p>
                    {deck.isDefault ? (
                      <p className="mt-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                        默认组
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-amber-800">{selectedDeck?.name ?? "-"}</h2>
                <p className="mt-1 text-sm text-stone-500">
                  新 {selectedDeck?.newCount ?? 0} · 学习中 {selectedDeck?.learningCount ?? 0} · 待复习{" "}
                  {selectedDeck?.dueCount ?? 0}
                </p>
              </div>
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center justify-center rounded-xl bg-red-100 px-4 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                删除卡片组
              </button>
            </div>

            <p className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-amber-800">
              {selectedDeck?.isDefault
                ? "默认组不可删除；当自动分组无法命中时，系统会回退到默认组。"
                : "非默认组删除能力将在后续任务实现。"}
            </p>
          </section>
        </div>
      )}

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-deck-title"
            className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
              <div>
                <h2 id="create-deck-title" className="text-base font-bold text-amber-800">
                  创建卡片组
                </h2>
                <p className="mt-1 text-xs text-stone-500">新组默认是空组，可直接被删除。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={closeCreateModal}
                className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100"
              >
                ×
              </button>
            </header>

            <div className="space-y-2 p-4">
              <label htmlFor="new-deck-name" className="block text-sm font-semibold text-stone-600">
                卡片组名称
              </label>
              <input
                id="new-deck-name"
                value={newDeckName}
                onChange={(event) => setNewDeckName(event.target.value)}
                maxLength={24}
                placeholder="例如：旅行应急"
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              {formError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreateDeck()}
                disabled={isCreating}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                创建
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
