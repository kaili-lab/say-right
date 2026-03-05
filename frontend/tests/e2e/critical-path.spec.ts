/**
 * 关键路径 e2e 测试。
 *
 * WHAT: 覆盖记录保存与复习主流程，验证前端在契约层面的核心可用性。
 * WHY: UI-012 要求对关键路径做可回归验收，而不是只看单元测试。
 */
import { expect, test } from "@playwright/test";
import { seedAuthSession } from "../support/authSession";

test.describe("critical-path @critical-path", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "关键路径 e2e 在桌面端执行；移动端由视觉验收覆盖。");
    await seedAuthSession(page);
  });

  test("记录页：生成英文并保存后可立即调整分组 @critical-path", async ({ page }) => {
    await page.route("**/decks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
          { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
          { id: "deck-travel", name: "旅行应急", is_default: false, new_count: 0, learning_count: 1, due_count: 5 },
        ]),
      });
    });

    await page.route("**/records/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          generated_text: "I need to double-check the time for this meeting.",
        }),
      });
    });

    await page.route("**/records/save-with-agent", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          card_id: "card-critical-001",
          deck_id: "deck-work",
          deck_name: "工作沟通",
          deck_created: false,
          fallback_used: false,
        }),
      });
    });

    await page.goto("/record");

    await page.getByLabel(/中文内容/).fill("这个会议我需要再确认一下时间。");
    await page.getByRole("button", { name: "生成英文" }).click();

    await expect(page.getByLabel(/英文结果/)).toHaveValue("I need to double-check the time for this meeting.");
    await page.getByRole("button", { name: "保存卡片" }).click();

    await expect(page.getByText("已保存到 工作沟通")).toBeVisible();
    await page.getByRole("button", { name: "立即调整分组" }).click();

    const dialog = page.getByRole("dialog", { name: "调整卡片组" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("radio", { name: /旅行应急/ }).click();
    await dialog.getByRole("button", { name: "确认分组" }).click();

    await expect(page.getByText("当前分组：旅行应急")).toBeVisible();
  });

  test("复习页：进入 session 并完成一轮评级 @critical-path", async ({ page }) => {
    await page.route("**/review/decks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ deck_id: "deck-daily", deck_name: "日常口语", due_count: 1 }]),
      });
    });

    await page.route("**/review/decks/deck-daily/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "session-critical-001",
          cards: [
            {
              card_id: "card-session-001",
              front_text: "这个我再想想。",
              back_text: "Let me think about this.",
              fsrs_state: { step: 1 },
            },
          ],
        }),
      });
    });

    await page.route("**/review/session/session-critical-001/ai-score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ score: 88, feedback: "表达自然", suggested_rating: "good" }),
      });
    });

    await page.route("**/review/session/session-critical-001/rate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ next_due_at: "2026-03-02T10:00:00Z", updated_fsrs_state: { step: 2 } }),
      });
    });

    await page.goto("/review");
    await page.getByRole("link", { name: "进入 Deck 日常口语" }).click();

    await expect(page.getByRole("heading", { name: "复习 Session" })).toBeVisible();
    await page.getByLabel(/你的英文答案/).fill("Let me think about this.");
    await page.getByRole("button", { name: "AI 评分" }).click();
    await expect(page.getByText("AI 评分：88")).toBeVisible();

    await page.getByRole("button", { name: "Good" }).click();
    await page.getByRole("button", { name: "下一张" }).click();

    await expect(page.getByRole("heading", { name: "本轮复习完成" })).toBeVisible();
  });
});
