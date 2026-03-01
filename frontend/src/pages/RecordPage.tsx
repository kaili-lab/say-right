import { useState } from "react";

import { RecordGenerateApiError, generateRecordEnglish } from "./recordApi";

const MAX_SOURCE_TEXT_LENGTH = 200;

type GenerateStatus = "idle" | "loading" | "success" | "error";

export function RecordPage() {
  const [sourceText, setSourceText] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [sourceSnapshot, setSourceSnapshot] = useState("");
  const [modelHint, setModelHint] = useState("");
  const [traceId, setTraceId] = useState("");
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const canGenerate = sourceText.trim().length > 0 && status !== "loading";

  // 只在提交时裁剪空白，避免用户输入过程中因自动 trim 导致光标跳动。
  async function handleGenerate() {
    const normalizedSourceText = sourceText.trim();
    if (!normalizedSourceText) {
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const result = await generateRecordEnglish(normalizedSourceText);
      setGeneratedText(result.generatedText);
      setSourceSnapshot(normalizedSourceText);
      setModelHint(result.modelHint);
      setTraceId(result.traceId);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      if (error instanceof RecordGenerateApiError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("网络异常，请稍后重试");
    }
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
            {status === "loading" ? "生成中..." : "生成英文"}
          </button>
        </div>
      </div>

      {status === "error" ? (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          生成失败：{errorMessage}
        </div>
      ) : null}

      {status === "success" ? (
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
          </div>
        </article>
      ) : null}
    </section>
  );
}
