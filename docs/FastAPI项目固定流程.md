# FastAPI 项目实现固定流程（可复用）

> 版本：v1.0  
> 整理日期：2026-03-01  
> 适用范围：新建 FastAPI 后端项目，目标是避免遗漏基础工程化能力（测试 / lint / typecheck）

---

## 一、目标

建立一套可直接复用到新仓库的 FastAPI 启动流程，确保“功能开发”与“质量门禁”同时落地，不再出现只装了运行依赖、漏掉 `ruff/mypy` 的情况。

---

## 二、项目开局四件套（必须在第一天完成）

1. **依赖基线**：运行依赖 + 开发依赖（含 `pytest`、`ruff`、`mypy`）一次性写入
2. **命令基线**：`make dev / test / lint / typecheck / check` 一次性就位
3. **文档基线**：README 里明确一键命令；开发文档写明虚拟环境与 `.env`
4. **校验基线**：在功能开发前先跑一次 `make check`，确保质量链路是通的

---

## 三、可复制的最小目录（建议）

```text
backend/
  app/
  tests/
  pyproject.toml
  Makefile
  .env.example
  README.md
  DEVELOPMENT.md
```

---

## 四、依赖清单模板（可直接复制）

> 建议：运行依赖与开发依赖分开，开发依赖统一放 `project.optional-dependencies.dev`。

```toml
[project]
dependencies = [
  "fastapi>=0.134.0,<1.0",
  "uvicorn>=0.41.0,<1.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=9.0.0,<10.0",
  "httpx>=0.28.0,<1.0",
  "ruff>=0.13.0,<1.0",
  "mypy>=1.18.0,<2.0",
]
```

---

## 五、Makefile 模板（可直接复制）

```makefile
VENV := ../.venv
PYTEST := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn
RUFF := $(VENV)/bin/ruff
MYPY := $(VENV)/bin/mypy
APP := app.main:app

.PHONY: dev test lint typecheck check

dev:
	@set -a; [ -f .env ] && . ./.env; set +a; \
	$(UVICORN) $(APP) --reload

test:
	@$(PYTEST) -q

lint:
	@$(RUFF) check .

typecheck:
	@$(MYPY) .

check: test lint typecheck
```

---

## 六、首次安装与验证（固定步骤）

```bash
python3 -m venv .venv
./.venv/bin/pip install -e "./backend[dev]"
cp backend/.env.example backend/.env
make -C backend check
```

验收标准：
- `make -C backend check` 必须一次通过
- 任何一个子命令失败，都不进入下一步功能开发

---

## 七、任务模板里的强制字段（防漏）

每个后端 task 至少包含：
- `execution_context`：命令在哪个目录执行、如何激活环境
- `dependency_changes`：新增依赖、版本、安装命令
- `test_commands`：本任务验证命令
- `DoD`：必须包含“全量测试 + lint + typecheck 通过”

---

## 八、常见漏项与防呆策略

- 漏装 `ruff/mypy`：在第一天执行 `make check`，可立即暴露
- 命令只在个人 shell 可用：统一使用 `../.venv/bin/...`，不依赖“自动激活”
- 只跑测试不跑静态检查：把 `check` 作为默认验收命令
- 改了依赖但文档没更新：任务交付时强制填写 `dependency_changes`

---

## 九、可复用到新项目的最小复制集

如果你要在新项目照搬，至少复制：
1. 本文档（`docs/FastAPI项目固定流程.md`）
2. `pyproject.toml` 的依赖基线段落
3. `Makefile` 的 `dev/test/lint/typecheck/check` 模板
4. README/DEVELOPMENT 中的一键命令说明
