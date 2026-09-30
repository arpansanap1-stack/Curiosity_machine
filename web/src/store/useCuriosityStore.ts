import { create } from 'zustand';
import { Node, Edge, DepthLevel, Domain, UserTrailStep, UserNodeState } from '../types';
import { getStoredTheme, setStoredTheme, ThemeMode, saveOfflineUniverse, loadOfflineUniverse } from '../lib/storage';

export type ViewMode = 'explore' | 'map' | 'bridge' | 'profile';

interface CuriosityState {
  // Current view
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Universe graph state
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeDepth: DepthLevel;
  trail: string[];
  userNodes: Record<string, UserNodeState>;
  trailSteps: UserTrailStep[];

  // Graph actions
  setGraphData: (nodes: Node[], edges: Edge[]) => void;
  addNodesAndEdges: (newNodes: Node[], newEdges: Edge[]) => void;
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setActiveDepth: (depth: DepthLevel) => void;
  toggleStarNode: (nodeId: string) => void;
  updateNodeNotes: (nodeId: string, notes: string) => void;
  recordTrailVisit: (nodeId: string, fromNodeId?: string | null, via?: string) => void;

  // UI Panels and Overlays
  isInspectorOpen: boolean;
  setInspectorOpen: (open: boolean) => void;
  isRabbitHoleDrawerOpen: boolean;
  setRabbitHoleDrawerOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  isAccessibleListView: boolean;
  setAccessibleListView: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;

  // Warp animation state
  warpTarget: { x: number; y: number; nodeId: string } | null;
  triggerWarp: (x: number, y: number, nodeId: string) => void;
  clearWarp: () => void;

  // Global settings and status
  theme: ThemeMode;
  toggleTheme: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (loading: boolean, message?: string) => void;
  isDegraded: boolean;
  setDegraded: (degraded: boolean) => void;

  // Filters for Map view
  filterDomain: Domain | 'all';
  setFilterDomain: (domain: Domain | 'all') => void;
  searchFilter: string;
  setSearchFilter: (query: string) => void;

  // Offline hydration
  hydrateOffline: () => Promise<boolean>;
  persistOffline: () => Promise<void>;
}

