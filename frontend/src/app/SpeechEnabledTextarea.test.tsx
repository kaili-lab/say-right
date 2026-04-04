import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpeechEnabledTextarea } from "./SpeechEnabledTextarea";
import { useSpeechRecorder } from "./useSpeechRecorder";
import { transcribeSpeech } from "../pages/speechApi";

vi.mock("./useSpeechRecorder", () => ({
  useSpeechRecorder: vi.fn(),
}));

vi.mock("../pages/speechApi", () => ({
  transcribeSpeech: vi.fn(),
}));

type SpeechTextareaProps = Parameters<typeof SpeechEnabledTextarea>[0];

function makeRecorderMock(overrides?: Partial<ReturnType<typeof useSpeechRecorder>>) {
  return {
    status: "idle",
    errorMessage: "",
    startRecording: vi.fn(),
    stopRecording: vi.fn().mockResolvedValue(new Blob(["audio"], { type: "audio/webm" })),
    ...(overrides ?? {}),
  } as ReturnType<typeof useSpeechRecorder>;
}

function StatefulTextarea(props?: Partial<SpeechTextareaProps>) {
  const [value, setValue] = useState(props?.value ?? "");

  return (
    <SpeechEnabledTextarea
      id={props?.id ?? "speech-input"}
      label={props?.label ?? "测试输入"}
      value={value}
      onChange={(next) => setValue(next)}
      language={props?.language ?? "en"}
      scene={props?.scene ?? "review_answer"}
      placeholder={props?.placeholder}
      rows={props?.rows}
      ariaLabel={props?.ariaLabel}
      labelClassName={props?.labelClassName}
      textareaClassName={props?.textareaClassName}
      textareaRef={props?.textareaRef}
      disabled={props?.disabled}
      maxLength={props?.maxLength}
    />
  );
}

type TranscribeResult = Awaited<ReturnType<typeof transcribeSpeech>>;

describe("SpeechEnabledTextarea", () => {
  beforeEach(() => {
    vi.mocked(transcribeSpeech).mockReset();
    vi.mocked(useSpeechRecorder).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("录音中应展示状态文案", () => {
    vi.mocked(useSpeechRecorder).mockReturnValue(
      makeRecorderMock({
        status: "recording",
      }),
    );

    render(
      <StatefulTextarea
        label="你的英文答案"
        ariaLabel="你的英文答案"
      />,
    );

    expect(screen.getByText("录音中...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "停止录音" })).toBeInTheDocument();
  });

  it("点击停止录音后应展示转写中状态", async () => {
    const recorder = makeRecorderMock({
      status: "recording",
    });
    vi.mocked(useSpeechRecorder).mockReturnValue(recorder);

    let resolveTranscribe: ((value: TranscribeResult) => void) | undefined;
    vi.mocked(transcribeSpeech).mockImplementation(
      () =>
        new Promise<TranscribeResult>((resolve) => {
          resolveTranscribe = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<StatefulTextarea ariaLabel="你的英文答案" />);

    await user.click(screen.getByRole("button", { name: "停止录音" }));
    expect(screen.getByText("转写中...")).toBeInTheDocument();

    if (!resolveTranscribe) {
      throw new Error("transcribe resolver was not initialized");
    }
    resolveTranscribe({
      text: "hello",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    await waitFor(() => {
      expect(screen.queryByText("转写中...")).not.toBeInTheDocument();
    });
  });

  it("转写失败时应展示错误提示", async () => {
    const recorder = makeRecorderMock({
      status: "recording",
    });
    vi.mocked(useSpeechRecorder).mockReturnValue(recorder);
    vi.mocked(transcribeSpeech).mockRejectedValue(new Error("provider unavailable"));

    const user = userEvent.setup();
    render(<StatefulTextarea ariaLabel="你的英文答案" />);

    await user.click(screen.getByRole("button", { name: "停止录音" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("provider unavailable");
  });

  it("空文本时应直接填入转写结果", async () => {
    const recorder = makeRecorderMock({
      status: "recording",
    });
    vi.mocked(useSpeechRecorder).mockReturnValue(recorder);
    vi.mocked(transcribeSpeech).mockResolvedValue({
      text: "Hello world",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    const user = userEvent.setup();
    render(<StatefulTextarea ariaLabel="你的英文答案" />);

    await user.click(screen.getByRole("button", { name: "停止录音" }));
    await waitFor(() => {
      expect(screen.getByLabelText("你的英文答案")).toHaveValue("Hello world");
    });
  });

  it("有光标时应在光标位置插入转写结果", async () => {
    const recorder = makeRecorderMock({
      status: "recording",
    });
    vi.mocked(useSpeechRecorder).mockReturnValue(recorder);
    vi.mocked(transcribeSpeech).mockResolvedValue({
      text: "world",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    const user = userEvent.setup();
    render(
      <StatefulTextarea
        value="Hello !"
        ariaLabel="你的英文答案"
      />,
    );
    const textarea = screen.getByLabelText("你的英文答案") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(6, 6);

    await user.click(screen.getByRole("button", { name: "停止录音" }));
    await waitFor(() => {
      expect(textarea).toHaveValue("Hello world!");
    });
  });

  it("有选区时应替换选区内容", async () => {
    const recorder = makeRecorderMock({
      status: "recording",
    });
    vi.mocked(useSpeechRecorder).mockReturnValue(recorder);
    vi.mocked(transcribeSpeech).mockResolvedValue({
      text: "dogs",
      language: "en",
      providerModel: "whisper-large-v3",
    });

    const user = userEvent.setup();
    render(
      <StatefulTextarea
        value="I like cats"
        ariaLabel="你的英文答案"
      />,
    );

    const textarea = screen.getByLabelText("你的英文答案") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(7, 11);

    await user.click(screen.getByRole("button", { name: "停止录音" }));
    await waitFor(() => {
      expect(textarea).toHaveValue("I like dogs");
    });
  });
});
