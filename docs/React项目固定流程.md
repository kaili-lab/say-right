# React 项目实现固定流程（可复用）

> 版本：v1.0  
> 整理日期：2026-02-26  
> 适用范围：从 HTML/设计稿迁移到 React，并要求视觉与交互一致的项目

---

## 一、目标

建立一套可复用的实施流程，确保 React 版本在**内容、结构、主题、颜色、交互**上与当前 HTML 基线一致，并支持多会话协作不中断。

---

## 二、三基线原则（必须同时使用）

1. **源码基线（HTML）**：结构、文案、状态、交互逻辑的事实来源  
2. **视觉基线（截图）**：用于发现视觉偏移（间距、对齐、层级、颜色观感）  
3. **规范基线（UI 设计规范）**：颜色、圆角、阴影、宽度、响应式规则等约束来源

> 结论：不能只依赖截图，也不能只依赖 HTML；三者缺一不可。

---

## 三、职责分工

### AI（默认执行者）

- 拆分 task、维护任务状态文件
- 生成基线截图与对比截图（Playwright）
- 按 task 实现 React 代码并自测
- 每个 task 完成后更新文档与交接信息

### 人（你）

- 做关键视觉与交互确认（最终拍板）
- 对有争议的产品取舍做决策
- 审核阶段性成果（如让 Claude review）

---

## 四、标准目录结构（建议）

```text
tasks/
  ui-tasks/
    INDEX.md
    DECISIONS.md
    HANDOFF.md
    task-ui-001-*.md
    task-ui-002-*.md
    ...
  api-tasks/
    INDEX.md
    DECISIONS.md
    HANDOFF.md
    task-api-001-*.md
    ...
```

---

## 五、状态文件定义（多会话协作核心）

### `tasks/ui-tasks/INDEX.md`

- 所有 UI task 列表、状态（todo/in-progress/done/blocked）、依赖关系、负责人

### `tasks/ui-tasks/DECISIONS.md`

- 关键决策沉淀（如容器宽度、滚动条策略、组件取舍、验收阈值）

### `tasks/ui-tasks/HANDOFF.md`

- 最近一次完成内容、变更文件、未决问题、下一步建议

> 规则：每完成一个 task，至少更新 `INDEX.md` + 当前 task 文件 + `HANDOFF.md`。

---

## 六、Task 拆分规则（小任务原则）

1. 单一目标：一个 task 只解决一个明确子问题  
2. 小 diff：尽量控制在少量文件内，便于回滚和 review  
3. 可独立验收：每个 task 必须有可执行的验收步骤  
4. 有前置声明：明确依赖哪些已完成 task  

---

## 七、Task 文档模板（建议）

```md
# task-ui-00X-任务名

## 目标

## 前置依赖

## 执行上下文
- workdir: （例如 `frontend`）
- runtime: （node）
- env/setup: （例如 `pnpm install`、Node 版本要求）

## 输入基线
- HTML: ...
- UI规范: ...

## 依赖变更（若有）
- package:
  version:
  reason:
  install_command:

## 实现范围

## 完成标准（DoD）

## 验证步骤
- Playwright:
- 手工检查:

## 产出文件

## 实施记录（完成后填写）
```

> 补充约束：命令执行目录以 `执行上下文.workdir` 为准；若项目是 monorepo，不要默认在仓库根执行安装/测试命令。

---

## 八、React 落地执行流程

1. 读取 `INDEX.md`、`DECISIONS.md`、`HANDOFF.md`  
2. 选择下一个最小 task（满足前置依赖）  
3. 从 HTML 提取对应结构/文案/状态  
4. 按 UI 规范映射为 React 组件与样式  
5. 生成并对比截图（基线 vs React）  
6. 修正差异并完成自测  
7. 更新状态文件与交接内容  
8. 提交给人工/Claude review

---

## 九、截图与验收标准

### 谁来做截图

- 默认由 **AI** 负责生成（Playwright），不要求你手工精确截图

### 建议固定视口

- Desktop：`1366 x 900`
- Mobile（iPhone 13）：`390 x 844`

### 最低验收项

1. 四个主 Tab 顶部导航宽度一致  
2. 四个主 Tab 主内容区宽度一致（除内层可控窄容器）  
3. 页面切换无横向跳动（滚动条策略生效）  
4. 主题色、圆角、阴影、字体层级符合规范  
5. 关键弹窗/空状态/禁用态与 HTML 基线一致

---

## 十、可复用到其他项目的最小集

如需在新项目快速复用，只复制以下内容即可：

1. 本文档  
2. `tasks/` 目录结构  
3. 三个状态文件模板（`INDEX/DECISIONS/HANDOFF`）  
4. task 模板  
5. 固定视口截图验收规则
