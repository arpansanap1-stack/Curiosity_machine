"""Tests for Pydantic models, enums, and validation constraints."""

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    BridgeRequest,
    DepthLevel,
    Domain,
    Edge,
    ExploreRequest,
    Node,
    RelationType,
)


def test_domain_enum_values():
    expected = {"science", "nature", "history", "art", "tech", "math", "philosophy", "society", "other"}
    actual = {d.value for d in Domain}
    assert actual == expected


def test_relation_type_enum_values():
    expected = {"causes", "part_of", "analogous_to", "contrasts_with", "inspired", "origin_of", "applies_to"}
    actual = {r.value for r in RelationType}
    assert actual == expected


def test_depth_level_enum_values():
    expected = {"simple", "student", "undergrad", "expert"}
    actual = {dl.value for dl in DepthLevel}
    assert actual == expected


def test_node_schema_validation():
    valid_node = Node(
        id="node_123",
        slug="quantum-entanglement",
        label="Quantum Entanglement",
        domain=Domain.SCIENCE,
        summary_short="Pairs of particles interacting in quantum superposition.",
        wiki_title="Quantum entanglement",
        wiki_url="https://en.wikipedia.org/wiki/Quantum_entanglement",
        verified=True,
        is_wildcard=False,
        created_at="2026-09-30T12:00:00Z",
    )
    assert valid_node.label == "Quantum Entanglement"
    assert valid_node.verified is True
    assert valid_node.domain == Domain.SCIENCE

    # Length constraint on summary_short
    with pytest.raises(ValidationError):
        Node(
            id="node_fail",
            slug="fail",
            label="Fail",
            domain=Domain.TECH,
            summary_short="x" * 250,  # Exceeds max_length=180
            created_at="2026-09-30T12:00:00Z",
        )


def test_edge_schema_validation():
    valid_edge = Edge(
        id="edge_123",
        source_id="node_1",
        target_id="node_2",
        relation_type=RelationType.INSPIRED,
        why="Natural swarm intelligence inspired computer algorithms.",
        surprise_score=0.85,
        created_at="2026-09-30T12:00:00Z",
    )
    assert valid_edge.relation_type == RelationType.INSPIRED
    assert valid_edge.surprise_score == 0.85

    # Surprise score bounds
    with pytest.raises(ValidationError):
        Edge(
            id="edge_fail",
            source_id="node_1",
            target_id="node_2",
            relation_type=RelationType.CAUSES,
            why="test",
            surprise_score=1.5,  # Exceeds 1.0
            created_at="2026-09-30T12:00:00Z",
        )


def test_explore_request_validation():
    req = ExploreRequest(topic="Black Holes", device_id="device_abc123")
    assert req.topic == "Black Holes"
    assert req.device_id == "device_abc123"

    with pytest.raises(ValidationError):
        ExploreRequest(topic="", device_id="dev")  # empty topic


def test_bridge_request_validation():
    req = BridgeRequest(topic_a="Octopus Intelligence", topic_b="Alien Cryptography", device_id="dev_1")
    assert req.topic_a == "Octopus Intelligence"
    assert req.topic_b == "Alien Cryptography"
