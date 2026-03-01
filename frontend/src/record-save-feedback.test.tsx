import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const mockFetch = vi.fn<typeof fetch>();

describe("record-save-feedback", () => {
  afterEach(() => {
    mockFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("保存成功后应展示分组反馈与立即调整入口", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generated_text: "I need to double-check the time for this meeting.",
            model_hint: "stub-v1",
            trace_id: "trace-save-001",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            card_id: "card-001",
            deck_id: "deck-work",
            deck_name: "工作沟通",
            deck_created: false,
            fallback_used: false,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("中文内容"), "这个会议我需要再确认一下时间");
    await user.click(screen.getByRole("button", { name: "生成英文" }));
    await screen.findByLabelText("英文结果");

    await user.click(screen.getByRole("button", { name: "保存卡片" }));

    expect(await screen.findByText("已保存到 工作沟通")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即调整分组" })).toBeInTheDocument();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "http://127.0.0.1:8000/records/save-with-agent",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            source_text: "这个会议我需要再确认一下时间",
            generated_text: "I need to double-check the time for this meeting.",
            source_lang: "zh",
            target_lang: "en",
          }),
        }),
      ),
    );
  });

  it("应支持打开分组弹窗并更新前端分组状态", async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            generated_text: "I need to double-check the time for this meeting.",
            model_hint: "stub-v1",
            trace_id: "trace-save-002",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            card_id: "card-002",
            deck_id: "deck-work",
            deck_name: "工作沟通",
            deck_created: false,
            fallback_used: false,
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      );

    vi.stubGlobal("fetch", mockFetch);

    render(
      <MemoryRouter initialEntries={["/record"]}>
        <App />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("中文内容"), "我要记录一个会话表达");
    await user.click(screen.getByRole("button", { name: "生成英文" }));
    await screen.findByLabelText("英文结果");
    await user.click(screen.getByRole("button", { name: "保存卡片" }));
    await screen.findByText("已保存到 工作沟通");

    await user.click(screen.getByRole("button", { name: "立即调整分组" }));

    const dialog = await screen.findByRole("dialog", { name: "调整卡片组" });
    const list = within(dialog).getByTestId("deck-modal-list");
    expect(list).toHaveClass("overflow-y-auto");

    await user.click(within(dialog).getByRole("radio", { name: /旅行应急/ }));
    await user.click(within(dialog).getByRole("button", { name: "确认分组" }));

    expect(screen.getByText("当前分组：旅行应急")).toBeInTheDocument();
    expect(screen.getByText("已调整到 旅行应急")).toBeInTheDocument();
  });
});
