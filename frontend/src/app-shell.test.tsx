import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

describe("app-shell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("手机端五个导航入口可见（含我的），首页默认高亮", async () => {
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
    const home = screen.getAllByRole("link", { name: "首页" })[0];
    expect(home).toBeInTheDocument();
    expect(home).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByRole("link", { name: "记录" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "复习" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "卡片组" })[0]).toBeInTheDocument();

    // 移动端"我的"Tab（仅出现在底部导航）
    const meLinks = screen.getAllByRole("link", { name: "我的" });
    expect(meLinks.length).toBeGreaterThanOrEqual(1);

    // 底部导航应有 5 格
    const bottomNav = screen.getByTestId("bottom-nav");
    expect(bottomNav).toHaveClass("grid-cols-5");
  });

  it("桌面端使用 viewport 锁定并在 main 内滚动", async () => {
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

    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "还没有学习卡片" });

    const shellRoot = container.firstElementChild;
    expect(shellRoot).toHaveClass("md:h-screen");
    expect(shellRoot).toHaveClass("md:flex");
    expect(shellRoot).toHaveClass("md:flex-col");
    expect(shellRoot).toHaveClass("md:overflow-hidden");

    const main = container.querySelector("main");
    expect(main).toHaveClass("md:flex-1");
    expect(main).toHaveClass("md:overflow-y-auto");
    expect(main).toHaveClass("md:min-h-0");
  });
});
