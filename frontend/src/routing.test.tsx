import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

describe("routing", () => {
  it("路由切换到记录页时显示记录页标题", () => {
    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "记录新表达" })).toBeInTheDocument();
  });

  it("未登录访问业务路由时应跳转到登录页", () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "登录" })).toBeInTheDocument();
  });

  it("移动端底部导航存在", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });
});
