/**
 * 卡片组管理页面。
 *
 * WHAT: 提供卡片组列表、创建分组，以及组内卡片的编辑/移动/删除交互。
 * WHY: 将“分组管理”和“卡片维护”收敛到单页，减少跨页跳转并对齐 v0.3 契约流程。
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { DeckApiError, createDeck, deleteDeck, deleteCard, fetchDeckCards, fetchDecks, moveCard, updateCard } from "./decksApi";
import type { DeckCard, DeckSummary } from "./decksApi";

type DeckLoadStatus = "loading" | "ready" | "error";
type CardLoadStatus = "idle" | "loading" | "ready" | "error";

type CardModalState =
  | { mode: "closed" }
  | { mode: "detail"; card: DeckCard }
  | { mode: "edit"; card: DeckCard; frontText: string; backText: string; formError: string }
  | { mode: "move"; card: DeckCard; toDeckId: string; formError: string }
  | { mode: "delete"; card: DeckCard };

function formatDueAt(dueAt: string) {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return dueAt;
  }
  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

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

  const [cardsByDeckId, setCardsByDeckId] = useState<Record<string, DeckCard[]>>({});
  const [cardStatusByDeckId, setCardStatusByDeckId] = useState<Record<string, CardLoadStatus>>({});
  const [cardErrorByDeckId, setCardErrorByDeckId] = useState<Record<string, string>>({});
  const [manualExitEmpty, setManualExitEmpty] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const [cardModalState, setCardModalState] = useState<CardModalState>({ mode: "closed" });
  const [isCardActionSubmitting, setIsCardActionSubmitting] = useState(false);
  const [isDeckDeleteModalOpen, setIsDeckDeleteModalOpen] = useState(false);
  const [deckDeleteError, setDeckDeleteError] = useState("");
  const [isDeckDeleting, setIsDeckDeleting] = useState(false);

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
        setSelectedDeckId((previous) => {
          if (previous && result.some((deck) => deck.id === previous)) {
            return previous;
          }
          return result[0]?.id ?? null;
        });
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

  const selectedDeckCards = selectedDeck ? cardsByDeckId[selectedDeck.id] ?? [] : [];
  const selectedCardStatus = selectedDeck ? cardStatusByDeckId[selectedDeck.id] ?? "idle" : "idle";
  const selectedCardError = selectedDeck ? cardErrorByDeckId[selectedDeck.id] ?? "" : "";

  const showEmptyState = forceEmpty && !manualExitEmpty && decks.length === 0;

  function updateCardsForDeck(deckId: string, updater: (previous: DeckCard[]) => DeckCard[]) {
    setCardsByDeckId((previous) => {
      const next = { ...previous };
      next[deckId] = updater(previous[deckId] ?? []);
      return next;
    });
  }

  async function loadDeckCards(deckId: string) {
    setCardStatusByDeckId((previous) => ({ ...previous, [deckId]: "loading" }));
    setCardErrorByDeckId((previous) => ({ ...previous, [deckId]: "" }));

    try {
      const cards = await fetchDeckCards(deckId);
      setCardsByDeckId((previous) => ({ ...previous, [deckId]: cards }));
      setCardStatusByDeckId((previous) => ({ ...previous, [deckId]: "ready" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "卡片加载失败，请稍后重试。";
      setCardStatusByDeckId((previous) => ({ ...previous, [deckId]: "error" }));
      setCardErrorByDeckId((previous) => ({ ...previous, [deckId]: message }));
    }
  }

  function handleSelectDeck(deckId: string) {
    setSelectedDeckId(deckId);
    setActionMessage("");

    if (Object.prototype.hasOwnProperty.call(cardsByDeckId, deckId)) {
      setCardStatusByDeckId((previous) => ({ ...previous, [deckId]: "ready" }));
      return;
    }

    // 卡片列表按需加载：只在用户实际进入该组时请求，减少首屏无效请求。
    void loadDeckCards(deckId);
  }

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
      setCardsByDeckId((previous) => ({ ...previous, [created.id]: [] }));
      setCardStatusByDeckId((previous) => ({ ...previous, [created.id]: "ready" }));

      if (forceEmpty && !manualExitEmpty) {
        // 空态下创建成功后退出强制空态，让用户立即看到新建结果。
        setManualExitEmpty(true);
      }
      setLoadStatus("ready");
      setIsCreateModalOpen(false);
      setActionMessage("已创建卡片组。");
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

  function closeCardModal() {
    if (isCardActionSubmitting) {
      return;
    }
    setCardModalState({ mode: "closed" });
  }

  function openEditModal(card: DeckCard) {
    setCardModalState({
      mode: "edit",
      card,
      frontText: card.frontText,
      backText: card.backText,
      formError: "",
    });
  }

  function openMoveModal(card: DeckCard) {
    const targetDeck = decks.find((deck) => deck.id !== card.deckId);
    if (!targetDeck) {
      setActionMessage("当前没有可移动到的目标卡片组。");
      return;
    }

    setCardModalState({
      mode: "move",
      card,
      toDeckId: targetDeck.id,
      formError: "",
    });
  }

  function openDeleteModal(card: DeckCard) {
    setCardModalState({ mode: "delete", card });
  }

  function openDetailModal(card: DeckCard) {
    setCardModalState({ mode: "detail", card });
  }

  async function handleDeleteDeck() {
    if (!selectedDeck || selectedDeck.isDefault) return;

    const deckIdToDelete = selectedDeck.id;
    const remainingDecks = decks.filter((d) => d.id !== deckIdToDelete);
    const nextDeck = remainingDecks.find((d) => d.isDefault) ?? remainingDecks[0] ?? null;

    setIsDeckDeleting(true);
    setDeckDeleteError("");

    try {
      await deleteDeck(deckIdToDelete);
      setDecks(remainingDecks);
      setCardsByDeckId((prev) => {
        const next = { ...prev };
        delete next[deckIdToDelete];
        return next;
      });
      setCardStatusByDeckId((prev) => {
        const next = { ...prev };
        delete next[deckIdToDelete];
        return next;
      });
      setSelectedDeckId(nextDeck?.id ?? null);
      setActionMessage("卡片组已删除。");
      setIsDeckDeleteModalOpen(false);
    } catch (error) {
      setDeckDeleteError(error instanceof Error ? error.message : "删除失败，请稍后重试。");
    } finally {
      setIsDeckDeleting(false);
    }
  }

  async function submitEditCard() {
    if (cardModalState.mode !== "edit") {
      return;
    }

    const normalizedFront = cardModalState.frontText.trim();
    const normalizedBack = cardModalState.backText.trim();
    if (!normalizedFront || !normalizedBack) {
      setCardModalState((previous) => {
        if (previous.mode !== "edit") {
          return previous;
        }
        return { ...previous, formError: "中文和英文都不能为空。" };
      });
      return;
    }

    setIsCardActionSubmitting(true);
    try {
      const updated = await updateCard(cardModalState.card.id, {
        frontText: normalizedFront,
        backText: normalizedBack,
      });

      updateCardsForDeck(cardModalState.card.deckId, (previous) =>
        previous.map((card) => (card.id === updated.id ? updated : card)),
      );
      setActionMessage("卡片已更新。");
      setCardModalState({ mode: "closed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败，请稍后重试。";
      setCardModalState((previous) => {
        if (previous.mode !== "edit") {
          return previous;
        }
        return { ...previous, formError: message };
      });
    } finally {
      setIsCardActionSubmitting(false);
    }
  }

  async function submitMoveCard() {
    if (cardModalState.mode !== "move") {
      return;
    }

    if (!cardModalState.toDeckId) {
      setCardModalState((previous) => {
        if (previous.mode !== "move") {
          return previous;
        }
        return { ...previous, formError: "请选择目标卡片组。" };
      });
      return;
    }

    setIsCardActionSubmitting(true);
    try {
      const movedCard = await moveCard(cardModalState.card.id, cardModalState.toDeckId);

      // 移动后同时更新源组和目标组缓存，确保用户不刷新也能看到一致结果。
      updateCardsForDeck(cardModalState.card.deckId, (previous) =>
        previous.filter((card) => card.id !== cardModalState.card.id),
      );
      setCardsByDeckId((previous) => {
        const next = { ...previous };
        next[movedCard.deckId] = [...(next[movedCard.deckId] ?? []), movedCard];
        return next;
      });
      setCardStatusByDeckId((previous) => ({
        ...previous,
        [cardModalState.card.deckId]: "ready",
        [movedCard.deckId]: "ready",
      }));

      const targetDeckName = decks.find((deck) => deck.id === movedCard.deckId)?.name ?? "目标组";
      setActionMessage(`卡片已移动到 ${targetDeckName}。`);
      setCardModalState({ mode: "closed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "移动失败，请稍后重试。";
      setCardModalState((previous) => {
        if (previous.mode !== "move") {
          return previous;
        }
        return { ...previous, formError: message };
      });
    } finally {
      setIsCardActionSubmitting(false);
    }
  }

  async function submitDeleteCard() {
    if (cardModalState.mode !== "delete") {
      return;
    }

    setIsCardActionSubmitting(true);
    try {
      await deleteCard(cardModalState.card.id);
      updateCardsForDeck(cardModalState.card.deckId, (previous) =>
        previous.filter((card) => card.id !== cardModalState.card.id),
      );
      setActionMessage("卡片已删除。");
      setCardModalState({ mode: "closed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除失败，请稍后重试。";
      setActionMessage(message);
    } finally {
      setIsCardActionSubmitting(false);
    }
  }

  const moveTargetDecks = useMemo(() => {
    if (cardModalState.mode !== "move") {
      return [];
    }
    return decks.filter((deck) => deck.id !== cardModalState.card.deckId);
  }, [cardModalState, decks]);

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
                    onClick={() => handleSelectDeck(deck.id)}
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
                  新 {selectedDeck?.newCount ?? 0} · 学习中 {selectedDeck?.learningCount ?? 0} · 待复习 {selectedDeck?.dueCount ?? 0}
                </p>
              </div>
              <button
                type="button"
                disabled={selectedDeck?.isDefault ?? true}
                onClick={() => {
                  setIsDeckDeleteModalOpen(true);
                  setDeckDeleteError("");
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-red-100 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                删除卡片组
              </button>
            </div>

            {selectedDeck?.isDefault ? (
              <p className="mb-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-amber-800">
                默认组不可删除；当自动分组无法命中时，系统会回退到默认组。
              </p>
            ) : null}

            {actionMessage ? (
              <p role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {actionMessage}
              </p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-stone-200">
              <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-orange-50/70 text-left text-xs text-stone-500">
                  <tr>
                    <th className="px-3 py-2">中文</th>
                    <th className="px-3 py-2">英文</th>
                    <th className="px-3 py-2">下次复习</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCardStatus === "idle" ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-stone-500" colSpan={4}>
                        点击左侧卡片组后加载该组卡片。
                      </td>
                    </tr>
                  ) : null}

                  {selectedCardStatus === "loading" ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-stone-500" colSpan={4}>
                        卡片加载中...
                      </td>
                    </tr>
                  ) : null}

                  {selectedCardStatus === "error" ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          <span>加载失败：{selectedCardError}</span>
                          {selectedDeck ? (
                            <button
                              type="button"
                              onClick={() => void loadDeckCards(selectedDeck.id)}
                              className="inline-flex h-9 items-center justify-center rounded-lg bg-red-100 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-200"
                            >
                              重试
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}

                  {selectedCardStatus === "ready" && selectedDeckCards.length === 0 ? (
                    <tr>
                      <td className="px-3 py-3 text-sm text-stone-500" colSpan={4}>
                        该组暂无卡片。
                      </td>
                    </tr>
                  ) : null}

                  {selectedCardStatus === "ready"
                    ? selectedDeckCards.map((card) => (
                        <tr key={card.id} className="border-t border-stone-100 align-top text-sm">
                          <td className="px-3 py-3 text-stone-700">
                            <div className="max-w-[7rem] truncate" title={card.frontText}>{card.frontText}</div>
                          </td>
                          <td className="px-3 py-3 font-semibold text-stone-700">
                            <div className="max-w-[7rem] truncate" title={card.backText}>{card.backText}</div>
                          </td>
                          <td className="px-3 py-3 text-stone-500">{formatDueAt(card.dueAt)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openDetailModal(card)}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-orange-300 hover:text-orange-600"
                              >
                                查看
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(card)}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-orange-300 hover:text-orange-600"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => openMoveModal(card)}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-orange-300 hover:text-orange-600"
                              >
                                移动
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeleteModal(card)}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : null}
                </tbody>
              </table>
              </div>
            </div>
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

      {cardModalState.mode === "edit" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-card-title"
            className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
              <div>
                <h2 id="edit-card-title" className="text-base font-bold text-amber-800">
                  编辑卡片
                </h2>
                <p className="mt-1 text-xs text-stone-500">按需求，编辑不会重置 FSRS 状态。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={closeCardModal}
                className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100"
              >
                ×
              </button>
            </header>

            <div className="space-y-3 p-4">
              <div>
                <label htmlFor="edit-front" className="mb-1 block text-sm font-semibold text-stone-600">
                  中文
                </label>
                <textarea
                  id="edit-front"
                  value={cardModalState.frontText}
                  onChange={(event) =>
                    setCardModalState((previous) =>
                      previous.mode === "edit" ? { ...previous, frontText: event.target.value } : previous,
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label htmlFor="edit-back" className="mb-1 block text-sm font-semibold text-stone-600">
                  英文
                </label>
                <textarea
                  id="edit-back"
                  value={cardModalState.backText}
                  onChange={(event) =>
                    setCardModalState((previous) =>
                      previous.mode === "edit" ? { ...previous, backText: event.target.value } : previous,
                    )
                  }
                  rows={3}
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {cardModalState.formError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {cardModalState.formError}
                </p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={closeCardModal}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isCardActionSubmitting}
                onClick={() => void submitEditCard()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                保存
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {cardModalState.mode === "move" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-card-title"
            className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
              <div>
                <h2 id="move-card-title" className="text-base font-bold text-amber-800">
                  移动卡片
                </h2>
                <p className="mt-1 text-xs text-stone-500">将当前卡片移动到其他组。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={closeCardModal}
                className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100"
              >
                ×
              </button>
            </header>

            <div className="space-y-3 p-4">
              <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2 text-sm text-stone-700">
                {cardModalState.card.frontText}
              </div>

              <div>
                <label htmlFor="move-target" className="mb-1 block text-sm font-semibold text-stone-600">
                  目标卡片组
                </label>
                <select
                  id="move-target"
                  value={cardModalState.toDeckId}
                  onChange={(event) =>
                    setCardModalState((previous) =>
                      previous.mode === "move" ? { ...previous, toDeckId: event.target.value } : previous,
                    )
                  }
                  className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                >
                  {moveTargetDecks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </div>

              {cardModalState.formError ? (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {cardModalState.formError}
                </p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={closeCardModal}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isCardActionSubmitting}
                onClick={() => void submitMoveCard()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                确认移动
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {cardModalState.mode === "detail" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-card-title"
            className="w-full max-w-[500px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
              <div>
                <h2 id="detail-card-title" className="text-base font-bold text-amber-800">
                  卡片详情
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  下次复习：{formatDueAt(cardModalState.card.dueAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={closeCardModal}
                className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100"
              >
                ×
              </button>
            </header>

            <div className="space-y-3 p-4">
              <div>
                <p className="mb-1 text-xs font-semibold text-stone-500">中文</p>
                <p className="rounded-xl border border-stone-200 bg-[#fffdfb] px-3 py-2 text-sm text-stone-700">
                  {cardModalState.card.frontText}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-stone-500">英文</p>
                <p className="rounded-xl border border-stone-200 bg-[#fffdfb] px-3 py-2 text-sm font-semibold text-stone-700">
                  {cardModalState.card.backText}
                </p>
              </div>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-stone-200 px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { openEditModal(cardModalState.card); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-orange-300 hover:text-orange-600"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => { const card = cardModalState.card; openMoveModal(card); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-600 transition hover:border-orange-300 hover:text-orange-600"
                >
                  移动
                </button>
                <button
                  type="button"
                  onClick={() => { const card = cardModalState.card; openDeleteModal(card); }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  删除
                </button>
              </div>
              <button
                type="button"
                onClick={closeCardModal}
                className="inline-flex h-9 items-center justify-center rounded-xl bg-orange-50 px-3 text-xs font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                关闭
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {cardModalState.mode === "delete" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-card-title"
            className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="border-b border-stone-200 px-4 py-3">
              <h2 id="delete-card-title" className="text-base font-bold text-amber-800">
                删除卡片
              </h2>
              <p className="mt-1 text-xs text-stone-500">删除后不可恢复，请确认后继续。</p>
            </header>

            <div className="p-4">
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                确认删除这张卡片吗？
              </p>
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={closeCardModal}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isCardActionSubmitting}
                onClick={() => void submitDeleteCard()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                确认删除
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      {isDeckDeleteModalOpen && selectedDeck && !selectedDeck.isDefault ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-deck-title"
            className="w-full max-w-[480px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="border-b border-stone-200 px-4 py-3">
              <h2 id="delete-deck-title" className="text-base font-bold text-amber-800">
                删除卡片组
              </h2>
              <p className="mt-1 text-xs text-stone-500">删除后不可恢复，请确认后继续。</p>
            </header>

            <div className="p-4">
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                确认删除「{selectedDeck.name}」吗？该组必须为空才能删除。
              </p>
              {deckDeleteError ? (
                <p role="alert" className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {deckDeleteError}
                </p>
              ) : null}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setIsDeckDeleteModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isDeckDeleting}
                onClick={() => void handleDeleteDeck()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                确认删除
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
