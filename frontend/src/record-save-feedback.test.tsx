import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, vi } from "vitest";

import App from "./App";

const decksPayload = [
  { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
  { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
  { id: "deck-travel", name: "旅行应急", is_default: false, new_count: 0, learning_count: 1, due_count: 5 },
];

const generatePayload = {
  generated_text: "I need to double-check the time for this meeting.",
};

const savePayload = {
  card_id: "card-001",
  deck_id: "deck-default",
  deck_name: "默认组",
};

function buildMockFetch(overrides: Record<string, object> = {}) {
  return vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    if (url.endsWith("/decks")) {
      return Promise.resolve(
        new Response(JSON.stringify(decksPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (url.endsWith("/records/generate")) {
      return Promise.resolve(
        new Response(JSON.stringify(generatePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    if (url.endsWith("/records/save")) {
      const payload = overrides["/records/save"] ?? savePayload;
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ detail: "unexpected request" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
}

async function renderAndGenerate(user: ReturnType<typeof userEvent.setup>) {
  render(
    <MemoryRouter initialEntries={["/record"]}>
      <App />
    </MemoryRouter>,
  );
  await user.type(screen.getByLabelText("中文内容"), "这个会议我需要再确认一下时间");
  await user.click(screen.getByRole("button", { name: "生成英文" }));
  await screen.findByLabelText("英文结果");
}

describe("record-save-feedback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("点击保存卡片打开分组选择弹窗，默认选中默认组", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", buildMockFetch());

    await renderAndGenerate(user);
    await user.click(screen.getByRole("button", { name: "保存卡片" }));

    const dialog = await screen.findByRole("dialog", { name: "选择卡片组" });
    expect(dialog).toBeInTheDocument();

    // 默认组应被选中
    const defaultRadio = within(dialog).getByRole("radio", { name: /默认组/ });
    expect(defaultRadio).toBeChecked();
  });

  it("确认分组后调用 POST /records/save 并展示保存成功", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", buildMockFetch());

    await renderAndGenerate(user);
    await user.click(screen.getByRole("button", { name: "保存卡片" }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认保存" }));

    expect(await screen.findByText("已保存到 默认组")).toBeInTheDocument();

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/records/save",
        expect.objectContaining({ method: "POST" }),
      ),
    );
  });

  it("保存成功后英文 textarea 变为只读，保存按钮禁用", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", buildMockFetch());

    await renderAndGenerate(user);
    await user.click(screen.getByRole("button", { name: "保存卡片" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认保存" }));

    await screen.findByText("已保存到 默认组");
    const generatedTextarea = screen.getByLabelText("英文结果");
    expect(generatedTextarea).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "保存卡片" })).toBeDisabled();
  });

  it("可以选择非默认组后保存", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      buildMockFetch({
        "/records/save": { card_id: "card-002", deck_id: "deck-work", deck_name: "工作沟通" },
      }),
    );

    await renderAndGenerate(user);
    await user.click(screen.getByRole("button", { name: "保存卡片" }));
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("radio", { name: /工作沟通/ }));
    await user.click(within(dialog).getByRole("button", { name: "确认保存" }));

    expect(await screen.findByText("已保存到 工作沟通")).toBeInTheDocument();
  });

  it("保存失败时英文区域保持可编辑", async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = typeof input === "string" ? input : (input as Request).url;
      if (url.endsWith("/decks")) {
        return Promise.resolve(
          new Response(JSON.stringify(decksPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.endsWith("/records/generate")) {
        return Promise.resolve(
          new Response(JSON.stringify(generatePayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      if (url.endsWith("/records/save")) {
        return Promise.resolve(
          new Response(JSON.stringify({ detail: "deck not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 500 }));
    });
    vi.stubGlobal("fetch", mockFetch);

    await renderAndGenerate(user);
    await user.click(screen.getByRole("button", { name: "保存卡片" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "确认保存" }));

    await screen.findByRole("alert");
    const generatedTextarea = screen.getByLabelText("英文结果");
    expect(generatedTextarea).not.toHaveAttribute("readonly");
  });
});
