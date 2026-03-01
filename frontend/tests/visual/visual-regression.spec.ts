/**
 * 视觉回归测试（React vs Mock HTML 基线）。
 *
 * WHAT: 每个页面先截图 mock-ui 基线，再对 React 页面做同名截图比对。
 * WHY: 把视觉标准固化为可执行测试，避免后续迭代破坏已确认的界面风格。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { seedAuthSession } from "../support/authSession";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");

type CompareOptions = {
  page: Page;
  testInfo: TestInfo;
  appPath: string;
  mockFile: string;
  snapshotName: string;
  maxDiffPixelRatio?: number;
  setupAppBeforeGoto?: (page: Page) => Promise<void>;
  setupAppAfterGoto?: (page: Page) => Promise<void>;
  setupMockAfterGoto?: (page: Page) => Promise<void>;
};

async function compareWithMockBaseline({
  page,
  testInfo,
  appPath,
  mockFile,
  snapshotName,
  maxDiffPixelRatio = 0.45,
  setupAppBeforeGoto,
  setupAppAfterGoto,
  setupMockAfterGoto,
}: CompareOptions) {
  const mockPage = await page.context().newPage();
  const mockUrl = pathToFileURL(path.resolve(REPO_ROOT, "mock-ui", mockFile)).href;

  await mockPage.goto(mockUrl);
  if (setupMockAfterGoto) {
    await setupMockAfterGoto(mockPage);
  }
  await mockPage.waitForTimeout(200);

  const mockBaseline = await mockPage.screenshot({
    animations: "disabled",
    scale: "css",
  });
  await mockPage.close();

  const snapshotPath = testInfo.snapshotPath(snapshotName);
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(snapshotPath, mockBaseline);

  await seedAuthSession(page);
  if (setupAppBeforeGoto) {
    await setupAppBeforeGoto(page);
  }
  await page.goto(appPath);
  if (setupAppAfterGoto) {
    await setupAppAfterGoto(page);
  }
  await page.waitForTimeout(200);

  await expect(page).toHaveScreenshot(snapshotName, {
    animations: "disabled",
    scale: "css",
    maxDiffPixelRatio,
  });
}

test.describe("visual-regression @visual", () => {
  test("首页视觉基线对齐", async ({ page }, testInfo) => {
    await compareWithMockBaseline({
      page,
      testInfo,
      appPath: "/",
      mockFile: "v3-c-warm-orange-home.html",
      snapshotName: "home.png",
      maxDiffPixelRatio: 0.7,
      setupAppBeforeGoto: async (appPage) => {
        await appPage.route("**/dashboard/home-summary", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              study_days: 5,
              mastered_count: 28,
              total_cards: 40,
              total_due: 21,
              recent_decks: [
                { id: "deck-travel", name: "Travel", due_count: 12 },
                { id: "deck-daily", name: "Daily Conversation", due_count: 6 },
                { id: "deck-work", name: "Work Email", due_count: 3 },
              ],
            }),
          });
        });
      },
    });
  });

  test("记录页视觉基线对齐", async ({ page }, testInfo) => {
    await compareWithMockBaseline({
      page,
      testInfo,
      appPath: "/record",
      mockFile: "v3-c-warm-orange-record.html",
      snapshotName: "record.png",
      maxDiffPixelRatio: 0.9,
      setupAppBeforeGoto: async (appPage) => {
        await appPage.route("**/decks", async (route) => {
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
      },
    });
  });

  test("复习列表页视觉基线对齐", async ({ page }, testInfo) => {
    await compareWithMockBaseline({
      page,
      testInfo,
      appPath: "/review",
      mockFile: "v3-c-warm-orange-review.html",
      snapshotName: "review-list.png",
      maxDiffPixelRatio: 0.9,
      setupAppBeforeGoto: async (appPage) => {
        await appPage.route("**/review/decks", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify([
              { deck_id: "deck-daily", deck_name: "日常口语", due_count: 10 },
              { deck_id: "deck-work", deck_name: "工作沟通", due_count: 6 },
              { deck_id: "deck-meeting", deck_name: "英文会议", due_count: 3 },
            ]),
          });
        });
      },
    });
  });

  test("复习 Session 页视觉基线对齐", async ({ page }, testInfo) => {
    await compareWithMockBaseline({
      page,
      testInfo,
      appPath: "/review/session/deck-daily",
      mockFile: "v3-c-warm-orange-session.html",
      snapshotName: "review-session.png",
      maxDiffPixelRatio: 0.9,
      setupAppBeforeGoto: async (appPage) => {
        await appPage.route("**/review/decks/deck-daily/session", async (route) => {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              session_id: "session-visual-001",
              cards: [
                {
                  card_id: "card-visual-001",
                  front_text: "这个我再想想。",
                  back_text: "Let me think about this.",
                  fsrs_state: { step: 1 },
                },
              ],
            }),
          });
        });
      },
    });
  });

  test("卡片组页视觉基线对齐", async ({ page }, testInfo) => {
    await compareWithMockBaseline({
      page,
      testInfo,
      appPath: "/decks?state=empty",
      mockFile: "v3-c-warm-orange-decks.html",
      snapshotName: "decks-empty.png",
      maxDiffPixelRatio: 0.9,
      setupMockAfterGoto: async (mockPage) => {
        await mockPage.locator("#emptyLink").click();
      },
    });
  });
});
