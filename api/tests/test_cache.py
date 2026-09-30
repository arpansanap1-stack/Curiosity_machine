"""Tests for SQLite caching service."""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.db import Base
from app.services.cache_service import (
    count_cached_responses,
    get_cached_response,
    make_cache_key,
    set_cached_response,
)


@pytest.fixture
async def in_memory_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


def test_make_cache_key_deterministic():
    key1 = make_cache_key("explore", {"topic": "Black Holes"})
    key2 = make_cache_key("explore", {"topic": "Black Holes"})
    key3 = make_cache_key("explore", {"topic": "black holes"})
    key4 = make_cache_key("explore", {"topic": "Quantum Mechanics"})

    assert key1 == key2
    assert key1 == key3  # Case-normalized
    assert key1 != key4
    assert len(key1) == 64  # SHA-256 hex


@pytest.mark.asyncio
async def test_cache_miss_and_hit(in_memory_db: AsyncSession):
    key = make_cache_key("test", {"query": "sample"})

    # Cache miss
    cached = await get_cached_response(in_memory_db, key)
    assert cached is None

    # Set cache
    payload = {"result": "success", "count": 42}
    await set_cached_response(in_memory_db, key, payload)

    # Cache hit
    cached = await get_cached_response(in_memory_db, key)
    assert cached is not None
    assert cached["result"] == "success"
    assert cached["count"] == 42

    # Verify count
    count = await count_cached_responses(in_memory_db)
    assert count == 1
