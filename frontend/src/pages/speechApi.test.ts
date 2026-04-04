import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setRedirectToLoginForTest, clearSession } from "./authApi";
import { SpeechApiError, transcribeSpeech } from "./speechApi";

describe("speechApi", () => {
  let redirectCount = 0;

  beforeEach(() => {
    clearSession();
    redirectCount = 0;
    __setRedirectToLoginForTest(() => {
      redirectCount += 1;
    });
  });

  afterEach(() => {
    clearSession();
    __setRedirectToLoginForTest(null);
  });

  it("应上传 multipart/form-data 并映射成功返回", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "hello world",
          language: "en",
          provider_model: "whisper-large-v3",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const result = await transcribeSpeech(
      {
        audio: new Blob(["audio-data"], { type: "audio/webm" }),
        language: "en",
        scene: "review_answer",
      },
      fetchMock,
    );

    expect(result).toEqual({
      text: "hello world",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("http://localhost:8787/speech/transcribe");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");

    const form = init?.body as FormData;
    expect(form.get("scene")).toBe("review_answer");
    expect(form.get("language")).toBe("en");
    const file = form.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("speech.webm");
    expect((file as File).type).toBe("audio/webm");
  });

  it("audio/mp4 should be uploaded as speech.m4a", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "hello world",
          language: "en",
          provider_model: "whisper-large-v3",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await transcribeSpeech(
      {
        audio: new Blob(["audio-data"], { type: "audio/mp4" }),
        language: "en",
        scene: "review_answer",
      },
      fetchMock,
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const form = init?.body as FormData;
    const file = form.get("file") as File;
    expect(file.name).toBe("speech.m4a");
    expect(file.type).toBe("audio/mp4");
  });

  it("422 应提取 detail 数组内的 msg", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: [{ msg: "language must be one of: zh, en" }],
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await expect(
      transcribeSpeech(
        {
          audio: new Blob(["audio-data"], { type: "audio/webm" }),
          language: "en",
          scene: "review_answer",
        },
        fetchMock,
      ),
    ).rejects.toMatchObject({
      name: "SpeechApiError",
      status: 422,
      message: "language must be one of: zh, en",
    });
  });

  it("401 应透出状态码并触发登录跳转", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ detail: "unauthorized" }), { status: 401 }));

    await expect(
      transcribeSpeech(
        {
          audio: new Blob(["audio-data"], { type: "audio/webm" }),
          language: "zh",
          scene: "record_source",
        },
        fetchMock,
      ),
    ).rejects.toEqual(new SpeechApiError("unauthorized", 401));

    expect(redirectCount).toBe(1);
  });

  it("503 应透出 provider 错误信息", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ detail: "provider unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      transcribeSpeech(
        {
          audio: new Blob(["audio-data"], { type: "audio/webm" }),
          language: "en",
          scene: "review_answer",
        },
        fetchMock,
      ),
    ).rejects.toMatchObject({
      name: "SpeechApiError",
      status: 503,
      message: "provider unavailable",
    });
  });

  it("非 JSON 错误体应回退通用文案", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("bad gateway", {
        status: 502,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(
      transcribeSpeech(
        {
          audio: new Blob(["audio-data"], { type: "audio/webm" }),
          language: "zh",
          scene: "card_front",
        },
        fetchMock,
      ),
    ).rejects.toMatchObject({
      name: "SpeechApiError",
      status: 502,
      message: "request failed with status 502",
    });
  });
});
