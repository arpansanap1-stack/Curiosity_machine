"""Health and status endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.config import settings
from ..core.db import get_db
from ..models.schemas import HealthResponse
from ..services.cache_service import count_cached_responses

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(session: AsyncSession = Depends(get_db)):
    """Return health status, degraded mode status, and cached query metrics."""
    cached_count = await count_cached_responses(session)
    return HealthResponse(
        status="ok",
        gemini_configured=bool(settings.gemini_api_key),
        model=settings.gemini_model,
        degraded_mode=settings.force_degraded_mode or not bool(settings.gemini_api_key),
        cached_queries=cached_count,
    )
