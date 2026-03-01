# Python 开发环境 - Java/Node 开发者视角

## 一、Python 安装

- Ubuntu 22+ 自带 Python3（本机为 3.12），无需额外安装 Python
- 需要手动安装两个工具：
  ```bash
  sudo apt install python3-pip python3-venv
  ```
- `python3-pip` 和 `python3-venv` 是两个独立的包，不会互相附带

## 二、包管理与环境隔离

### 三个工具的定位

| 工具 | 作用 | Java 类比 | Node 类比 |
|------|------|----------|----------|
| **pip** | 包管理器，安装第三方库 | Maven/Gradle | npm/yarn |
| **venv** | 虚拟环境，项目级依赖隔离 | 无（Java 天然 jar 隔离） | node_modules |
| **conda** | 环境 + 包管理二合一，擅长 AI/科学计算 | 无 | nvm + npm 合体 |

### 主流选择

- 日常开发 / Web / API → `pip + venv`（轻量标准）
- AI / 数据科学 → `conda` 更方便（复杂 C 依赖一键搞定）
- 入门阶段用 pip + venv 足够，遇到复杂依赖再考虑 conda

### venv 的本质

- 和 `node_modules` 一个概念：每个项目有自己独立的依赖目录（`.venv/`）
- 不用 venv 的话，`pip install` 会装到系统全局，多项目依赖版本会冲突
- 对比：
  ```
  Node:   项目A/node_modules/   项目B/node_modules/    ← 各自隔离
  Python: 项目A/.venv/          项目B/.venv/            ← 各自隔离
  Java:   ~/.m2/repository/                             ← 全局共享
  ```

### venv 核心用法（新项目三板斧）

```bash
# 1. 创建虚拟环境（只做一次，类比 npm init）
python3 -m venv .venv

# 2. 激活（每次开新终端要做，类比 nvm use）
source .venv/bin/activate

# 3. 安装依赖
pip install fastapi ipykernel

# 其他常用命令
pip freeze > requirements.txt   # 导出依赖清单（类比 package.json）
pip install -r requirements.txt # 从清单安装（类比 npm install）
deactivate                      # 退出虚拟环境（关终端自动退出）
```

- 激活后终端前缀会变：`(.venv) kai@ubuntu:~/project$`
- VSCode 检测到 `.venv` 后，打开终端会自动激活

## 三、Ubuntu 23+ 的 externally-managed-environment 限制

- Ubuntu 23+ 禁止直接 `pip install` 往系统 Python 里装包
- 报错信息：`externally-managed-environment`
- 解决方案：使用 venv，在虚拟环境里 pip install 不受此限制
- 这也意味着：在 Ubuntu 新版本上，venv 不是可选的，而是必须的

## 四、VSCode 配置

### 必装插件

| 插件 | 作用 | 备注 |
|------|------|------|
| **Python** (Microsoft) | 语法高亮、智能提示、调试、运行 | 必装 |
| **Pylance** (Microsoft) | 类型检查、自动补全 | 必装 |
| **Ruff** | 代码格式化 + lint | 推荐，类比 ESLint + Prettier |

### Jupyter 相关

- 安装 Python 插件后，**Jupyter 插件会自动附带安装**
- 在 VSCode 中直接打开 `.ipynb` 文件即可使用，不需要在浏览器里用
- 需要在项目 venv 中安装 `ipykernel`：
  ```bash
  source .venv/bin/activate
  pip install ipykernel
  ```

### 内核选择器（重要）

- 位置：notebook 文件右上角，显示 Python 版本号的地方
- 新建 `.ipynb` 文件第一次运行时需要手动选择内核 → 选带 `.venv` 的那个
- 选过一次后，该文件会记住，下次打开不用再选
- 注意：是每个文件记住各自的选择，不是目录级别的
- 如果内核一直显示 connecting，按 `Ctrl+Shift+P` → `Jupyter: Restart Kernel`

## 五、Jupyter Notebook vs 浏览器版

- Jupyter Notebook（浏览器版）是独立工具，不是 conda 的功能
- 单独安装：`pip install jupyter` → `jupyter notebook` 启动
- WSL2 环境下会自动在 Win10 浏览器中打开
- 但有 VSCode Jupyter 插件后，**不需要浏览器版**，体验一样
- 用途：写一行运行一行，适合学语法、调试、数据分析

## 六、开发 FastAPI 项目的实际流程

```bash
mkdir my-api && cd my-api
python3 -m venv .venv                    # 只做一次
source .venv/bin/activate                # 每次开终端
pip install fastapi uvicorn              # 装依赖
# 写代码...
uvicorn main:app --reload                # 运行项目
```

VSCode 会自动激活 .venv，所以日常体感就是打开项目直接写代码。
