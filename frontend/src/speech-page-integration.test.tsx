import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { useSpeechRecorder } from "./app/useSpeechRecorder";
import { transcribeSpeech } from "./pages/speechApi";

vi.mock("./app/useSpeechRecorder", () => ({
  useSpeechRecorder: vi.fn(),
}));

vi.mock("./pages/speechApi", () => ({
  transcribeSpeech: vi.fn(),
}));

function getRequestUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function setupRecorderMock() {
  vi.mocked(useSpeechRecorder).mockImplementation(() => ({
    status: "recording",
    errorMessage: "",
    startRecording: vi.fn(),
    stopRecording: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm" })),
  }));
}

describe("speech-page-integration", () => {
  beforeEach(() => {
    setupRecorderMock();
    vi.mocked(transcribeSpeech).mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.localStorage.setItem("say_right_session_active", "1");
  });

  it("记录页中文语音回填后不应自动触发生成", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected request" }), { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(transcribeSpeech).mockResolvedValue({
      text: "我想先练习这个句子",
      language: "zh",
      providerModel: "whisper-large-v3",
    });

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId("speech-action-record_source"));
    expect(screen.getByLabelText("中文内容")).toHaveValue("我想先练习这个句子");
    expect(fetchMock.mock.calls.some(([input]) => {
      const url = getRequestUrl(input);
      return url.endsWith("/records/generate");
    })).toBe(false);
  });

  it("记录页英文语音回填后不应自动触发保存", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/records/generate")) {
        return Promise.resolve(
          new Response(JSON.stringify({ generated_text: "Initial English." }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected request" }), { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(transcribeSpeech).mockImplementation(async (params) => {
      if (params.scene === "record_generated") {
        return {
          text: "Improved version.",
          language: "en",
          providerModel: "whisper-large-v3",
        };
      }
      return {
        text: "ignored",
        language: "zh",
        providerModel: "whisper-large-v3",
      };
    });

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("中文内容"), "请帮我生成英文");
    await user.click(screen.getByRole("button", { name: "生成英文" }));

    const englishTextarea = await screen.findByLabelText("英文结果");
    const textarea = englishTextarea as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    await user.click(screen.getByTestId("speech-action-record_generated"));

    await waitFor(() => {
      expect(englishTextarea).toHaveValue("Initial English.Improved version.");
    });
    expect(fetchMock.mock.calls.some(([input]) => {
      const url = getRequestUrl(input);
      return url.endsWith("/records/save");
    })).toBe(false);
  });

  it("复习页语音回填后仍可继续 AI 评分与手动评级", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/review/decks/deck-daily/session")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              session_id: "session-001",
              cards: [
                {
                  card_id: "card-001",
                  front_text: "你今天有空吗？",
                  back_text: "Are you free today?",
                  fsrs_state: {},
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/review/session/session-001/ai-score")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              score: 90,
              feedback: "表达准确",
              suggested_rating: "good",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/review/session/session-001/rate")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              next_due_at: "2026-04-04T12:00:00Z",
              updated_fsrs_state: {},
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/review/session/session-001/summary")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              session_id: "session-001",
              reviewed_count: 1,
              accuracy: 100,
              rating_distribution: { again: 0, hard: 0, good: 1, easy: 0 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected request" }), { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(transcribeSpeech).mockResolvedValue({
      text: "Are you free today?",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    render(
      <MemoryRouter initialEntries={["/review/session/deck-daily"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(await screen.findByTestId("speech-action-review_answer"));
    await waitFor(() => {
      expect(screen.getByLabelText("你的英文答案")).toHaveValue("Are you free today?");
    });

    await user.click(screen.getByRole("button", { name: "AI 评分" }));
    expect(await screen.findByText("AI 评分：90")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Good" }));
    await user.click(screen.getByRole("button", { name: "下一张" }));
    expect(await screen.findByRole("heading", { name: "本轮复习完成" })).toBeInTheDocument();
  });

  it("卡片编辑 front/back 支持语音，Deck 创建弹窗不出现语音入口", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = getRequestUrl(input);
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
              { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/decks/deck-work/cards")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: "card-001",
                deck_id: "deck-work",
                front_text: "旧中文",
                back_text: "Old English",
                source_lang: "zh",
                target_lang: "en",
                due_at: "2026-04-04T12:00:00Z",
                stability: 1,
                difficulty: 3,
                reps: 0,
                lapses: 0,
              },
            ]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/cards/card-001")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "card-001",
              deck_id: "deck-work",
              front_text: "新的中文",
              back_text: "New English",
              source_lang: "zh",
              target_lang: "en",
              due_at: "2026-04-04T12:00:00Z",
              stability: 1,
              difficulty: 3,
              reps: 0,
              lapses: 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ detail: "unexpected request" }), { status: 500 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(transcribeSpeech).mockImplementation(async (params) => {
      if (params.scene === "card_front") {
        return {
          text: "新的中文",
          language: "zh",
          providerModel: "whisper-large-v3",
        };
      }
      return {
        text: "New English",
        language: "en",
        providerModel: "whisper-large-v3",
      };
    });

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole("button", { name: /工作沟通/ }));
    await screen.findByText("旧中文");
    await user.click(screen.getByRole("button", { name: "编辑" }));

    const editDialog = await screen.findByRole("dialog", { name: "编辑卡片" });
    const frontTextarea = within(editDialog).getByLabelText("中文") as HTMLTextAreaElement;
    const backTextarea = within(editDialog).getByLabelText("英文") as HTMLTextAreaElement;
    frontTextarea.focus();
    frontTextarea.setSelectionRange(0, frontTextarea.value.length);
    backTextarea.focus();
    backTextarea.setSelectionRange(0, backTextarea.value.length);
    await user.click(within(editDialog).getByTestId("speech-action-card_front"));
    await user.click(within(editDialog).getByTestId("speech-action-card_back"));

    await waitFor(() => {
      expect(screen.getByLabelText("中文")).toHaveValue("新的中文");
      expect(screen.getByLabelText("英文")).toHaveValue("New English");
    });

    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:8787/cards/card-001",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            front_text: "新的中文",
            back_text: "New English",
          }),
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: "+ 创建卡片组" }));
    const createDialog = await screen.findByRole("dialog", { name: "创建卡片组" });
    expect(within(createDialog).queryByRole("button", { name: "语音输入" })).not.toBeInTheDocument();
    expect(within(createDialog).queryByRole("button", { name: "停止录音" })).not.toBeInTheDocument();
  });

  it("登录页不应出现语音入口", async () => {
    window.localStorage.removeItem("say_right_session_active");

    render(
      <MemoryRouter initialEntries={["/auth/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "语音输入" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "停止录音" })).not.toBeInTheDocument();
  });
});
