VENV := ../.venv
PYTEST := $(VENV)/bin/pytest
UVICORN := $(VENV)/bin/uvicorn
APP := app.main:app

.PHONY: dev test

dev:
	@set -a; [ -f .env ] && . ./.env; set +a; \
	$(UVICORN) $(APP) --reload

test:
	@$(PYTEST) -q
