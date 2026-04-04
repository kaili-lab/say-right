# UI HANDOFF

## 最近一次交接

- 当前阶段：`UI-021~UI-027` 已完成，学习型语音输入全链路已落地。
- 本次变更：
  - 新增统一语音 API client：`frontend/src/pages/speechApi.ts`。
  - 新增录音 hook：`frontend/src/app/useSpeechRecorder.ts`。
  - 新增复用组件：`frontend/src/app/SpeechEnabledTextarea.tsx`。
  - 接入页面：
    - 记录页（中文输入 + 英文编辑）
    - 复习页（英文答案）
    - 卡片编辑弹窗（front/back）
  - 语音回归与 e2e：
    - 新增 `frontend/src/speech-page-integration.test.tsx`
    - 新增 `frontend/tests/e2e/speech-input.spec.ts`
    - 更新 `frontend/tests/e2e/critical-path.spec.ts` 与 `tests/support/authSession.ts`
- 范围约束已验证：
  - Deck 创建、登录注册等非学习型表单无语音入口。
- 可追溯证据：
  - `cd frontend && pnpm test`（19 files / 68 tests passed）
  - `cd frontend && pnpm lint`（passed）
  - `cd frontend && pnpm typecheck`（passed）
  - `cd frontend && pnpm test:e2e`（15 passed / 5 skipped）
- 下一步建议：
  1. 与真实 STT 服务做一次 staging smoke（替换 `/speech/transcribe` stub）。
  2. 根据线上日志再收敛语音按钮文案与失败提示策略。

## 语音任务结项（2026-04-04）

- 已完成并收口：
  - `UI-021` ~ `UI-027` 全部 done。
