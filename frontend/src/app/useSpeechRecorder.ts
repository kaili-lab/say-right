import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechRecorderStatus = "idle" | "recording" | "stopping" | "error";

const DEFAULT_MAX_DURATION_MS = 15_000;
const DEFAULT_RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mpeg",
] as const;

function pickSupportedRecorderMimeType(preferred?: string) {
  const recorderCtor = globalThis.MediaRecorder as
    | (typeof MediaRecorder & { isTypeSupported?: (mimeType: string) => boolean })
    | undefined;

  if (!recorderCtor || typeof recorderCtor.isTypeSupported !== "function") {
    return preferred?.trim() ? preferred.trim() : null;
  }

  const normalizedPreferred = preferred?.trim();
  if (normalizedPreferred && recorderCtor.isTypeSupported(normalizedPreferred)) {
    return normalizedPreferred;
  }

  for (const candidate of DEFAULT_RECORDER_MIME_CANDIDATES) {
    if (recorderCtor.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return null;
}

function mapRecorderError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "麦克风权限被拒绝，请在浏览器设置中允许后重试。";
    }
    if (error.name === "NotFoundError") {
      return "未检测到可用麦克风设备。";
    }
  }
  return "录音启动失败，请稍后重试。";
}

export function useSpeechRecorder(options?: {
  maxDurationMs?: number;
  mimeType?: string;
}) {
  const [status, setStatus] = useState<SpeechRecorderStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const statusRef = useRef<SpeechRecorderStatus>("idle");
  const isStartingRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const pendingStopRef = useRef<Promise<Blob | null> | null>(null);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);

  const maxDurationMs = options?.maxDurationMs ?? DEFAULT_MAX_DURATION_MS;

  const syncStatus = useCallback((nextStatus: SpeechRecorderStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    for (const track of stream.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  const resetRecorder = useCallback(() => {
    recorderRef.current = null;
    chunksRef.current = [];
    pendingStopRef.current = null;
    resolveStopRef.current = null;
  }, []);

  const setRecorderError = useCallback(
    (message: string) => {
      clearTimer();
      releaseStream();
      resetRecorder();
      setErrorMessage(message);
      syncStatus("error");
    },
    [clearTimer, releaseStream, resetRecorder, syncStatus],
  );

  const stopRecording = useCallback(async () => {
    if (statusRef.current === "stopping") {
      return pendingStopRef.current;
    }

    const recorder = recorderRef.current;
    if (!recorder || statusRef.current !== "recording") {
      return null;
    }

    syncStatus("stopping");
    clearTimer();

    try {
      recorder.stop();
    } catch {
      setRecorderError("录音停止失败，请重试。");
      return null;
    }

    return pendingStopRef.current;
  }, [clearTimer, setRecorderError, syncStatus]);

  const startRecording = useCallback(async () => {
    if (isStartingRef.current || statusRef.current === "recording" || statusRef.current === "stopping") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecorderError("当前浏览器不支持语音录制。");
      return;
    }

    clearTimer();
    setErrorMessage("");
    isStartingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const selectedMimeType = pickSupportedRecorderMimeType(options?.mimeType);
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      pendingStopRef.current = new Promise<Blob | null>((resolve) => {
        resolveStopRef.current = resolve;
      });

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecorderError("录音过程中发生错误，请重试。");
      };

      recorder.onstop = () => {
        const blob =
          chunksRef.current.length > 0
            ? new Blob(chunksRef.current, {
                type: recorder.mimeType || selectedMimeType || "audio/webm",
              })
            : null;

        clearTimer();
        releaseStream();
        resolveStopRef.current?.(blob);
        resetRecorder();
        setErrorMessage("");
        syncStatus("idle");
      };

      recorder.start();
      syncStatus("recording");

      if (maxDurationMs > 0) {
        timeoutRef.current = window.setTimeout(() => {
          if (statusRef.current === "recording") {
            void stopRecording();
          }
        }, maxDurationMs);
      }
    } catch (error) {
      setRecorderError(mapRecorderError(error));
    } finally {
      isStartingRef.current = false;
    }
  }, [
    clearTimer,
    maxDurationMs,
    options?.mimeType,
    releaseStream,
    resetRecorder,
    setRecorderError,
    stopRecording,
    syncStatus,
  ]);

  useEffect(() => {
    return () => {
      clearTimer();

      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // 组件卸载时只做资源释放，不向外抛错。
        }
      }

      resolveStopRef.current?.(null);
      releaseStream();
      resetRecorder();
    };
  }, [clearTimer, releaseStream, resetRecorder]);

  return {
    status,
    errorMessage,
    startRecording,
    stopRecording,
  };
}
