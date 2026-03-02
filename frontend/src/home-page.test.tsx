import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("home-page", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("首页应展示主路径卡片与统计信息，并可跳转复习页", async () => {
    const user = userEvent.setup();
    mockFetch.mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/dashboard/home-summary")) {
        return new Response(
          JSON.stringify({
            display_name: "Kai",
            insight: "每天复习一点点，记得更久。",
            study_days: 5,
            mastered_count: 28,
            total_cards: 40,
            total_due: 21,
            recent_decks: [
              { id: "deck-travel", name: "Travel", due_count: 12 },
              { id: "deck-daily", name: "Daily Conversation", due_count: 6 },
              { id: "deck-work", name: "Work Email", due_count: 3 },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.endsWith("/review/decks")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ detail: "unexpected request" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "今日待复习" })).toBeInTheDocument();
    expect(screen.getByText("Welcome Stats")).toBeInTheDocument();
    expect(await screen.findByText("你知道吗？")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "开始复习" }));

    expect(screen.getByRole("heading", { name: "今日复习总览" })).toBeInTheDocument();
  });

  it("首页空状态应展示创建第一张卡片入口", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          display_name: "Kai",
          insight: "每天复习一点点，记得更久。",
          study_days: 0,
          mastered_count: 0,
          total_cards: 0,
          total_due: 0,
          recent_decks: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "还没有学习卡片" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "创建第一张卡片" })).toBeInTheDocument();
  });
});
