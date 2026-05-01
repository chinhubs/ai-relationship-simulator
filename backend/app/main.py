import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .core.database import init_db
from .api.routes.avatar import router as avatar_router
from .api.routes.simulation import router as simulation_router
from .api.routes.events import router as events_router
from .api.routes.feedback import router as feedback_router
from .api.routes.relationships import router as relationships_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="AI Relationship Simulator",
    description="Digital Persona Relationship Simulator — autonomous AI characters that live, feel, and react.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(avatar_router, prefix="/api/v1")
app.include_router(simulation_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(relationships_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI Relationship Simulator"}


# Serve frontend — must be last so it doesn't shadow API routes
_frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
_frontend_dir = os.path.normpath(_frontend_dir)
if os.path.isdir(_frontend_dir):
    app.mount("/", StaticFiles(directory=_frontend_dir, html=True), name="frontend")
