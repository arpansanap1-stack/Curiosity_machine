import { get, set } from 'idb-keyval';
import { Node, Edge, UserNodeState, UserTrailStep } from '../types';

const DEVICE_KEY = 'curiosity_device_id';
const THEME_KEY = 'curiosity_theme';
const IDB_NODES_KEY = 'cm_offline_nodes';
const IDB_EDGES_KEY = 'cm_offline_edges';
const IDB_USER_NODES_KEY = 'cm_offline_user_nodes';
const IDB_TRAILS_KEY = 'cm_offline_trails';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `cm_dev_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type ThemeMode = 'observatory' | 'atlas';

export function getStoredTheme(): ThemeMode {
  const t = localStorage.getItem(THEME_KEY);
  if (t === 'atlas' || t === 'observatory') {
    return t;
  }
  // Respect system prefers-color-scheme
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'atlas';
  }
  return 'observatory';
}

export function setStoredTheme(theme: ThemeMode): void {
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export async function saveOfflineUniverse(
  nodes: Node[],
  edges: Edge[],
  userNodes: UserNodeState[],
  trails: UserTrailStep[]
): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  try {
    await set(IDB_NODES_KEY, nodes);
    await set(IDB_EDGES_KEY, edges);
    await set(IDB_USER_NODES_KEY, userNodes);
    await set(IDB_TRAILS_KEY, trails);
  } catch (err) {
    console.warn('Failed to save offline universe to IndexedDB:', err);
  }
}

export async function loadOfflineUniverse(): Promise<{
  nodes: Node[];
  edges: Edge[];
  userNodes: UserNodeState[];
  trails: UserTrailStep[];
} | null> {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  try {
    const nodes = (await get(IDB_NODES_KEY)) as Node[] | undefined;
    const edges = (await get(IDB_EDGES_KEY)) as Edge[] | undefined;
    const userNodes = (await get(IDB_USER_NODES_KEY)) as UserNodeState[] | undefined;
    const trails = (await get(IDB_TRAILS_KEY)) as UserTrailStep[] | undefined;

    if (nodes && nodes.length > 0) {
      return {
        nodes,
        edges: edges || [],
        userNodes: userNodes || [],
        trails: trails || [],
      };
    }
  } catch (err) {
    console.warn('Failed to load offline universe from IndexedDB:', err);
  }
  return null;
}
