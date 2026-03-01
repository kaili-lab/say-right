import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

describe("app-shell", () => {
  it("四个主导航入口可见且首页默认高亮", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const home = screen.getAllByRole("link", { name: "首页" })[0];
    expect(home).toBeInTheDocument();
    expect(home).toHaveAttribute("aria-current", "page");

    expect(screen.getAllByRole("link", { name: "记录" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "复习" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "卡片组" })[0]).toBeInTheDocument();
  });
});
