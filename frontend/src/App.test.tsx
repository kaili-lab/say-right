import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

describe("应用入口", () => {
  it("应渲染首页主路径入口", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "今日待复习" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "开始复习" })).toBeInTheDocument();
  });
});
