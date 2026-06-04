from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import models  # noqa: F401  (registers models on Base.metadata)
from .api.routes import apps, builds, generation, websocket
from .database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="Backend API", version="1.0.0", lifespan=lifespan)

app.include_router(generation.router)
app.include_router(apps.router)
app.include_router(builds.router)
app.include_router(websocket.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Backend API", "version": "1.0.0"}
