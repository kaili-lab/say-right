# 任务拆分说明（正式版）

> 版本：v2.1
> 整理日期：2026-03-01
> 基线：原 `任务拆分说明.md` + 五轮 AI 交叉 Review（advice → advice5）+ final-advice 共识
> 适用场景：所有开发任务由 AI 在独立 session 中执行，人工做验收与关键决策

---

## 一、拆分原则

1. **单一目标**：一个任务只解决一个明确问题，不混合"工程初始化 + 业务接口 + 联调"
2. **可独立验收**：每个任务必须有 `DoD` 与可执行的 `test_commands`
3. **小步可交付**：建议一个任务在 20~60 分钟内可完成
4. **联动可追踪**：前后端分开定义，用 `paired_with`、`contract_version`、`sync_point` 标明联动关系
5. **TDD 优先**：任务内部使用"测试先行（Red）→ 实现（Green）→ 重构（Refactor）"
6. **上下文可传递**：每个任务必须写明 AI 需要读什么（context_files）、前置产出是什么（previous_task_output）、本任务产出了什么（output_summary）

### 为什么这样拆分

- 任务过大时，AI 会在同一任务中跨越太多上下文，导致验收边界模糊
- 任务过细时，管理成本高于开发收益
- 20~60 分钟粒度兼顾"推进速度"和"质量控制"，适合 AI 协作节奏

---

## 二、目录结构

```text
tasks/
  ui-tasks/
    INDEX.md          # 全局任务状态总览
    DECISIONS.md      # 跨任务的关键技术/产品决策
    HANDOFF.md        # 最近一次任务的交接信息
    task-ui-001-*.md
    task-ui-002-*.md
    ...
  api-tasks/
    INDEX.md
    DECISIONS.md
    HANDOFF.md
    task-api-001-*.md
    ...
docs/
  contracts/          # 接口契约实体文件
    v0.0-bootstrap.yaml
    v0.2-category-basic.yaml
    ...
```

---

## 三、状态文件定义（多会话协作核心）

| 文件 | 职责 | 粒度 | 更新时机 |
|------|------|------|---------|
| `INDEX.md` | 所有 task 列表、状态（todo/in-progress/done/blocked）、依赖关系 | 项目级 | 每完成一个 task 后更新 |
| `DECISIONS.md` | 关键决策沉淀（如容器宽度、ORM 选择、默认组策略） | 项目级 | 做出决策时更新 |
| `HANDOFF.md` | 最近一次完成的内容、变更文件、未决问题、下一步建议 | 会话级 | 每完成一个 task 后覆写 |

> 来源：`docs/React项目固定流程.md` §四/§五、`docs/AI协作项目开发整体流程.md` §四 步骤 4

### AI 工作流

**新 session 开始时**：
1. 读 `INDEX.md` → 了解全局进度和依赖
2. 读 `HANDOFF.md` → 了解上次交接内容
3. 读当前 task 的 `context_files` → 建立具体上下文

**完成 task 后**：
1. 更新 `INDEX.md`（当前 task 状态改为 done）
2. 覆写 `HANDOFF.md`（本次交接快照）
3. 填写当前 task 文件中的 `output_summary`（永久记录，不会被覆盖）

---

## 四、Task 文档模板

```markdown
# task-xxx 任务标题

## 目标
（一句话描述交付物）

## context_files（AI 开始前必读）
（列出本任务需要读的文件，包括上个任务的产出）

## previous_task_output（上个任务关键产出摘要）
（关键数据结构、约定、占位方式等，帮 AI 快速建立上下文）

## skill_required
（技术栈冻结前标注"候选"，冻结后改为"强制"）

## 前置依赖
（必须先完成的任务 ID）

## paired_with
（仅在真正共享接口契约、需要联调时填写；不是"同一批次的对应编号"）

## contract_version
（指向 docs/contracts/ 下的契约文件路径）

## sync_point
（前后端联调节点标识）

## 范围

## 不在范围
（明确约束 AI 不得超出此边界）

## 子步骤（执行清单）
1. 读取 context_files，确认上个任务产出与当前工程状态
2. 写失败测试（Red）— 覆盖正常路径 + 至少 1 个边界用例
3. 最小实现（Green）
4. 补齐边界用例
5. 运行全量测试确认无回归
6. 保留 test_commands 的可追溯证据（命令、退出码、关键通过行；失败时附日志路径）

## test_scope
（unit / integration / e2e）

## test_commands
（技术栈冻结后统一口径）

## DoD
- 所有 test_commands 通过
- 全量测试无回归（不只是本任务的测试）
- lint + typecheck 通过
- （按需补充业务验收标准）

## output_summary（任务完成后由 AI 填写）
（供下一个任务的 previous_task_output 使用，包括：
  关键产出文件、数据结构、约定、已知限制等）
```

### 字段说明

| 字段 | 职责 | 来源 |
|------|------|------|
| `context_files` | 解决跨 session 上下文丢失，列出 AI 必读的文件 | 任务级 |
| `previous_task_output` | 上个任务的关键产出摘要，AI 快速理解前置状态 | 任务级 |
| `output_summary` | 本任务完成后 AI 填写的产出记录（永久保留） | 任务级 |
| `paired_with` | 仅用于共享同一接口契约的前后端任务对 | 联动标记 |
| `contract_version` | 指向 `docs/contracts/` 下的实体文件（非纯文本标签） | 契约追溯 |
| `不在范围` | 约束 AI 不做"创造性发挥" | 防幻觉 |

