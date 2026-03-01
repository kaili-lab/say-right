import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

beforeEach(() => {
  // 业务路由默认需要登录态，测试基线统一预置一份会话；特定用例可自行清空覆盖。
  window.localStorage.setItem("say_right_access_token", "test-access-token");
  window.localStorage.setItem("say_right_refresh_token", "test-refresh-token");
  window.localStorage.setItem("say_right_user_email", "tester@example.com");
});
