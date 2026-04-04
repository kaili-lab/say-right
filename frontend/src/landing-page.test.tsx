import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach } from "vitest";

import App from "./App";
import { LANDING_LOCALE_STORAGE_KEY } from "./pages/landingLocale";

describe("landing-page", () => {
  afterEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
    window.localStorage.removeItem("say_right_session_active");
    window.localStorage.removeItem("say_right_user_email");
  });

  it("未登录访问根路由显示公开 landing page", () => {
    window.localStorage.clear();
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, "zh-CN");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "把你的中文想法，练成自然英语表达" })).toBeInTheDocument();
    const loginLinks = screen.getAllByRole("link", { name: "登录" });
    expect(loginLinks.length).toBeGreaterThan(0);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/auth/login");
    });
  });

  it("公开页支持中英文切换并更新文案", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, "zh-CN");
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "EN" }));
    expect(screen.getByRole("heading", { name: "Turn Chinese thoughts into natural English that sticks" })).toBeInTheDocument();
    expect(window.localStorage.getItem(LANDING_LOCALE_STORAGE_KEY)).toBe("en");
  });

  it("登录态访问根路由显示进入应用入口", () => {
    window.localStorage.setItem("say_right_session_active", "1");
    window.localStorage.setItem("say_right_user_email", "tester@example.com");
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, "zh-CN");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    const openAppLinks = screen.getAllByRole("link", { name: "进入应用" });
    expect(openAppLinks.length).toBeGreaterThan(0);
    openAppLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/app");
    });
  });
});
