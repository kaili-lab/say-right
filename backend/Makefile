VENV := ../.venv
PYTHON := $(VENV)/bin/python
PYTEST := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn
RUFF := $(VENV)/bin/ruff
MYPY := $(VENV)/bin/mypy
APP := app.main:app

.PHONY: dev test lint typecheck check db-sync

dev:
	@$(UVICORN) $(APP) --reload --env-file .env

test:
	@$(PYTEST) -q

lint:
	@$(RUFF) check .

typecheck:
	@$(MYPY) .

check: test lint typecheck

db-sync:
	@$(PYTHON) scripts/sync_schema.py