---

## 五、质量保障：三层防线

```
第一层：TDD（AI 自验）
  ├─ 任务开始前先写失败测试
  ├─ 测试覆盖正常路径 + 至少 1 个边界用例
  ├─ DoD 要求保留可追溯证据（命令、退出码、关键通过行）
  └─ 集成测试至少一层打到真实数据库（不全 Mock）

第二层：CI 全量测试（机器验）
  ├─ 每个任务完成后运行全量测试（不只是本任务的测试）
  ├─ lint + typecheck 必须通过
  └─ 全量测试不引入回归

第三层：人工 Code Review（人验）
  ├─ AI 是否跳过了测试 / 断言为空
  ├─ 是否 Mock 了不该 Mock 的东西（把被测逻辑也 Mock 掉）
  └─ 是否引入了需求文档「不在范围」之外的功能
```

### 防止 AI 幻觉的具体手段

| 风险 | 表现 | 防范手段 |
|------|------|---------|
| 假装测试通过 | 测试写了但不运行 / 断言为空 | DoD 要求保留可追溯证据（命令+退出码+关键通过行） |
| Mock 过度 | 被测逻辑也被 Mock，测试永远通过 | 集成测试至少一层真实 DB |
| 创造性发挥 | 加了需求里没有的功能 | 「不在范围」字段明确约束 |
| 跳过边界用例 | 只测 happy path | 子步骤明确要求「补齐边界用例」 |
| 接口契约漂移 | 与上个任务产出不一致 | context_files + 契约文件双重约束 |
| 跨 session 信息丢失 | 新 session 不知道前面做了什么 | INDEX → HANDOFF → context_files 三级读取 |

---

## 六、`paired_with` 使用规则

**只在以下条件同时满足时使用**：
- 两个任务共享同一份接口契约（contract_version 指向同一文件）
- 两个任务需要联调验证

**不应使用的情况**：
- 同一批次中编号对应但无接口关系的任务
- 纯前端任务（如导航壳层）不需要 paired_with

---

## 七、接口契约文件规范

存放位置：`docs/contracts/`

格式示例：
```yaml
# docs/contracts/v0.2-category-basic.yaml
endpoints:
  GET /api/v1/categories:
    auth: required
    response: [{ id, name, is_default, card_count }]
  POST /api/v1/categories:
    auth: required
    body: { name: string }
    response: { id, name, is_default }
    errors: [409_duplicate_name, 422_validation]
```

作用：
- AI 读契约文件即知道要实现什么，不需要从需求文档推导
- 前后端任务引用同一份契约，避免各自理解不同
- Code Review 时可对照契约检查实现

---

## 八、前置决策清单（阻塞开发启动）

以下决策必须在技术栈相关任务（工程初始化、test_commands 回填等）启动前由人确定。与技术栈无关的文档纠偏（如修正 paired_with、补充业务规则）可先行推进：

| 决策项 | 候选方案 | 建议 | 理由 |
|--------|---------|------|------|
| 前端框架 | Next.js / Vite+React | Vite + React + React Router | 纯 SPA，不需要 SSR/SSG |
| 数据库 | PostgreSQL / SQLite | PostgreSQL | Railway 原生支持 |
| ORM | SQLAlchemy / Tortoise | SQLAlchemy 2.0 async | 生态成熟，§九 提及 |
| 包管理器 | npm / pnpm / bun | 待定 | 影响所有 test_commands |
| CSS 方案 | Tailwind / CSS Modules | Tailwind | 与 Mock UI 对齐效率高 |

> 建议列仅供参考，最终由人拍板。
> 冻结后回填所有任务的 `skill_required` 和 `test_commands`。

---

## 九、关键业务规则备忘

以下规则在五轮 review 中达成共识，需在对应 task 中体现：

1. **默认组初始化**：用户账号创建时创建默认组（非懒初始化），避免并发竞态。认证未接入前，`api-002` 用占位用户上下文 + seed/fixture 保证默认组存在
2. **认证占位**：认证任务完成前，业务接口使用硬编码 user context 占位，并在 task 中明确标注
3. **默认组不可删除**：需求 §3.2，需在 api 层 + 测试中覆盖

---

## 十、落地执行顺序

```
1. 修正现有任务的 paired_with（低风险、立即收益）
2. 补 api-002 的默认组 + 用户上下文占位 + DoD
3. 冻结技术栈（前端框架、数据库、ORM、包管理器、CSS）
4. 建立 docs/contracts/，contract_version 指向实体文件
5. 统一 task 模板（按本文档模板更新现有任务文件）
6. 创建 INDEX.md / DECISIONS.md / HANDOFF.md（ui-tasks/ 和 api-tasks/ 各一套）
7. 回填所有任务的 skill_required 和 test_commands
```

---

## 十一、反例（不建议）

- 在同一任务中同时做：框架搭建 + 业务模型 + 全部 API + 前后联调 + E2E
- 任务没有 test_commands，只写"完成后人工看一下"
- 没有 `sync_point` 就直接进行前后端联调
- `paired_with` 随意填写（如导航壳层配对 Category API）
- 集成测试全部 Mock，没有一层打到真实数据库
- 新 session 不读 INDEX / HANDOFF 就直接开工
- task 完成后不填 output_summary，导致下一个 task 无法衔接
