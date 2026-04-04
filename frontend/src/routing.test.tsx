import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

describe("routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("路由切换到记录页时显示记录页标题", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // 本用例只验证路由切换展示，不关心异步数据加载结果，保持请求挂起可避免无关状态更新噪音。
          }),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "记录新表达" })).toBeInTheDocument();
  });

  it("未登录访问业务路由时应跳转到公开 landing page", () => {
    window.localStorage.clear();
    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Turn Chinese thoughts into natural English that sticks" })).toBeInTheDocument();
  });

  it("业务首页存在移动端底部导航", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });

  it("已登录访问登录页时应重定向到业务首页", () => {
    window.localStorage.setItem("say_right_session_active", "1");
    window.localStorage.setItem("say_right_user_email", "tester@example.com");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>(() => {
            // 该用例只验证访客路由守卫，不关注首页异步数据加载结果。
          }),
      ),
    );

    render(
      <MemoryRouter initialEntries={["/auth/login"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("heading", { name: "登录" })).not.toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });
});
