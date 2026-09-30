"""Integration tests for all FastAPI endpoints with mocked Gemini and SQLite."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.db import init_db
from app.main import app


@pytest.fixture(autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "gemini_configured" in data
        assert "degraded_mode" in data
        assert "cached_queries" in data


@pytest.mark.asyncio
async def test_explore_and_cache_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First call (cold explore)
        unique_topic = f"Fractal Geometry {uuid.uuid4().hex[:6]}"
        payload = {"topic": unique_topic, "device_id": "test_device_01"}
        resp1 = await client.post("/api/explore", json=payload)
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert "root" in data1
        assert "neighbors" in data1
        assert "edges" in data1
        assert len(data1["neighbors"]) >= 6
        assert data1["from_cache"] is False

        root_id = data1["root"]["id"]
        assert root_id != ""

        # Second call with same topic must hit cache
        resp2 = await client.post("/api/explore", json=payload)
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["from_cache"] is True
        assert data2["root"]["id"] == root_id
        assert len(data2["neighbors"]) == len(data1["neighbors"])


@pytest.mark.asyncio
async def test_expand_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First create a root
        explore_payload = {"topic": "Bioluminescence", "device_id": "test_device_02"}
        exp_resp = await client.post("/api/explore", json=explore_payload)
        assert exp_resp.status_code == 200
        root_id = exp_resp.json()["root"]["id"]

        # Expand the root
        expand_payload = {
            "node_id": root_id,
            "device_id": "test_device_02",
            "recent_trail": ["Bioluminescence"],
            "existing_labels": ["Luciferin"],
        }
        resp = await client.post("/api/expand", json=expand_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["parent"]["id"] == root_id
        assert len(data["neighbors"]) >= 6
        assert len(data["edges"]) >= 6


@pytest.mark.asyncio
async def test_explain_endpoint_all_depths():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create node
        exp_resp = await client.post("/api/explore", json={"topic": "Black Holes", "device_id": "test_device_03"})
        root_id = exp_resp.json()["root"]["id"]

        for depth in ["simple", "student", "undergrad", "expert"]:
            req_payload = {
                "node_id": root_id,
                "depth_level": depth,
                "stream": False,
            }
            resp = await client.post("/api/explain", json=req_payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["node_id"] == root_id
            assert data["depth_level"] == depth
            assert len(data["text"]) > 20
            assert "next_question" in data

            # Second request at same depth should return cached
            resp_cached = await client.post("/api/explain", json=req_payload)
            assert resp_cached.status_code == 200
            assert resp_cached.json()["from_cache"] is True


@pytest.mark.asyncio
async def test_rabbit_hole_and_travel():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create node
        exp_resp = await client.post("/api/explore", json={"topic": "Neural Networks", "device_id": "test_device_04"})
        root_id = exp_resp.json()["root"]["id"]

        # Request rabbit holes
        rh_resp = await client.post("/api/rabbit-hole", json={"node_id": root_id})
        assert rh_resp.status_code == 200
        rh_data = rh_resp.json()
        assert "candidates" in rh_data
        assert len(rh_data["candidates"]) == 3

        selected_candidate = rh_data["candidates"][0]
        assert "label" in selected_candidate
        assert "surprise_score" in selected_candidate
        assert "teaser" in selected_candidate

        # Travel down rabbit hole
        travel_payload = {
            "source_node_id": root_id,
            "candidate": selected_candidate,
            "device_id": "test_device_04",
        }
        travel_resp = await client.post("/api/rabbit-hole/travel", json=travel_payload)
        assert travel_resp.status_code == 200
        travel_data = travel_resp.json()
        assert travel_data["destination"]["label"] == selected_candidate["label"]
        assert travel_data["edge"]["source_id"] == root_id
        assert travel_data["edge"]["target_id"] == travel_data["destination"]["id"]


@pytest.mark.asyncio
async def test_bridge_finder():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "topic_a": "Mycelium Networks",
            "topic_b": "Internet Routing",
            "device_id": "test_device_05",
        }
        resp = await client.post("/api/bridge", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["nodes"]) >= 3
        assert len(data["edges"]) >= 2
        assert len(data["hops"]) == len(data["nodes"])
        assert data["overall_story"] != ""


@pytest.mark.asyncio
async def test_user_map_sync_and_profile():
    device_id = "test_device_profile_99"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Explore something
        await client.post("/api/explore", json={"topic": "Astrophysics", "device_id": device_id})

        # Get map
        map_resp = await client.get(f"/api/map?device_id={device_id}")
        assert map_resp.status_code == 200
        map_data = map_resp.json()
        assert map_data["total_explored"] >= 1
        assert len(map_data["trails"]) >= 1

        # Get profile
        profile_resp = await client.get(f"/api/profile?device_id={device_id}")
        assert profile_resp.status_code == 200
        profile_data = profile_resp.json()
        assert profile_data["device_id"] == device_id
        assert profile_data["total_explored"] >= 1
        assert profile_data["explorer_type"] != ""
        assert profile_data["title"] != ""
        assert profile_data["tagline"] != ""
        assert profile_data["streak_days"] >= 1
