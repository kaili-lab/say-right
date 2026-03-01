import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

describe("app-shell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("四个主导航入口可见且首页默认高亮", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            study_days: 0,
            mastered_count: 0,
            total_cards: 0,
            total_due: 0,
            recent_decks: [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "还没有学习卡片" });
    const home = screen.getAllByRole("link", { name: "首页" })[0];
    expect(home).toBeInTheDocument();
    expect(home).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByRole("link", { name: "记录" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "复习" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "卡片组" })[0]).toBeInTheDocument();
  });
});
