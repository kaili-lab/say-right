import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("deck-list-create", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("应展示卡片组列表并标注默认组不可删除", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: "deck-default",
            name: "默认组",
            is_default: true,
            new_count: 0,
            learning_count: 0,
            due_count: 0,
          },
          {
            id: "deck-work",
            name: "工作沟通",
            is_default: false,
            new_count: 2,
            learning_count: 1,
            due_count: 6,
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "卡片组管理" })).toBeInTheDocument();
    expect(screen.getAllByText("默认组").length).toBeGreaterThan(0);
    expect(screen.getByText("工作沟通")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "删除卡片组" })).toBeDisabled();
    expect(screen.getByText(/默认组不可删除/)).toBeInTheDocument();
  });

  it("应支持创建组弹窗与表单校验", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "deck-default",
              name: "默认组",
              is_default: true,
              new_count: 0,
              learning_count: 0,
              due_count: 0,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "deck-travel",
            name: "旅行应急",
            is_default: false,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "卡片组管理" });
    await user.click(screen.getByRole("button", { name: "+ 创建卡片组" }));

    expect(await screen.findByRole("dialog", { name: "创建卡片组" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "创建" }));
    expect(screen.getByRole("alert")).toHaveTextContent("请输入卡片组名称。");

    await user.type(screen.getByLabelText("卡片组名称"), "旅行应急");
    await user.click(screen.getByRole("button", { name: "创建" }));

    expect((await screen.findAllByText("旅行应急")).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8787/decks",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "旅行应急" }),
        }),
      ),
    );
  });

  it("空状态应显示默认组与创建入口", async () => {
    render(
      <MemoryRouter initialEntries={["/decks?state=empty"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "默认组（0 张）" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建卡片组" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去记录新内容" })).toBeInTheDocument();
  });
});
