# Python 快速入门与项目进阶路径 - Java 开发者版

> 第一阶段是语法速学，目标是尽快建立 Python 语感；第二阶段开始补工程化与 AI 应用能力，最终用项目完成进阶。

## 核心原则

- **只讲差异，不讲共性**：if/else/for/while 这些逻辑不用教，只讲 Python 写法有什么不同
- **Java 对比驱动**：每个知识点左边 Java 写法（注释），右边 Python 写法（可运行）
- **不求记住，求有印象**：过完之后写项目时回来查就行

## 形式

- 每个主题一个 `.ipynb` 文件，在 VSCode 中边看边跑
- 预计 1-2 小时过完全部内容

## 模块规划

### 01 - 基础语法差异

- 变量声明：无类型声明，动态类型
- 类型系统：type()、isinstance()、类型注解（Type Hints）
- 字符串：f-string、多行字符串、常用方法
- 布尔值：True/False（大写）、truthy/falsy 规则
- None：对比 Java 的 null
- 运算符差异：//整除、**幂运算、is vs ==、in 关键字、not/and/or vs !/&&/||
- 代码块：缩进代替大括号，无分号
- 三元表达式：`x if condition else y`（对比 Java `condition ? x : y`）
- print：对比 System.out.println

### 02 - 数据结构

- list：对比 ArrayList，切片语法、列表方法
- dict：对比 HashMap，字面量创建、常用操作
- set：对比 HashSet
- tuple：Java 没有的不可变序列
- 解包（Unpacking）：`a, b = 1, 2`，Java 没有的语法糖
- 类型转换：list()、dict()、set()、tuple() 之间互转

### 03 - 函数

- def 定义函数，无需声明返回类型（但可以用类型注解）
- 默认参数、关键字参数
- *args / **kwargs：可变参数（对比 Java 的 varargs）
- lambda 表达式（对比 Java 的箭头函数）
- 装饰器（Decorator）：@语法，Java 没有的概念，FastAPI 大量使用
- 函数是一等公民：可以赋值给变量、作为参数传递

### 04 - 类与面向对象

- class 定义：`self` 对比 Java 的 `this`
- `__init__` 对比 Java 构造函数
- 没有 private/protected/public，约定用 `_` 前缀表示私有
- 继承：语法差异，多继承（Java 只能单继承）
- 魔术方法：`__str__`、`__repr__`、`__len__` 等（对比 Java 的 toString()）
- dataclass：对比 Java 的 record / Lombok
- 没有接口（interface），用抽象类或 Protocol 替代

### 05 - 异常处理与文件操作

- try/except/finally（对比 try/catch/finally）
- 常见异常类型
- with 语句（上下文管理器）：自动资源管理，对比 Java 的 try-with-resources
- 文件读写

### 06 - 模块与包

- import 机制：对比 Java 的 import
- from ... import ...
- `__init__.py` 的作用
- 项目目录结构约定（对比 Java 的 src/main/java 结构）
- 相对导入 vs 绝对导入

### 07 - Python 独有特性

- 列表推导式（List Comprehension）：一行代替 for 循环
- 字典推导式、集合推导式
- 生成器（Generator）：yield 关键字，惰性求值
- 切片语法深入：步长、负索引、反转
- enumerate / zip / map / filter
- 多重赋值与交换：`a, b = b, a`
- 字符串乘法：`"ha" * 3` → `"hahaha"`
- walrus 运算符：`:=`（Python 3.8+）

---

## 语法速学之后：完整进阶路径（建议追加）

### 08 - 工程化基础（1-2 天）

- ~~虚拟环境、pip、requirements.txt~~ → 已在 `00-python-environment.md` 中覆盖，跳过
- 重点学习：`pyproject.toml`（现代项目配置）
- 项目结构：包组织、`__init__.py`、模块职责拆分
- 日志与配置：`logging`、环境变量、`.env`
- 测试入门：`pytest`、基础单元测试与参数化测试

### 09 - AI 应用高频能力（2-3 天）

- `async/await`：处理模型 API、数据库、文件 I/O 并发
- 类型注解进阶：`TypedDict`、`Protocol`、泛型
- 数据校验：`pydantic`（FastAPI 常用）
- HTTP 调用：`httpx`（含超时、重试、异常处理）
- JSON/文本文件处理：构建 prompt 输入输出流水线

### 10 - 项目进阶（7 天）—— 直接开发 say-right

- **用真实项目替代 demo**：say-right（英语表达 + 发音评估）本身就涉及 FastAPI + AI API 调用 + 数据管理
- 技术栈：FastAPI + AI API + 数据库 + pytest
- 目标能力：从”会语法”到”可交付 AI 应用”
- 交付标准：
  - 后端 API 可运行
  - AI 接口调用打通（文字转地道表达）
  - 基础测试通过
  - 部署到 railway

### 推荐节奏（10 天）

- Day 1：完成 01-07 语法速学（1-2 小时）+ 10 个小练习
- Day 2：搭建工程骨架（venv、依赖、目录、日志、配置）
- Day 3：补 `pytest` 与 `httpx`，写 API 调用小脚本
- Day 4：FastAPI 基础接口 + 文档上传接口
- Day 5：文本切分与向量化入库
- Day 6：检索 + 生成（RAG 主流程打通）
- Day 7：异常处理、超时重试、参数校验
- Day 8：增加引用片段返回与响应结构统一
- Day 9：补测试（核心流程 + 异常分支）
- Day 10：本地演示、整理 README、复盘改进点
