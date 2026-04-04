import { useCallback, useRef, useState } from "react";
import { transcribeSpeech, type SpeechLanguage, type SpeechScene } from "../pages/speechApi";
import { useSpeechRecorder } from "./useSpeechRecorder";

type SpeechEnabledTextareaProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  language: SpeechLanguage;
  scene: SpeechScene;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
  ariaLabel?: string;
  labelClassName?: string;
  textareaClassName?: string;
  textareaRef?: React.MutableRefObject<HTMLTextAreaElement | null>;
};

export function SpeechEnabledTextarea(props: SpeechEnabledTextareaProps) {
  const {
    id,
    label,
    value,
    onChange,
    language,
    scene,
    placeholder,
    rows = 4,
    disabled = false,
    maxLength,
    ariaLabel,
    labelClassName = "block text-sm font-semibold text-stone-600",
    textareaClassName = "mt-2 w-full rounded-xl border border-stone-200 bg-[#fffdfb] p-3 text-sm leading-6 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100",
    textareaRef,
  } = props;

  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const recorder = useSpeechRecorder();

  const assignTextareaRef = useCallback(
    (element: HTMLTextAreaElement | null) => {
      internalRef.current = element;
      if (textareaRef) {
        textareaRef.current = element;
      }
    },
    [textareaRef],
  );

  const applyTranscribedText = useCallback(
    (transcribedText: string) => {
      const text = transcribedText.trim();
      if (!text) {
        return;
      }

      const textarea = internalRef.current;
      if (!value.trim()) {
        onChange(text);
        queueMicrotask(() => {
          if (!textarea) {
            return;
          }
          textarea.focus();
          const cursor = text.length;
          textarea.setSelectionRange(cursor, cursor);
        });
        return;
      }

      if (!textarea) {
        onChange(`${value}${text}`);
        return;
      }

      const start = textarea.selectionStart ?? value.length;
      const end = textarea.selectionEnd ?? value.length;
      const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;

      onChange(nextValue);
      queueMicrotask(() => {
        textarea.focus();
        const nextCursor = start + text.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [onChange, value],
  );

  async function handleSpeechToggle() {
    if (disabled || isTranscribing) {
      return;
    }
    setApiErrorMessage("");

    if (recorder.status === "recording") {
      const audio = await recorder.stopRecording();
      if (!audio) {
        return;
      }

      setIsTranscribing(true);
      try {
        const result = await transcribeSpeech({
          audio,
          language,
          scene,
        });
        applyTranscribedText(result.text);
      } catch (error) {
        if (error instanceof Error) {
          setApiErrorMessage(error.message);
        } else {
          setApiErrorMessage("语音转写失败，请稍后重试。");
        }
      } finally {
        setIsTranscribing(false);
      }
      return;
    }

    await recorder.startRecording();
  }

  const actionDisabled = disabled || isTranscribing || recorder.status === "stopping";
  const actionLabel = recorder.status === "recording" ? "停止录音" : "语音输入";
  const statusText = isTranscribing
    ? "转写中..."
    : recorder.status === "recording"
      ? "录音中..."
      : recorder.status === "stopping"
        ? "录音停止中..."
        : "";
  const errorMessage = apiErrorMessage || recorder.errorMessage;

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <textarea
        ref={assignTextareaRef}
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        maxLength={maxLength}
        className={textareaClassName}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void handleSpeechToggle()}
          disabled={actionDisabled}
          data-testid={`speech-action-${scene}`}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-50 px-3 text-xs font-semibold text-orange-600 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
        >
          {actionLabel}
        </button>
        {statusText ? <span className="text-xs text-stone-500">{statusText}</span> : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
