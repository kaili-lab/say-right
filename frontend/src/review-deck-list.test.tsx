import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("review-deck-list", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("应渲染按待复习数排序的 Deck 列表并可进入指定 Deck", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { deck_id: "deck-meeting", deck_name: "英文会议", due_count: 3 },
          { deck_id: "deck-daily", deck_name: "日常口语", due_count: 10 },
          { deck_id: "deck-work", deck_name: "工作沟通", due_count: 6 },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/review"]}>
        <App />
      </MemoryRouter>,
    );

    const deckList = await screen.findByTestId("review-deck-list");
    const deckItems = within(deckList).getAllByRole("article");
    expect(deckItems).toHaveLength(3);

    expect(within(deckItems[0]).getByText(/日常口语/)).toBeInTheDocument();
    expect(within(deckItems[1]).getByText(/工作沟通/)).toBeInTheDocument();
    expect(within(deckItems[2]).getByText(/英文会议/)).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "进入 Deck 日常口语" }));

    expect(await screen.findByRole("heading", { name: "复习 Session（占位）" })).toBeInTheDocument();
    expect(screen.getByText("当前 Deck：deck-daily")).toBeInTheDocument();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/review/decks",
        expect.objectContaining({ method: "GET" }),
      ),
    );
  });

  it("空状态应显示去记录新内容入口", async () => {
    render(
      <MemoryRouter initialEntries={["/review?state=empty"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "暂无待复习内容" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去记录新内容" })).toBeInTheDocument();
  });
});
