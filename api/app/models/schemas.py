"""Pydantic schemas mirroring TypeScript types strictly."""

from enum import StrEnum

from pydantic import BaseModel, Field


class Domain(StrEnum):
    SCIENCE = "science"
    NATURE = "nature"
    HISTORY = "history"
    ART = "art"
    TECH = "tech"
    MATH = "math"
    PHILOSOPHY = "philosophy"
    SOCIETY = "society"
    OTHER = "other"


class RelationType(StrEnum):
    CAUSES = "causes"
    PART_OF = "part_of"
    ANALOGOUS_TO = "analogous_to"
    CONTRASTS_WITH = "contrasts_with"
    INSPIRED = "inspired"
    ORIGIN_OF = "origin_of"
    APPLIES_TO = "applies_to"


class DepthLevel(StrEnum):
    SIMPLE = "simple"
    STUDENT = "student"
    UNDERGRAD = "undergrad"
    EXPERT = "expert"


class Node(BaseModel):
    id: str
    slug: str
    label: str
    domain: Domain
    summary_short: str = Field(..., max_length=180)
    wiki_title: str | None = None
    wiki_url: str | None = None
    wiki_extract: str | None = None
    verified: bool = False
    is_wildcard: bool = False
    depth_explored: DepthLevel = DepthLevel.SIMPLE
    created_at: str


class Edge(BaseModel):
    id: str
    source_id: str
    target_id: str
    relation_type: RelationType
    why: str = Field(..., max_length=250)
    surprise_score: float = Field(0.0, ge=0.0, le=1.0)
    created_at: str


class NodeExplanation(BaseModel):
    node_id: str
    depth_level: DepthLevel
    text: str
    next_question: str | None = None
    created_at: str


class ExploreRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    device_id: str = Field(..., min_length=1, max_length=100)


class ExploreResponse(BaseModel):
    root: Node
    neighbors: list[Node]
    edges: list[Edge]
    from_cache: bool = False
    degraded: bool = False


class ExpandRequest(BaseModel):
    node_id: str
    device_id: str
    recent_trail: list[str] | None = None
    existing_labels: list[str] | None = None


class ExpandResponse(BaseModel):
    parent: Node
    neighbors: list[Node]
    edges: list[Edge]
    from_cache: bool = False
    degraded: bool = False


class ExplainRequest(BaseModel):
    node_id: str
    depth_level: DepthLevel
    stream: bool = True


class ExplainResponse(BaseModel):
    node_id: str
    depth_level: DepthLevel
    text: str
    next_question: str | None = None
    from_cache: bool = False


class RabbitHoleCandidate(BaseModel):
    candidate_id: str
    label: str
    domain: Domain
    summary_short: str
    relation_type: RelationType
    why: str
    surprise_score: float = Field(..., ge=0.0, le=1.0)
    teaser: str
    wikipedia_title: str | None = None


class RabbitHoleResponse(BaseModel):
    source_node: Node
    candidates: list[RabbitHoleCandidate]


class RabbitHoleTravelRequest(BaseModel):
    source_node_id: str
    candidate: RabbitHoleCandidate
    device_id: str


class RabbitHoleTravelResponse(BaseModel):
    destination: Node
    edge: Edge


class BridgeRequest(BaseModel):
    topic_a: str = Field(..., min_length=1, max_length=150)
    topic_b: str = Field(..., min_length=1, max_length=150)
    device_id: str


class BridgeHop(BaseModel):
    node: Node
    edge_to_next: Edge | None = None
    step_story: str


class BridgeResponse(BaseModel):
    nodes: list[Node]
    edges: list[Edge]
    hops: list[BridgeHop]
    overall_story: str


class UserNodeState(BaseModel):
    device_id: str
    node_id: str
    explored_at: str
    depth_level: DepthLevel
    starred: bool = False
    notes: str | None = None


class UserTrailStep(BaseModel):
    device_id: str
    step: int
    node_id: str
    from_node_id: str | None = None
    via: str
    at: str


class UserMapResponse(BaseModel):
    nodes: list[Node]
    edges: list[Edge]
    user_nodes: list[UserNodeState]
    trails: list[UserTrailStep]
    total_explored: int
    domain_counts: dict[str, int]


class MapSyncRequest(BaseModel):
    device_id: str
    user_nodes: list[UserNodeState]
    trails: list[UserTrailStep]


class MapSyncResponse(BaseModel):
    status: str = "ok"
    synced_nodes: int
    synced_trails: int


class CuriosityProfileResponse(BaseModel):
    device_id: str
    explorer_type: str
    title: str
    tagline: str
    total_explored: int
    domain_distribution: dict[str, int]
    blind_spots: list[str]
    top_rabbit_holes: list[str]
    streak_days: int
    deepest_depth: DepthLevel
    created_at: str


class HealthResponse(BaseModel):
    status: str = "ok"
    gemini_configured: bool
    model: str
    degraded_mode: bool
    cached_queries: int


# Structured Schemas for LLM Output Parsing
class LLMNeighborOutput(BaseModel):
    label: str
    domain: Domain
    summary_short: str
    relation_type: RelationType
    why: str
    surprise_score: float = 0.5
    is_wildcard: bool = False
    wikipedia_title: str | None = None


class LLMExpansionOutput(BaseModel):
    root: LLMNeighborOutput | None = None
    neighbors: list[LLMNeighborOutput]


class LLMRabbitHoleCandidateOutput(BaseModel):
    label: str
    domain: Domain
    summary_short: str
    relation_type: RelationType
    why: str
    surprise_score: float = 0.85
    teaser: str
    wikipedia_title: str | None = None


class LLMRabbitHoleOutput(BaseModel):
    candidates: list[LLMRabbitHoleCandidateOutput]


class LLMBridgeStepOutput(BaseModel):
    label: str
    domain: Domain
    summary_short: str
    relation_type: RelationType
    why: str
    step_story: str
    wikipedia_title: str | None = None


class LLMBridgeOutput(BaseModel):
    steps: list[LLMBridgeStepOutput]
    overall_story: str
