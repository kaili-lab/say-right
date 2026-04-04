import { expect, test, type Page } from "@playwright/test";
import { seedAuthSession } from "../support/authSession";

const API_BASE = "http://127.0.0.1:8787";

async function stubMediaRecorder(page: Page, mimeType = "audio/webm") {
  await page.addInitScript(({ recorderMimeType }) => {
    const stream = {
      getTracks() {
        return [
          {
            stop() {},
          },
        ];
      },
    };

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => stream,
      },
    });

    class MockMediaRecorder {
      public state: RecordingState = "inactive";
      public mimeType = recorderMimeType;
      public ondataavailable: ((event: BlobEvent) => void) | null = null;
      public onstop: ((event: Event) => void) | null = null;
      public onerror: ((event: Event) => void) | null = null;

      start() {
        this.state = "recording";
      }

      stop() {
        if (this.state === "inactive") {
          return;
        }
        this.state = "inactive";
        queueMicrotask(() => {
          const blob = new Blob(["audio-data"], { type: this.mimeType });
          this.ondataavailable?.({ data: blob } as BlobEvent);
          this.onstop?.(new Event("stop"));
        });
      }
    }

    (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder =
      MockMediaRecorder as unknown as typeof MediaRecorder;
  }, { recorderMimeType: mimeType });
}

async function routeSpeechTranscribe(page: Page) {
  await page.route(`${API_BASE}/speech/transcribe`, async (route) => {
    const body = route.request().postData() ?? "";
    let text = "Speech text";
    let language: "zh" | "en" = "en";

    if (body.includes("record_source")) {
      text = "语音中文输入";
      language = "zh";
    } else if (body.includes("record_generated")) {
      text = " spoken edit";
      language = "en";
    } else if (body.includes("review_answer")) {
      text = "Are you free today?";
      language = "en";
    } else if (body.includes("card_front")) {
      text = "新的中文";
      language = "zh";
    } else if (body.includes("card_back")) {
      text = "New English";
      language = "en";
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        text,
        language,
        provider_model: "whisper-large-v3",
      }),
    });
  });
}

