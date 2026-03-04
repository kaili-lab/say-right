import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";
import { MePage } from "./pages/MePage";

const meResponse = {
  user_id: "u1",
  email: "tester@example.com",
  nickname: "Tester",
  display_name: "Tester",
};

function buildMeFetch() {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(meResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function buildHomeFetch() {
  return vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        display_name: "Kai",
        insight: "每天复习一点点。",
        study_days: 0,
        mastered_count: 0,
        total_cards: 0,
        total_due: 0,
        recent_decks: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
}

describe("me-page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("展示邮箱和昵称", async () => {
    render(<MePage fetchImpl={buildMeFetch()} />, { wrapper: MemoryRouter });
    expect(await screen.findByText("tester@example.com")).toBeInTheDocument();
    expect(screen.getByText("Tester")).toBeInTheDocument();
  });

  it("加载失败时展示错误提示", async () => {
    const failFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "invalid access token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<MePage fetchImpl={failFetch} />, { wrapper: MemoryRouter });
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("点击退出登录后清理会话", async () => {
    // 提供 /me 数据加载和登出（204）两次调用的 mock
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(meResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const user = userEvent.setup();

    render(<MePage fetchImpl={fetchMock} />, { wrapper: MemoryRouter });
    const logoutBtn = await screen.findByRole("button", { name: "退出登录" });
    await user.click(logoutBtn);

    expect(window.localStorage.getItem("say_right_access_token")).toBeNull();
  });

  it("移动端底部导航包含我的 Tab 且为 5 格", async () => {
    vi.stubGlobal("fetch", buildHomeFetch());

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "还没有学习卡片" });
    const bottomNav = screen.getByTestId("bottom-nav");
    expect(bottomNav).toHaveClass("grid-cols-5");
    expect(screen.getAllByRole("link", { name: "我的" })[0]).toBeInTheDocument();
  });

  it("桌面端头像菜单账号信息按钮存在", async () => {
    vi.stubGlobal("fetch", buildHomeFetch());
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "还没有学习卡片" });
    await user.click(screen.getByRole("button", { name: "用户菜单" }));
    expect(await screen.findByRole("menuitem", { name: "账号信息" })).toBeInTheDocument();
  });
});
