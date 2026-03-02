import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

describe("应用入口", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("应渲染首页主路径入口", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
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
    expect(screen.getByRole("heading", { name: "今日待复习" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始复习" })).toBeInTheDocument();
  });
});
