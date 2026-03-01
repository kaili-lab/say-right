from fastapi import FastAPI


def build_health_payload() -> dict[str, str]:
    return {"status": "ok"}


def create_app() -> FastAPI:
    application = FastAPI(title="say-right-api")

    @application.get("/health")
    async def health() -> dict[str, str]:
        return build_health_payload()

    return application


app = create_app()
