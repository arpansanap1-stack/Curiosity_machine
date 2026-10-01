import {
  ExploreResponse,
  ExpandResponse,
  ExplainResponse,
  RabbitHoleResponse,
  RabbitHoleTravelResponse,
  RabbitHoleCandidate,
  BridgeResponse,
  UserMapResponse,
  MapSyncResponse,
  CuriosityProfileResponse,
  HealthResponse,
  DepthLevel,
  UserNodeState,
  UserTrailStep,
} from '../types';
import { getDeviceId } from './storage';
function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  if (!envUrl) return '/api';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
}

const API_BASE = getApiBase();

export class ApiError extends Error {
  status: number;
  rateLimited: boolean;

  constructor(message: string, status: number, rateLimited = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.rateLimited = rateLimited;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 429) {
      throw new ApiError(
        'The universe is catching its breath… please pause for a moment.',
        429,
        true
      );
    }
    let errorDetail = 'An unexpected error occurred in the observatory.';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // ignore
    }
    throw new ApiError(errorDetail, res.status);
  }
  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthResponse>(res);
}

export async function exploreTopic(topic: string): Promise<ExploreResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/explore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, device_id }),
  });
  return handleResponse<ExploreResponse>(res);
}

export async function expandNode(
  nodeId: string,
  recentTrail?: string[],
  existingLabels?: string[]
): Promise<ExpandResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/expand`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id: nodeId,
      device_id,
      recent_trail: recentTrail,
      existing_labels: existingLabels,
    }),
  });
  return handleResponse<ExpandResponse>(res);
}

export async function fetchExplanation(
  nodeId: string,
  depthLevel: DepthLevel
): Promise<ExplainResponse> {
  const res = await fetch(`${API_BASE}/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id: nodeId,
      depth_level: depthLevel,
      stream: false,
    }),
  });
  return handleResponse<ExplainResponse>(res);
}

export async function streamExplanation(
  nodeId: string,
  depthLevel: DepthLevel,
  onChunk: (chunk: string) => void,
  onNextQuestion: (question: string) => void,
  onDone: (fromCache: boolean) => void,
  onError: (err: Error) => void
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          depth_level: depthLevel,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new ApiError('The universe is catching its breath…', 429, true);
        }
        throw new ApiError(`Explanation request failed (${res.status})`, res.status);
      }

      if (!res.body) {
        throw new Error('No streaming response body available');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');
          if (payload === '[DONE]') {
            onDone(false);
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
            if (parsed.next_question) {
              onNextQuestion(parsed.next_question);
            }
            if (parsed.done) {
              onDone(Boolean(parsed.from_cache));
            }
            if (parsed.error) {
              onError(new Error(parsed.error));
            }
          } catch {
            // Raw text chunk fallback
            if (payload) onChunk(payload);
          }
        }
      }
      onDone(false);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return () => controller.abort();
}

export async function fetchRabbitHoles(nodeId: string): Promise<RabbitHoleResponse> {
  const res = await fetch(`${API_BASE}/rabbit-hole`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: nodeId }),
  });
  return handleResponse<RabbitHoleResponse>(res);
}

export async function travelRabbitHole(
  sourceNodeId: string,
  candidate: RabbitHoleCandidate
): Promise<RabbitHoleTravelResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/rabbit-hole/travel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_node_id: sourceNodeId,
      candidate,
      device_id,
    }),
  });
  return handleResponse<RabbitHoleTravelResponse>(res);
}

export async function findBridge(
  topicA: string,
  topicB: string
): Promise<BridgeResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/bridge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic_a: topicA,
      topic_b: topicB,
      device_id,
    }),
  });
  return handleResponse<BridgeResponse>(res);
}

export async function fetchUserMap(): Promise<UserMapResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/map?device_id=${encodeURIComponent(device_id)}`);
  return handleResponse<UserMapResponse>(res);
}

export async function syncUserMap(
  userNodes: UserNodeState[],
  trails: UserTrailStep[]
): Promise<MapSyncResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/map/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_id,
      user_nodes: userNodes,
      trails,
    }),
  });
  return handleResponse<MapSyncResponse>(res);
}

export async function fetchProfile(): Promise<CuriosityProfileResponse> {
  const device_id = getDeviceId();
  const res = await fetch(`${API_BASE}/profile?device_id=${encodeURIComponent(device_id)}`);
  return handleResponse<CuriosityProfileResponse>(res);
}
