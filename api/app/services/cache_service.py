"""SQLite-backed LLM and computation caching service."""

import hashlib
import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.entities import LLMCacheEntity


def make_cache_key(prefix: str, payload: Any) -> str:
    """Generate deterministic SHA-256 hash key for given prefix and payload."""
    serialized = json.dumps(payload, sort_keys=True, default=str)
    raw = f"{prefix}:{serialized}".lower().strip()
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def get_cached_response(session: AsyncSession, key: str) -> dict | None:
    """Retrieve cached JSON response if exists, else None."""
    stmt = select(LLMCacheEntity).where(LLMCacheEntity.key == key)
    result = await session.execute(stmt)
    entry = result.scalar_one_or_none()
    if entry:
        try:
            return json.loads(entry.response_json)
        except Exception:
            return None
    return None


async def set_cached_response(session: AsyncSession, key: str, data: dict) -> None:
    """Store JSON response in cache."""
    stmt = select(LLMCacheEntity).where(LLMCacheEntity.key == key)
    result = await session.execute(stmt)
    entry = result.scalar_one_or_none()
    raw_json = json.dumps(data, ensure_ascii=False)
    if entry:
        entry.response_json = raw_json
    else:
        new_entry = LLMCacheEntity(key=key, response_json=raw_json)
        session.add(new_entry)
    await session.commit()


async def count_cached_responses(session: AsyncSession) -> int:
    """Return count of cached entries."""
    from sqlalchemy import func
    stmt = select(func.count()).select_from(LLMCacheEntity)
    result = await session.execute(stmt)
    return result.scalar() or 0
