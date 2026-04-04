import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeechRecorder } from "./useSpeechRecorder";

class MockMediaRecorder {
  static stopCallCount = 0;
  static lastMimeType: string | null = null;
  static supportedMimeTypes = new Set<string>(["audio/webm;codecs=opus", "audio/webm"]);

  static isTypeSupported(mimeType: string) {
    return MockMediaRecorder.supportedMimeTypes.has(mimeType);
  }

  public state: RecordingState = "inactive";
  public mimeType = "audio/webm";
  public ondataavailable: ((event: BlobEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onstop: ((event: Event) => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    MockMediaRecorder.lastMimeType = options?.mimeType ?? null;
    if (options?.mimeType) {
      this.mimeType = options.mimeType;
    }
  }

  start() {
    this.state = "recording";
  }

  stop() {
    if (this.state === "inactive") {
      return;
    }
    this.state = "inactive";
    MockMediaRecorder.stopCallCount += 1;
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["audio"], { type: this.mimeType }) } as BlobEvent);
      this.onstop?.(new Event("stop"));
    });
  }
}

function createMockStream(trackStop = vi.fn()) {
  return {
    stream: {
      getTracks: () => [
        {
          stop: trackStop,
        } as unknown as MediaStreamTrack,
      ],
    } as unknown as MediaStream,
    trackStop,
  };
}

describe("useSpeechRecorder", () => {
  beforeEach(() => {
    MockMediaRecorder.stopCallCount = 0;
    MockMediaRecorder.lastMimeType = null;
    MockMediaRecorder.supportedMimeTypes = new Set(["audio/webm;codecs=opus", "audio/webm"]);
    vi.stubGlobal("MediaRecorder", MockMediaRecorder as unknown as typeof MediaRecorder);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("应支持开始录音、停止录音并产出 Blob", async () => {
    const { stream, trackStop } = createMockStream();
    const getUserMediaMock = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });

    const { result } = renderHook(() => useSpeechRecorder());

    await act(async () => {
      await result.current.startRecording();
    });
    expect(result.current.status).toBe("recording");

    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.stopRecording();
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(result.current.status).toBe("idle");
    expect(trackStop).toHaveBeenCalledTimes(1);
  });

  it("权限拒绝时应进入 error 状态并返回中文错误", async () => {
    const getUserMediaMock = vi
      .fn()
      .mockRejectedValue(new DOMException("permission denied", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });

    const { result } = renderHook(() => useSpeechRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toContain("麦克风权限被拒绝");
  });

  it("超时后应自动停止录音", async () => {
    vi.useFakeTimers();
    const { stream } = createMockStream();
    const getUserMediaMock = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });

    const { result } = renderHook(() => useSpeechRecorder({ maxDurationMs: 1000 }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.status).toBe("recording");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1001);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.status).toBe("idle");
    expect(MockMediaRecorder.stopCallCount).toBe(1);
  });

  it("重复点击开始时应保护为单次 getUserMedia 请求", async () => {
    const { stream } = createMockStream();
    const getUserMediaMock = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });

    const { result } = renderHook(() => useSpeechRecorder());

    await act(async () => {
      await Promise.all([result.current.startRecording(), result.current.startRecording()]);
    });

    expect(getUserMediaMock).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("recording");
  });

  it("prefers explicit mimeType when supported", async () => {
    const { stream } = createMockStream();
    const getUserMediaMock = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });
    MockMediaRecorder.supportedMimeTypes = new Set(["audio/mp4"]);

    const { result } = renderHook(() => useSpeechRecorder({ mimeType: "audio/mp4" }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(MockMediaRecorder.lastMimeType).toBe("audio/mp4");
  });

  it("falls back to first supported candidate when preferred mimeType is unsupported", async () => {
    const { stream } = createMockStream();
    const getUserMediaMock = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: getUserMediaMock,
      },
      configurable: true,
    });
    MockMediaRecorder.supportedMimeTypes = new Set(["audio/webm"]);

    const { result } = renderHook(() => useSpeechRecorder({ mimeType: "audio/mp4" }));

    await act(async () => {
      await result.current.startRecording();
    });

    expect(MockMediaRecorder.lastMimeType).toBe("audio/webm");
  });
});