test.describe("speech-input @speech-e2e", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "语音 e2e 只在桌面端执行。");
    await seedAuthSession(page);
    await stubMediaRecorder(page);
    await routeSpeechTranscribe(page);
  });

  test("记录页与复习页语音主路径可用", async ({ page }) => {
    await page.route(`${API_BASE}/decks`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
        ]),
      });
    });
    await page.route(`${API_BASE}/records/generate`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          generated_text: "Initial English.",
        }),
      });
    });
    await page.route(`${API_BASE}/review/decks/deck-daily/session`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "session-e2e-001",
          cards: [
            {
              card_id: "card-e2e-001",
              front_text: "你今天有空吗？",
              back_text: "Are you free today?",
              fsrs_state: {},
            },
          ],
        }),
      });
    });
    await page.route(`${API_BASE}/review/session/session-e2e-001/ai-score`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 88,
          feedback: "表达准确",
          suggested_rating: "good",
        }),
      });
    });
    await page.route(`${API_BASE}/review/session/session-e2e-001/rate`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          next_due_at: "2026-04-04T12:00:00Z",
          updated_fsrs_state: {},
        }),
      });
    });
    await page.route(`${API_BASE}/review/session/session-e2e-001/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session_id: "session-e2e-001",
          reviewed_count: 1,
          accuracy: 100,
          rating_distribution: {
            again: 0,
            hard: 0,
            good: 1,
            easy: 0,
          },
        }),
      });
    });

    await page.goto("/record");
    await page.getByTestId("speech-action-record_source").click();
    await expect(page.getByTestId("speech-action-record_source")).toHaveText("停止录音");
    await page.getByTestId("speech-action-record_source").click();
    await expect(page.getByLabel("中文内容")).toHaveValue("语音中文输入");

    await page.getByRole("button", { name: "生成英文" }).click();
    const generatedInput = page.getByLabel("英文结果");
    await expect(generatedInput).toHaveValue("Initial English.");
    await generatedInput.click();
    await generatedInput.evaluate((element) => {
      element.setSelectionRange(element.value.length, element.value.length);
    });
    await page.getByTestId("speech-action-record_generated").click();
    await expect(page.getByTestId("speech-action-record_generated")).toHaveText("停止录音");
    await page.getByTestId("speech-action-record_generated").click();
    await expect(page.getByLabel("英文结果")).toHaveValue("Initial English.spoken edit");
    await expect(page.getByText("已保存到")).toHaveCount(0);

    await page.goto("/review/session/deck-daily");
    await page.getByTestId("speech-action-review_answer").click();
    await expect(page.getByTestId("speech-action-review_answer")).toHaveText("停止录音");
    await page.getByTestId("speech-action-review_answer").click();
    await expect(page.getByLabel("你的英文答案")).toHaveValue("Are you free today?");
    await page.getByRole("button", { name: "AI 评分" }).click();
    await expect(page.getByText("AI 评分：88")).toBeVisible();
    await page.getByRole("button", { name: "Good" }).click();
    await page.getByRole("button", { name: "下一张" }).click();
    await expect(page.getByRole("heading", { name: "本轮复习完成" })).toBeVisible();
  });

  test("卡片编辑语音可用且 Deck 创建弹窗无语音入口", async ({ page }) => {
    await page.route(`${API_BASE}/decks`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "deck-default", name: "默认组", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
          { id: "deck-work", name: "工作沟通", is_default: false, new_count: 1, learning_count: 1, due_count: 2 },
        ]),
      });
    });
    await page.route(`${API_BASE}/decks/deck-work/cards`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "card-001",
            deck_id: "deck-work",
            front_text: "旧中文",
            back_text: "Old English",
            source_lang: "zh",
            target_lang: "en",
            due_at: "2026-04-04T12:00:00Z",
            stability: 1,
            difficulty: 3,
            reps: 0,
            lapses: 0,
          },
        ]),
      });
    });
    await page.route(`${API_BASE}/cards/card-001`, async (route) => {
      const payload = route.request().postDataJSON() as { front_text: string; back_text: string };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "card-001",
          deck_id: "deck-work",
          front_text: payload.front_text,
          back_text: payload.back_text,
          source_lang: "zh",
          target_lang: "en",
          due_at: "2026-04-04T12:00:00Z",
          stability: 1,
          difficulty: 3,
          reps: 0,
          lapses: 0,
        }),
      });
    });

    await page.goto("/decks");
    await page.getByRole("button", { name: /工作沟通/ }).click();
    await expect(page.getByText("旧中文")).toBeVisible();
    await page.getByRole("button", { name: "编辑" }).click();

    const editDialog = page.getByRole("dialog", { name: "编辑卡片" });
    const frontInput = editDialog.getByLabel("中文");
    const backInput = editDialog.getByLabel("英文");
    await frontInput.click();
    await frontInput.evaluate((element) => {
      element.setSelectionRange(0, element.value.length);
    });
    await backInput.click();
    await backInput.evaluate((element) => {
      element.setSelectionRange(0, element.value.length);
    });

    await editDialog.getByTestId("speech-action-card_front").click();
    await expect(editDialog.getByTestId("speech-action-card_front")).toHaveText("停止录音");
    await editDialog.getByTestId("speech-action-card_front").click();
    await editDialog.getByTestId("speech-action-card_back").click();
    await expect(editDialog.getByTestId("speech-action-card_back")).toHaveText("停止录音");
    await editDialog.getByTestId("speech-action-card_back").click();

    await expect(frontInput).toHaveValue("新的中文");
    await expect(backInput).toHaveValue("New English");
    await editDialog.getByRole("button", { name: "保存" }).click();
    await expect(page.getByText("卡片已更新。")).toBeVisible();

    await page.getByRole("button", { name: "+ 创建卡片组" }).click();
    const createDialog = page.getByRole("dialog", { name: "创建卡片组" });
    await expect(createDialog.locator("[data-testid^='speech-action-']")).toHaveCount(0);
  });

  test("audio/mp4 upload should contain m4a filename in multipart body", async ({ page }) => {
    await page.unroute(`${API_BASE}/speech/transcribe`);
    await stubMediaRecorder(page, "audio/mp4");

    let capturedMultipart = "";
    await page.route(`${API_BASE}/speech/transcribe`, async (route) => {
      capturedMultipart = route.request().postDataBuffer()?.toString("utf8") ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "speech input",
          language: "en",
          provider_model: "whisper-large-v3",
        }),
      });
    });

    await page.route(`${API_BASE}/decks`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: "deck-default", name: "deck", is_default: true, new_count: 0, learning_count: 0, due_count: 0 },
        ]),
      });
    });

    await page.goto("/record");
    await page.getByTestId("speech-action-record_source").click();
    await page.getByTestId("speech-action-record_source").click();

    expect(capturedMultipart).toContain('filename="speech.m4a"');
    expect(capturedMultipart).toContain("Content-Type: audio/mp4");
  });
});

test("登录页无语音入口 @speech-e2e", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "语音 e2e 只在桌面端执行。");
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  await expect(page.locator("[data-testid^='speech-action-']")).toHaveCount(0);
});
