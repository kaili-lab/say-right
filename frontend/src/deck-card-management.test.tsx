import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("deck-card-management", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("应支持编辑卡片并更新列表", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
            { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "card-001",
              deck_id: "deck-work",
              front_text: "这个会议我需要再确认一下时间。",
              back_text: "I need to double-check the time for this meeting.",
              source_lang: "zh",
              target_lang: "en",
              due_at: "2026-03-02T10:00:00Z",
              stability: 1,
              difficulty: 3,
              reps: 0,
              lapses: 0,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "card-001",
            deck_id: "deck-work",
            front_text: "这个会议我需要再确认一下时间。",
            back_text: "Please let me double-check the meeting time.",
            source_lang: "zh",
            target_lang: "en",
            due_at: "2026-03-02T10:00:00Z",
            stability: 1,
            difficulty: 3,
            reps: 0,
            lapses: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/decks"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: "卡片组管理" });
    await user.click(screen.getByRole("button", { name: /工作沟通/ }));
    await screen.findByText("这个会议我需要再确认一下时间。");

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(await screen.findByRole("dialog", { name: "编辑卡片" })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("英文"));
    await user.type(screen.getByLabelText("英文"), "Please let me double-check the meeting time.");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("Please let me double-check the meeting time.")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/cards/card-001",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            front_text: "这个会议我需要再确认一下时间。",
            back_text: "Please let me double-check the meeting time.",
          }),
        }),
      ),
    );
  });

  it("应支持移动与删除卡片", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
            { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: "card-001",
              deck_id: "deck-work",
              front_text: "这个会议我需要再确认一下时间。",
              back_text: "I need to double-check the time for this meeting.",
              source_lang: "zh",
              target_lang: "en",
              due_at: "2026-03-02T10:00:00Z",
              stability: 1,
              difficulty: 3,
              reps: 0,
              lapses: 0,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "card-001",
            deck_id: "deck-default",
            front_text: "这个会议我需要再确认一下时间。",
            back_text: "I need to double-check the time for this meeting.",
            source_lang: "zh",
            target_lang: "en",
            due_at: "2026-03-02T10:00:00Z",
            stability: 1,
            difficulty: 3,
            reps: 0,
            lapses: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
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
    await screen.findByText("这个会议我需要再确认一下时间。");

    await user.click(screen.getByRole("button", { name: "移动" }));
    expect(await screen.findByRole("dialog", { name: "移动卡片" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("目标卡片组"), "deck-default");
    await user.click(screen.getByRole("button", { name: "确认移动" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/cards/card-001/move",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ to_deck_id: "deck-default" }),
        }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /默认组/ }));
    await screen.findByText("这个会议我需要再确认一下时间。");

    await user.click(screen.getByRole("button", { name: "删除" }));
    expect(await screen.findByRole("dialog", { name: "删除卡片" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "确认删除" }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/cards/card-001",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
