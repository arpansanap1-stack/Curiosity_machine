/**
 * TypeScript Data Models mirroring Python Pydantic models field-for-field.
 * Section 10.1 Correctness Protocol compliance.
 */

export type Domain =
  | 'science'
  | 'nature'
  | 'history'
  | 'art'
  | 'tech'
  | 'math'
  | 'philosophy'
  | 'society'
  | 'other';

export type RelationType =
  | 'causes'
  | 'part_of'
  | 'analogous_to'
  | 'contrasts_with'
  | 'inspired'
  | 'origin_of'
  | 'applies_to';

export type DepthLevel = 'simple' | 'student' | 'undergrad' | 'expert';

export interface Node {
  id: string;
  slug: string;
  label: string;
  domain: Domain;
  summary_short: string;
  wiki_title?: string | null;
  wiki_url?: string | null;
  wiki_extract?: string | null;
  verified: boolean;
  is_wildcard: boolean;
  depth_explored: DepthLevel;
  created_at: string;

  // D3 force simulation coordinate augmentation
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
  brightness?: number;
  unexplored?: boolean;
  expanded?: boolean;
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: RelationType;
  why: string;
  surprise_score: number;
  created_at: string;

  // D3 graph link references
  source?: string | Node;
  target?: string | Node;
}

export interface NodeExplanation {
  node_id: string;
  depth_level: DepthLevel;
  text: string;
  next_question?: string | null;
  created_at: string;
}

export interface ExploreRequest {
  topic: string;
  device_id: string;
}

export interface ExploreResponse {
  root: Node;
  neighbors: Node[];
  edges: Edge[];
  from_cache: boolean;
  degraded: boolean;
}

export interface ExpandRequest {
  node_id: string;
  device_id: string;
  recent_trail?: string[];
  existing_labels?: string[];
}

export interface ExpandResponse {
  parent: Node;
  neighbors: Node[];
  edges: Edge[];
  from_cache: boolean;
  degraded: boolean;
}

export interface ExplainRequest {
  node_id: string;
  depth_level: DepthLevel;
  stream?: boolean;
}

export interface ExplainResponse {
  node_id: string;
  depth_level: DepthLevel;
  text: string;
  next_question?: string | null;
  from_cache: boolean;
}

export interface RabbitHoleCandidate {
  candidate_id: string;
  label: string;
  domain: Domain;
  summary_short: string;
  relation_type: RelationType;
  why: string;
  surprise_score: number;
  teaser: string;
  wikipedia_title?: string | null;
}

export interface RabbitHoleResponse {
  source_node: Node;
  candidates: RabbitHoleCandidate[];
}

export interface RabbitHoleTravelRequest {
  source_node_id: string;
  candidate: RabbitHoleCandidate;
  device_id: string;
}

export interface RabbitHoleTravelResponse {
  destination: Node;
  edge: Edge;
}

export interface BridgeRequest {
  topic_a: string;
  topic_b: string;
  device_id: string;
}

export interface BridgeHop {
  node: Node;
  edge_to_next?: Edge | null;
  step_story: string;
}

export interface BridgeResponse {
  nodes: Node[];
  edges: Edge[];
  hops: BridgeHop[];
  overall_story: string;
}

export interface UserNodeState {
  device_id: string;
  node_id: string;
  explored_at: string;
  depth_level: DepthLevel;
  starred: boolean;
  notes?: string | null;
}

export interface UserTrailStep {
  device_id: string;
  step: number;
  node_id: string;
  from_node_id?: string | null;
  via: string;
  at: string;
}

export interface UserMapResponse {
  nodes: Node[];
  edges: Edge[];
  user_nodes: UserNodeState[];
  trails: UserTrailStep[];
  total_explored: number;
  domain_counts: Record<string, number>;
}

export interface MapSyncRequest {
  device_id: string;
  user_nodes: UserNodeState[];
  trails: UserTrailStep[];
}

export interface MapSyncResponse {
  status: string;
  synced_nodes: number;
  synced_trails: number;
}

export interface CuriosityProfileResponse {
  device_id: string;
  explorer_type: string;
  title: string;
  tagline: string;
  total_explored: number;
  domain_distribution: Record<string, number>;
  blind_spots: string[];
  top_rabbit_holes: string[];
  streak_days: number;
  deepest_depth: DepthLevel;
  created_at: string;
}

export interface HealthResponse {
  status: string;
  gemini_configured: boolean;
  model: string;
  degraded_mode: boolean;
  cached_queries: number;
}
