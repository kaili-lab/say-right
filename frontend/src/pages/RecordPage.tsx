import { useState } from "react";

import { RecordGenerateApiError, generateRecordEnglish, saveRecordWithAgent } from "./recordApi";

const MAX_SOURCE_TEXT_LENGTH = 200;
const DEFAULT_DECK_LABEL = "待保存";

type GenerateStatus = "idle" | "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

type DeckOption = {
  id: string;
  name: string;
  dueCount: number;
};

const DECK_OPTIONS: DeckOption[] = [
  { id: "deck-work", name: "工作沟通", dueCount: 6 },
  { id: "deck-daily", name: "日常口语", dueCount: 10 },
  { id: "deck-meeting", name: "英文会议", dueCount: 3 },
  { id: "deck-travel", name: "旅行应急", dueCount: 5 },
  { id: "deck-phone", name: "电话沟通", dueCount: 4 },
  { id: "deck-interview", name: "面试表达", dueCount: 7 },
  { id: "deck-product", name: "产品讨论", dueCount: 3 },
  { id: "deck-email", name: "英文邮件", dueCount: 8 },
  { id: "deck-demo", name: "客户演示", dueCount: 2 },
  { id: "deck-team", name: "团队协作", dueCount: 5 },
  { id: "deck-project", name: "项目管理", dueCount: 6 },
  { id: "deck-review", name: "复盘总结", dueCount: 4 },
  { id: "deck-default", name: "默认组", dueCount: 2 },
];

export function RecordPage() {
  const [sourceText, setSourceText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const [modelHint, setModelHint] = useState("");
  const [traceId, setTraceId] = useState("");
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>("idle");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [currentDeckName, setCurrentDeckName] = useState(DEFAULT_DECK_LABEL);
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState(DECK_OPTIONS[0]?.id ?? "");

  const canGenerate = sourceText.trim().length > 0 && generateStatus !== "loading";
  const canSave = generateStatus === "success" && generatedText.trim().length > 0 && saveStatus !== "saving";

  // 只在提交时裁剪空白，避免用户输入过程中因自动 trim 导致光标跳动。
  async function handleGenerate() {
    const normalizedSourceText = sourceText.trim();
    if (!normalizedSourceText) {
      return;
    }

    setGenerateStatus("loading");
    setErrorMessage("");

    try {
      const result = await generateRecordEnglish(normalizedSourceText);
      setGeneratedText(result.generatedText);
      setSourceSnapshot(normalizedSourceText);
      setModelHint(result.modelHint);
      setTraceId(result.traceId);
      setGenerateStatus("success");
      // 新一轮生成结果会覆盖上一轮保存上下文，避免“旧分组”误导用户。
      setSaveStatus("idle");
      setSaveMessage("");
      setCurrentDeckId(null);
      setCurrentDeckName(DEFAULT_DECK_LABEL);
    } catch (error) {
      setGenerateStatus("error");
      if (error instanceof RecordGenerateApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("网络异常，请稍后重试");
    }
  }

  async function handleSaveCard() {
    if (!sourceSnapshot) {
      return;
    }

    const normalizedGeneratedText = generatedText.trim();
    if (!normalizedGeneratedText) {
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const result = await saveRecordWithAgent({
        sourceText: sourceSnapshot,
        generatedText: normalizedGeneratedText,
      });

      setSaveStatus("saved");
      setCurrentDeckId(result.deckId);
      setCurrentDeckName(result.deckName);
      setSelectedDeckId(result.deckId);

      const fallbackTip = result.fallbackUsed ? "（已启用默认组兜底）" : "";
      setSaveMessage(`已保存到 ${result.deckName}${fallbackTip}`);
    } catch (error) {
      setSaveStatus("error");
      if (error instanceof RecordGenerateApiError) {
        setSaveMessage(`保存失败：${error.message}`);
        return;
      }
      setSaveMessage("保存失败：网络异常，请稍后重试");
    }
  }

  function openDeckModal() {
    setSelectedDeckId(currentDeckId ?? DECK_OPTIONS[0]?.id ?? "");
    setIsDeckModalOpen(true);
  }

  // 保存后只更新前端分组展示，不额外触发接口，保持操作即时反馈。
  function confirmDeckSelection() {
    const selectedDeck = DECK_OPTIONS.find((deck) => deck.id === selectedDeckId);
    if (!selectedDeck) {
      return;
    }
    setCurrentDeckId(selectedDeck.id);
    setCurrentDeckName(selectedDeck.name);
    setSaveStatus("saved");
    setSaveMessage(`已调整到 ${selectedDeck.name}`);
    setIsDeckModalOpen(false);
  }

  function handleSourceTextChange(value: string) {
    setSourceText(value.slice(0, MAX_SOURCE_TEXT_LENGTH));
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
          id="record-source-text"
          value={sourceText}
          onChange={(event) => handleSourceTextChange(event.target.value)}
          placeholder="例如：我们明天先对齐目标，再确定执行节奏"
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border border-stone-200 bg-[#fffdfb] p-3 text-sm leading-6 text-stone-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
            <p className="border-b border-stone-200 pb-3 text-sm text-stone-500">原文：{sourceSnapshot}</p>

            <label htmlFor="record-generated-text" className="sr-only">
              英文结果
            </label>
            <textarea
              id="record-generated-text"
              aria-label="英文结果"
              value={generatedText}
              onChange={(event) => setGeneratedText(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-dashed border-stone-300 bg-[#fffcf7] p-3 text-base font-semibold leading-7 text-stone-700 outline-none transition focus:border-orange-400 focus:border-solid focus:ring-2 focus:ring-orange-100"
            />
            <p className="text-xs text-stone-500">你可以直接编辑上方英文内容</p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span className="rounded-md bg-orange-50 px-2 py-1 text-orange-600">model: {modelHint}</span>
              <span className="rounded-md bg-stone-100 px-2 py-1">trace: {traceId}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
              <span className="rounded-md bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
                当前分组：{currentDeckName}
              </span>

              <button
                type="button"
                disabled={!canSave}
                onClick={() => void handleSaveCard()}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {saveStatus === "saving" ? "保存中..." : "保存卡片"}
              </button>
            </div>

            {saveStatus === "saved" ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-amber-800">
                <span>{saveMessage}</span>
                <button
                  type="button"
                  onClick={openDeckModal}
                  className="h-11 rounded-lg px-3 text-sm font-semibold text-orange-600 underline-offset-2 hover:underline"
                >
                  立即调整分组
                </button>
              </div>
            ) : null}

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
                  调整卡片组
                </h2>
                <p className="mt-1 text-xs text-stone-500">保存后可立即调整分组，减少误分组成本。</p>
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
              {DECK_OPTIONS.map((deck) => (
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
                  <span className="text-sm font-semibold text-stone-700">{deck.name}</span>
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
                onClick={confirmDeckSelection}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                确认分组
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
