"""Curiosity Machine FastAPI application."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .core.config import settings
from .core.db import init_db
from .routers import explore, health

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("curiosity_machine")

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Curiosity Machine database...")
    await init_db()
    logger.info("Database initialized successfully.")
    yield


app = FastAPI(
    title="Curiosity Machine API",
    description="Knowledge Universe exploration platform engine powered by Gemini and Wikipedia grounding",
    version="1.0.0",
    lifespan=lifespan,
)

# Set limiter state
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda req, exc: JSONResponse(
        status_code=429,
        content={
            "detail": "The universe is catching its breath… please pause for a moment",
            "rate_limited": True,
        },
    ),
)

# CORS configuration
origins = settings.cors_origin_list
if not origins:
    origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

is_wildcard = "*" in origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not is_wildcard else ["*"],
    allow_origin_regex=r"https://.*\.vercel\.app" if not is_wildcard else None,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health.router)
app.include_router(explore.router)


@app.get("/")
async def root():
    return {
        "name": "Curiosity Machine API",
        "tagline": "Turn any topic into an explorable knowledge universe",
        "version": "1.0.0",
        "docs": "/docs",
    }
