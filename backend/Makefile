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
