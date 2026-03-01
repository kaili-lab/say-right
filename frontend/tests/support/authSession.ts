/**
 * Playwright 登录态注入工具。
 *
 * WHAT: 在页面首次加载前写入本地会话令牌，绕过 UI 登录流程进入业务页面。
 * WHY: e2e/视觉测试聚焦页面行为与视觉回归，不把账号流程作为噪音前置条件。
 */
import type { Page } from "@playwright/test";

export async function seedAuthSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("say_right_access_token", "e2e-access-token");
    window.localStorage.setItem("say_right_refresh_token", "e2e-refresh-token");
    window.localStorage.setItem("say_right_user_email", "e2e@example.com");
  });
}
