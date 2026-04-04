# UI-027 语音输入回归与端到端验收

## 目标

- 为语音输入能力补齐跨页面回归与端到端验收，确保记录页、复习页、卡片编辑页的学习型语音入口稳定。

## context_files（AI 开始前必读）

- `tasks/ui-tasks/INDEX.md`
- `tasks/ui-tasks/DECISIONS.md`
- `tasks/ui-tasks/HANDOFF.md`
- `tasks/任务拆分说明-final.md`
- `tasks/REVIEW-CHECKLIST.md`
- `tasks/ui-tasks/task-ui-024-record-page-speech-inputs.md`
- `tasks/ui-tasks/task-ui-025-review-session-speech-input.md`
- `tasks/ui-tasks/task-ui-026-deck-card-edit-speech-inputs.md`
- `frontend/tests/e2e/critical-path.spec.ts`
- `frontend/playwright.config.ts`

## previous_task_output（上一个任务关键产出摘要）

- 记录页、复习页、卡片编辑页都将接入语音。
- 需要一层更高置信度的回归，验证“录音 -> 转写 -> 回填 -> 原业务动作”闭环。

## skill_required

- `-`

## 前置依赖

- `UI-024`
- `UI-025`
- `UI-026`

## paired_with

- `-`

## contract_version

- `docs/contracts/v0.9-speech-transcribe.yaml`

## sync_point

- `SP-UI-SPEECH-E2E`

## execution_context（执行环境约定）

- workdir: `frontend`
- runtime: node
- install_commands:
  - `pnpm install`

## dependency_changes（新增依赖清单）

- 无

## test_data_strategy（前置模块未就绪时必填）

- upstream_status: ready
- gap: 浏览器真实麦克风与真实 STT 调用不适合 E2E 直连
- strategy: Playwright 中 stub `MediaRecorder` 与 `/speech/transcribe`
- rollback_plan: 如后续引入 staging 专用语音环境，再增加真实联调 smoke case

## 范围

1. 新增语音输入 E2E 用例
2. 覆盖页面：
   - 记录页中文/英文学习输入
   - 复习页英文答案
   - 卡片编辑弹窗中英文输入
3. 覆盖链路：
   - 开始录音
   - 停止录音
   - 转写成功
   - 回填后继续原业务动作
4. 增补必要的回归断言，确保非学习型表单无语音入口

## 不在范围

- 真实第三方 STT 联调
- 性能压测
- 发音评估

## 子步骤（执行清单）

1. 先写失败用例（Red）：三个页面主路径与非学习型表单排除。
2. 最小补齐 E2E stub 与断言（Green）。
3. 补齐边界场景：转写失败重试、页面切换状态恢复（Refactor）。
4. 执行前端门禁并保留证据。

## test_scope

- `e2e`
- `integration`

## test_commands

- `cd frontend && pnpm test`
- `cd frontend && pnpm lint`
- `cd frontend && pnpm typecheck`
- `cd frontend && pnpm test:e2e`

## DoD

- 学习型语音输入主路径有端到端覆盖。
- 非学习型表单无语音入口有回归断言。
- 所有 `test_commands` 通过。

## output_summary（任务完成后由 AI 填写）

- 关键产出：
  - 新增 `frontend/tests/e2e/speech-input.spec.ts`：
    - `MediaRecorder/getUserMedia` 浏览器侧 stub。
    - `/speech/transcribe` 路由 stub（按 scene 返回不同转写）。
    - 覆盖记录页、复习页、卡片编辑弹窗语音闭环。
    - 覆盖登录页与 Deck 创建弹窗无语音入口。
  - 更新 `frontend/tests/e2e/critical-path.spec.ts`，对齐当前记录页保存流程（分组弹窗确认保存）。
  - 更新 `frontend/tests/support/authSession.ts`，切换到 `say_right_session_active` 会话标记。
- 测试证据：
  - `cd frontend && pnpm test:e2e` 通过（desktop 执行语音/关键路径，iphone 项目按用例内 skip 策略执行）。
  - 前端全量门禁通过：`pnpm test`、`pnpm lint`、`pnpm typecheck`。
