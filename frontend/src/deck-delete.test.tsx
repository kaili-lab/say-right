import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

const twoDecks = [
  { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
  { id: "deck-work", name: "工作沟通", is_default: false, new_count: 0, learning_count: 0, due_count: 0 },
];

describe("deck-delete", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("空非默认组可以成功删除，列表更新并切换到默认组", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(twoDecks), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "卡片组管理" });
    await user.click(screen.getByRole("button", { name: /工作沟通/ }));
    await screen.findByText("该组暂无卡片。");

    const deleteButton = screen.getByRole("button", { name: "删除卡片组" });
    expect(deleteButton).not.toBeDisabled();
    await user.click(deleteButton);

    const dialog = await screen.findByRole("dialog", { name: "删除卡片组" });
    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    await waitFor(() => expect(screen.queryByText("工作沟通")).not.toBeInTheDocument());
    expect(screen.getByRole("status")).toHaveTextContent("卡片组已删除。");

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/decks/deck-work",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });

  it("默认组的删除按钮始终禁用", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(twoDecks), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "卡片组管理" });
    // 默认选中 deck-default（列表第一项）
    expect(screen.getByRole("button", { name: "删除卡片组" })).toBeDisabled();
    expect(screen.getByText(/默认组不可删除/)).toBeInTheDocument();
  });

  it("非空组删除返回409时展示错误且弹窗保持打开", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify(twoDecks), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "deck is not empty" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "卡片组管理" });
    await user.click(screen.getByRole("button", { name: /工作沟通/ }));
    await screen.findByText("该组暂无卡片。");

    await user.click(screen.getByRole("button", { name: "删除卡片组" }));
    const dialog = await screen.findByRole("dialog", { name: "删除卡片组" });
    await user.click(within(dialog).getByRole("button", { name: "确认删除" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("deck is not empty");
    // 弹窗保持打开，方便用户取消
    expect(screen.getByRole("dialog", { name: "删除卡片组" })).toBeInTheDocument();
  });
});
