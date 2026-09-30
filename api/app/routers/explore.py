"""Exploration, expansion, explanation, discovery, and personal map router."""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.db import get_db
from ..models.schemas import (
    BridgeRequest,
    BridgeResponse,
    CuriosityProfileResponse,
    ExpandRequest,
    ExpandResponse,
    ExplainRequest,
    ExplainResponse,
    ExploreRequest,
    ExploreResponse,
    MapSyncRequest,
    MapSyncResponse,
    RabbitHoleResponse,
    RabbitHoleTravelRequest,
    RabbitHoleTravelResponse,
    UserMapResponse,
)
from ..services.graph_service import graph_service

router = APIRouter(prefix="/api", tags=["exploration"])


@router.post("/explore", response_model=ExploreResponse)
async def explore_topic(
    req: ExploreRequest,
    session: AsyncSession = Depends(get_db),
):
    """Explore a new topic. Generates root star + 6-8 connected concepts."""
    try:
        return await graph_service.explore(session, req.topic, req.device_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to explore topic: {str(e)}")


@router.post("/expand", response_model=ExpandResponse)
async def expand_node(
    req: ExpandRequest,
    session: AsyncSession = Depends(get_db),
):
    """Expand an existing star to reveal 6-8 connected neighbors."""
    try:
        return await graph_service.expand_node(
            session=session,
            node_id=req.node_id,
            device_id=req.device_id,
            recent_trail=req.recent_trail,
            existing_labels=req.existing_labels,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to expand node: {str(e)}")


@router.post("/explain")
async def explain_node(
    req: ExplainRequest,
    session: AsyncSession = Depends(get_db),
):
    """Explain a node at the requested depth level. Supports streaming SSE or JSON."""
    if not req.stream:
        try:
            text, next_q, from_cache = await graph_service.get_or_create_explanation(
                session, req.node_id, req.depth_level
            )
            return ExplainResponse(
                node_id=req.node_id,
                depth_level=req.depth_level,
                text=text,
                next_question=next_q,
                from_cache=from_cache,
            )
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to explain node: {str(e)}")

    # Streaming SSE
    async def event_generator() -> AsyncGenerator[str, None]:
        # Check if already in cache first
        try:
            text, next_q, from_cache = await graph_service.get_or_create_explanation(
                session, req.node_id, req.depth_level
            )
            # If from cache or pre-generated, stream out in rapid natural bursts
            words = text.split(" ")
            for w in words:
                yield f"data: {json.dumps({'chunk': w + ' ', 'done': False})}\n\n"
            if next_q:
                yield f"data: {json.dumps({'next_question': next_q, 'done': False})}\n\n"
            yield f"data: {json.dumps({'done': True, 'from_cache': from_cache})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/rabbit-hole", response_model=RabbitHoleResponse)
async def get_rabbit_holes(
    req: dict,
    session: AsyncSession = Depends(get_db),
):
    """Generate 3 unexpected rabbit hole candidates from a node."""
    node_id = req.get("node_id")
    if not node_id:
        raise HTTPException(status_code=400, detail="node_id is required.")
    try:
        return await graph_service.get_rabbit_holes(session, node_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find rabbit holes: {str(e)}")


@router.post("/rabbit-hole/travel", response_model=RabbitHoleTravelResponse)
async def travel_rabbit_hole(
    req: RabbitHoleTravelRequest,
    session: AsyncSession = Depends(get_db),
):
    """Execute warp travel into a rabbit hole."""
    try:
        return await graph_service.travel_rabbit_hole(
            session=session,
            source_node_id=req.source_node_id,
            candidate=req.candidate,
            device_id=req.device_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to travel to rabbit hole: {str(e)}")


@router.post("/bridge", response_model=BridgeResponse)
async def find_bridge(
    req: BridgeRequest,
    session: AsyncSession = Depends(get_db),
):
    """Find a 3-5 hop conceptual bridge connecting two distant topics."""
    try:
        return await graph_service.find_bridge(
            session=session,
            topic_a=req.topic_a,
            topic_b=req.topic_b,
            device_id=req.device_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find bridge: {str(e)}")


@router.get("/map", response_model=UserMapResponse)
async def get_user_map(
    device_id: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_db),
):
    """Fetch personal exploration map and trail state for device."""
    try:
        return await graph_service.get_user_map(session, device_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load user map: {str(e)}")


@router.post("/map/sync", response_model=MapSyncResponse)
async def sync_user_map(
    req: MapSyncRequest,
    session: AsyncSession = Depends(get_db),
):
    """Sync client-side offline storage state to backend."""
    try:
        return await graph_service.sync_user_map(
            session=session,
            device_id=req.device_id,
            user_nodes=req.user_nodes,
            trails=req.trails,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync map: {str(e)}")


@router.get("/profile", response_model=CuriosityProfileResponse)
async def get_curiosity_profile(
    device_id: str = Query(..., min_length=1),
    session: AsyncSession = Depends(get_db),
):
    """Generate personal curiosity metrics and profile card data."""
    try:
        return await graph_service.get_curiosity_profile(session, device_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute curiosity profile: {str(e)}")
