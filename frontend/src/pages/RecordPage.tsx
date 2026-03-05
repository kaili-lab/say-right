import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDecks } from "./decksApi";
import { RecordGenerateApiError, generateRecordEnglish, saveRecordToDeck } from "./recordApi";

const MAX_SOURCE_TEXT_LENGTH = 200;
const MAX_TEXTAREA_ROWS = 4;
const LINE_HEIGHT_PX = 24; // leading-6 = 1.5rem = 24px at 16px base

type GenerateStatus = "idle" | "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";
type DeckLoadStatus = "loading" | "ready" | "error";

type DeckOption = {
  id: string;
  name: string;
  isDefault: boolean;
  dueCount: number;
};

/** 根据内容动态调整 textarea 高度（最多 MAX_TEXTAREA_ROWS 行）。 */
function syncHeight(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  const maxHeight = LINE_HEIGHT_PX * MAX_TEXTAREA_ROWS + 24; // 24px = padding (p-3 = 12px * 2)
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
}

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      syncHeight(ref.current);
    }
  }, [value]);

  return ref;
}

export function RecordPage() {
  const [sourceText, setSourceText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [savedDeckName, setSavedDeckName] = useState("");
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [deckOptions, setDeckOptions] = useState<DeckOption[]>([]);
  const [deckLoadStatus, setDeckLoadStatus] = useState<DeckLoadStatus>("loading");
  const [deckLoadError, setDeckLoadError] = useState("");

  const sourceRef = useAutoResize(sourceText);
  const generatedRef = useAutoResize(generatedText);

  useEffect(() => {
    let disposed = false;

    async function loadDeckOptions() {
      setDeckLoadStatus("loading");
      setDeckLoadError("");
      try {
        const decks = await fetchDecks();
        if (disposed) return;
        const nextOptions = decks.map((deck) => ({
          id: deck.id,
          name: deck.name,
          isDefault: deck.isDefault,
          dueCount: deck.dueCount,
        }));
        setDeckOptions(nextOptions);
        // 默认选中 isDefault=true 的组，没有则选第一项。
        const defaultDeck = nextOptions.find((d) => d.isDefault) ?? nextOptions[0];
        setSelectedDeckId(defaultDeck?.id ?? "");
        setDeckLoadStatus("ready");
      } catch (error) {
        if (disposed) return;
        setDeckLoadStatus("error");
        setDeckLoadError(error instanceof Error ? error.message : "卡片组加载失败，请稍后重试");
      }
    }

    void loadDeckOptions();
    return () => { disposed = true; };
  }, []);

  const isSaved = saveStatus === "saved";
  const canGenerate = sourceText.trim().length > 0 && generateStatus !== "loading" && !isSaved;
  const canSave =
    generateStatus === "success" &&
    generatedText.trim().length > 0 &&
    !isSaved &&
    saveStatus !== "saving";

  async function handleGenerate() {
    const normalizedSourceText = sourceText.trim();
    if (!normalizedSourceText) return;

    setGenerateStatus("loading");
    setErrorMessage("");
    setSaveStatus("idle");
    setSaveMessage("");

    try {
      const result = await generateRecordEnglish(normalizedSourceText);
      setGeneratedText(result.generatedText);
      setSourceSnapshot(normalizedSourceText);
      setGenerateStatus("success");
    } catch (error) {
      setGenerateStatus("error");
      setErrorMessage(error instanceof RecordGenerateApiError ? error.message : "网络异常，请稍后重试");
    }
  }

  function openSaveDeckModal() {
    if (deckOptions.length === 0) return;
    // 重置为 default deck（每次点保存都重置选择，避免上次选中残留）。
    const defaultDeck = deckOptions.find((d) => d.isDefault) ?? deckOptions[0];
    setSelectedDeckId(defaultDeck?.id ?? "");
    setIsDeckModalOpen(true);
  }

  const handleConfirmSave = useCallback(async () => {
    const targetDeck = deckOptions.find((d) => d.id === selectedDeckId);
    if (!targetDeck || !sourceSnapshot) return;

    setIsDeckModalOpen(false);
    setSaveStatus("saving");
    setSaveMessage("");

    try {
      await saveRecordToDeck({
        sourceText: sourceSnapshot,
        generatedText: generatedText.trim(),
        deckId: selectedDeckId,
      });
      setSaveStatus("saved");
      setSavedDeckName(targetDeck.name);
      setSaveMessage(`已保存到 ${targetDeck.name}`);
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof RecordGenerateApiError ? `保存失败：${error.message}` : "保存失败：网络异常，请稍后重试",
      );
    }
  }, [deckOptions, generatedText, selectedDeckId, sourceSnapshot]);

  function handleSourceTextChange(value: string) {
    setSourceText(value.slice(0, MAX_SOURCE_TEXT_LENGTH));
    if (saveStatus === "saved") {
      setSaveStatus("idle");
      setSaveMessage("");
    }
  }

  return (
    <section className="mx-auto w-full max-w-[640px]">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-amber-800">记录新表达</h1>
        <p className="mt-1 text-sm text-stone-600">输入你想说的中文，AI 帮你转化为地道英文。</p>
      </header>

      <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <label htmlFor="record-source-text" className="block text-sm font-semibold text-stone-600">
          中文内容
        </label>
        <textarea
          ref={sourceRef}
          id="record-source-text"
          value={sourceText}
          onChange={(event) => handleSourceTextChange(event.target.value)}
          placeholder="例如：我们明天先对齐目标，再确定执行节奏"
          rows={1}
          className="mt-2 w-full resize-none overflow-hidden rounded-xl border border-stone-200 bg-[#fffdfb] p-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-stone-500">
            {sourceText.length}/{MAX_SOURCE_TEXT_LENGTH}
          </span>
          <button
            type="button"
            disabled={!canGenerate}
            onClick={() => void handleGenerate()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {generateStatus === "loading" ? "生成中..." : "生成英文"}
          </button>
        </div>
      </div>

      {generateStatus === "error" ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          生成失败：{errorMessage}
        </div>
      ) : null}

      {generateStatus === "success" ? (
        <article className="mt-4 overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-orange-50/80 px-6 py-3 text-sm font-semibold text-orange-600">
            英文生成完成
          </div>

          <div className="space-y-3 p-6">
            <label htmlFor="record-generated-text" className="sr-only">
              英文结果
            </label>
            <textarea
              ref={generatedRef}
              id="record-generated-text"
              aria-label="英文结果"
              value={generatedText}
              readOnly={isSaved}
              onChange={(event) => setGeneratedText(event.target.value)}
              rows={1}
              className={`w-full resize-none overflow-hidden rounded-xl border border-dashed p-3 text-base font-semibold leading-6 text-stone-700 outline-none transition ${
                isSaved
                  ? "border-stone-200 bg-stone-50 text-stone-500"
                  : "border-stone-300 bg-[#fffcf7] focus:border-orange-400 focus:border-solid focus:ring-2 focus:ring-orange-100"
              }`}
            />
            <div className="flex items-center justify-between gap-3 border-t border-stone-200 pt-3">
              {isSaved ? (
                <p className="text-sm text-amber-800">
                  已保存到{" "}
                  <span className="inline-flex items-center rounded-md bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                    {savedDeckName}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-stone-500">你可以直接编辑上方英文内容</p>
              )}
              <button
                type="button"
                disabled={!canSave}
                onClick={openSaveDeckModal}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {saveStatus === "saving" ? "保存中..." : "保存卡片"}
              </button>
            </div>

            {saveStatus === "error" ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {saveMessage}
              </div>
            ) : null}
          </div>
        </article>
      ) : null}

      {isDeckModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="deck-modal-title"
            className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl"
          >
            <header className="flex items-start justify-between gap-2 border-b border-stone-200 px-4 py-3">
              <div>
                <h2 id="deck-modal-title" className="text-base font-bold text-amber-800">
                  选择卡片组
                </h2>
                <p className="mt-1 text-xs text-stone-500">选择要保存到的卡片组。</p>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setIsDeckModalOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100"
              >
                ×
              </button>
            </header>

            <div data-testid="deck-modal-list" className="max-h-72 overflow-y-auto px-4 py-2">
              {deckLoadStatus === "loading" ? <p className="px-2 py-4 text-sm text-stone-500">正在加载卡片组...</p> : null}
              {deckLoadStatus === "error" ? (
                <p role="alert" className="px-2 py-4 text-sm text-red-700">
                  加载失败：{deckLoadError}
                </p>
              ) : null}
              {deckLoadStatus === "ready" && deckOptions.length === 0 ? (
                <p className="px-2 py-4 text-sm text-stone-500">暂无可选卡片组。</p>
              ) : null}
              {deckOptions.map((deck) => (
                <label
                  key={deck.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-orange-50"
                >
                  <input
                    type="radio"
                    name="deck-option"
                    checked={selectedDeckId === deck.id}
                    onChange={() => setSelectedDeckId(deck.id)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-sm font-semibold text-stone-700">
                    {deck.name}
                    {deck.isDefault ? <span className="ml-1 text-xs font-normal text-stone-400">（默认）</span> : null}
                  </span>
                  <span className="text-xs font-semibold text-orange-600">待复习 {deck.dueCount}</span>
                </label>
              ))}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
              <button
                type="button"
                onClick={() => setIsDeckModalOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-50 px-4 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedDeckId}
                onClick={() => void handleConfirmSave()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                确认保存
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