export const useCuriosityStore = create<CuriosityState>((set, get) => ({
  viewMode: 'explore',
  setViewMode: (mode) => set({ viewMode: mode }),

  nodes: [],
  edges: [],
  selectedNodeId: null,
  hoveredNodeId: null,
  activeDepth: 'simple',
  trail: [],
  userNodes: {},
  trailSteps: [],

  setGraphData: (nodes, edges) => {
    set({ nodes, edges });
    get().persistOffline();
  },

  addNodesAndEdges: (newNodes, newEdges) => {
    const state = get();
    const existingNodeIds = new Set(state.nodes.map((n) => n.id));
    const nodesToAdd = newNodes.filter((n) => !existingNodeIds.has(n.id));

    const existingEdgeIds = new Set(state.edges.map((e) => e.id));
    const edgesToAdd = newEdges.filter((e) => !existingEdgeIds.has(e.id));

    const mergedNodes = [...state.nodes, ...nodesToAdd];
    const mergedEdges = [...state.edges, ...edgesToAdd];

    set({ nodes: mergedNodes, edges: mergedEdges });
    get().persistOffline();
  },

  selectNode: (nodeId) => {
    set((state) => {
      if (!nodeId) {
        return { selectedNodeId: null };
      }
      const newTrail = state.trail.includes(nodeId)
        ? state.trail
        : [...state.trail, nodeId];
      return {
        selectedNodeId: nodeId,
        isInspectorOpen: true,
        trail: newTrail,
      };
    });
    if (nodeId) {
      get().recordTrailVisit(nodeId);
    }
  },

  setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),

  setActiveDepth: (depth) => {
    set({ activeDepth: depth });
    const { selectedNodeId, userNodes } = get();
    if (selectedNodeId && userNodes[selectedNodeId]) {
      const updated = { ...userNodes[selectedNodeId], depth_level: depth };
      set({ userNodes: { ...userNodes, [selectedNodeId]: updated } });
      get().persistOffline();
    }
  },

  toggleStarNode: (nodeId) => {
    set((state) => {
      const current = state.userNodes[nodeId];
      const isStarred = current ? !current.starred : true;
      const updated: UserNodeState = current
        ? { ...current, starred: isStarred }
        : {
            device_id: 'local',
            node_id: nodeId,
            explored_at: new Date().toISOString(),
            depth_level: state.activeDepth,
            starred: true,
          };
      return {
        userNodes: { ...state.userNodes, [nodeId]: updated },
      };
    });
    get().persistOffline();
  },

  updateNodeNotes: (nodeId, notes) => {
    set((state) => {
      const current = state.userNodes[nodeId];
      const updated: UserNodeState = current
        ? { ...current, notes }
        : {
            device_id: 'local',
            node_id: nodeId,
            explored_at: new Date().toISOString(),
            depth_level: state.activeDepth,
            starred: false,
            notes,
          };
      return {
        userNodes: { ...state.userNodes, [nodeId]: updated },
      };
    });
    get().persistOffline();
  },

  recordTrailVisit: (nodeId, fromNodeId, via = 'explore') => {
    set((state) => {
      const step = state.trailSteps.length + 1;
      const newStep: UserTrailStep = {
        device_id: 'local',
        step,
        node_id: nodeId,
        from_node_id: fromNodeId || null,
        via,
        at: new Date().toISOString(),
      };
      const existingUserNode = state.userNodes[nodeId] || {
        device_id: 'local',
        node_id: nodeId,
        explored_at: new Date().toISOString(),
        depth_level: state.activeDepth,
        starred: false,
      };
      return {
        trailSteps: [...state.trailSteps, newStep],
        userNodes: { ...state.userNodes, [nodeId]: existingUserNode },
      };
    });
    get().persistOffline();
  },

  isInspectorOpen: false,
  setInspectorOpen: (open) => set({ isInspectorOpen: open }),

  isRabbitHoleDrawerOpen: false,
  setRabbitHoleDrawerOpen: (open) => set({ isRabbitHoleDrawerOpen: open }),

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  isAccessibleListView: false,
  setAccessibleListView: (open) => set({ isAccessibleListView: open }),

  shortcutsModalOpen: false,
  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),

  warpTarget: null,
  triggerWarp: (x, y, nodeId) => set({ warpTarget: { x, y, nodeId } }),
  clearWarp: () => set({ warpTarget: null }),

  theme: getStoredTheme(),
  toggleTheme: () => {
    const nextTheme = get().theme === 'observatory' ? 'atlas' : 'observatory';
    setStoredTheme(nextTheme);
    set({ theme: nextTheme });
  },

  soundEnabled: false,
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  isLoading: false,
  loadingMessage: '',
  setLoading: (loading, message = 'Exploring the universe…') =>
    set({ isLoading: loading, loadingMessage: message }),

  isDegraded: false,
  setDegraded: (degraded) => set({ isDegraded: degraded }),

  filterDomain: 'all',
  setFilterDomain: (domain) => set({ filterDomain: domain }),

  searchFilter: '',
  setSearchFilter: (query) => set({ searchFilter: query }),

  hydrateOffline: async () => {
    const saved = await loadOfflineUniverse();
    if (saved && saved.nodes.length > 0) {
      const uMap: Record<string, UserNodeState> = {};
      saved.userNodes.forEach((un) => {
        uMap[un.node_id] = un;
      });
      set({
        nodes: saved.nodes,
        edges: saved.edges,
        userNodes: uMap,
        trailSteps: saved.trails,
        trail: saved.trails.map((t) => t.node_id),
      });
      return true;
    }
    return false;
  },

  persistOffline: async () => {
    const { nodes, edges, userNodes, trailSteps } = get();
    await saveOfflineUniverse(nodes, edges, Object.values(userNodes), trailSteps);
  },
}));
