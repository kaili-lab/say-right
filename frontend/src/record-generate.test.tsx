import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("record-generate", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("应支持输入中文后生成英文，并展示可编辑结果", async () => {
    const user = userEvent.setup();
    let resolveGenerateRequest: ((value: Response) => void) | undefined;

    mockFetch.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 }]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/records/generate")) {
        return new Promise<Response>((resolve) => {
          resolveGenerateRequest = resolve;
        });
      }
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "unexpected request" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    const sourceInput = screen.getByLabelText("中文内容");
    await user.clear(sourceInput);
    await user.type(sourceInput, "这个会议我需要再确认一下时间");

    await user.click(screen.getByRole("button", { name: "生成英文" }));

    expect(screen.getByRole("button", { name: "生成中..." })).toBeDisabled();

    resolveGenerateRequest?.(
      new Response(
        JSON.stringify({
          generated_text: "I need to double-check the time for this meeting.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const englishOutput = await screen.findByLabelText("英文结果");
    expect(englishOutput).toHaveValue("I need to double-check the time for this meeting.");

    await user.clear(englishOutput);
    await user.type(englishOutput, "Let me confirm this meeting time again.");
    expect(englishOutput).toHaveValue("Let me confirm this meeting time again.");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/records/generate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            source_text: "这个会议我需要再确认一下时间",
            source_lang: "zh",
            target_lang: "en",
          }),
        }),
      ),
    );
  });

  it("接口失败时应显示错误态", async () => {
    const user = userEvent.setup();

    mockFetch.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([{ id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 }]),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.endsWith("/records/generate")) {
        return Promise.resolve(
          new Response(JSON.stringify({ detail: "llm unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ detail: "unexpected request" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    const sourceInput = screen.getByLabelText("中文内容");
    await user.type(sourceInput, "我想练习商务英语");
    await user.click(screen.getByRole("button", { name: "生成英文" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("生成失败：llm unavailable");
    expect(screen.queryByLabelText("英文结果")).not.toBeInTheDocument();
  });
});
