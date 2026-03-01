import { render, screen } from "@testing-library/react";

import App from "./App";

describe("应用入口", () => {
  it("应显示应用已启动标识", () => {
    render(<App />);

    expect(screen.getByText("应用已启动")).toBeInTheDocument();
  });
});
