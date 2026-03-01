import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";

describe("home-page", () => {
  it("首页应展示主路径卡片与统计信息，并可跳转复习页", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "今日待复习" })).toBeInTheDocument();
    expect(screen.getByText("Welcome Stats")).toBeInTheDocument();
    expect(screen.getByText("你知道吗？")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "开始复习" }));

    expect(screen.getByRole("heading", { name: "复习" })).toBeInTheDocument();
  });

  it("首页空状态应展示创建第一张卡片入口", () => {
    render(
      <MemoryRouter initialEntries={["/?state=empty"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "还没有学习卡片" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "创建第一张卡片" })).toBeInTheDocument();
  });
});
