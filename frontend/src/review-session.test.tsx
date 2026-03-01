import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("review-session", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("应支持单卡推进并在结束后显示总结页", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: "session-001",
            cards: [
              {
                card_id: "card-001",
                front_text: "这个我再想想。",
                back_text: "Let me think about this.",
                fsrs_state: {},
              },
              {
                card_id: "card-002",
                front_text: "我晚点给你回复。",
                back_text: "I will get back to you later.",
                fsrs_state: {},
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next_due_at: "2026-03-02T10:00:00Z",
            updated_fsrs_state: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next_due_at: "2026-03-02T11:00:00Z",
            updated_fsrs_state: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/review/session/deck-daily"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "复习 Session" })).toBeInTheDocument();
    expect(screen.getByText("这个我再想想。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Good" }));
    await user.click(screen.getByRole("button", { name: "下一张" }));

    expect(await screen.findByText("我晚点给你回复。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Again" }));
    await user.click(screen.getByRole("button", { name: "下一张" }));

    expect(await screen.findByRole("heading", { name: "本轮复习完成" })).toBeInTheDocument();
    expect(screen.getByText("总卡片")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("应支持 AI 建议与手动评级并行，手动覆盖时按 manual 提交", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            session_id: "session-002",
            cards: [
              {
                card_id: "card-101",
                front_text: "你今天有空吗？",
                back_text: "Are you free today?",
                fsrs_state: {},
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            score: 82,
            feedback: "表达自然，语法正确。",
            suggested_rating: "good",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next_due_at: "2026-03-03T09:00:00Z",
            updated_fsrs_state: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/review/session/deck-daily"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "复习 Session" });
    await user.type(screen.getByLabelText("你的英文答案"), "Are you available today?");
    await user.click(screen.getByRole("button", { name: "AI 评分" }));

    expect(await screen.findByText("AI 评分：82")).toBeInTheDocument();
    expect(screen.getByText(/建议档位：Good/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Again" }));
    await user.click(screen.getByRole("button", { name: "下一张" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(
        "http://127.0.0.1:8000/review/session/session-002/rate",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            card_id: "card-101",
            rating_source: "manual",
            rating_value: "again",
            user_answer: "Are you available today?",
          }),
        }),
      ),
    );
  });
});
