import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

describe("应用入口", () => {
  it("应显示应用已启动标识", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText("应用已启动 · 首页占位路由已就绪。")).toBeInTheDocument();
  });
});
