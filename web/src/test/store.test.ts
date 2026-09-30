import { describe, it, expect, beforeEach } from 'vitest';
import { useCuriosityStore } from '../store/useCuriosityStore';
import { Node, Edge } from '../types';

describe('Curiosity Machine Zustand Store', () => {
  beforeEach(() => {
    useCuriosityStore.setState({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      trail: [],
      userNodes: {},
      activeDepth: 'simple',
    });
  });

  it('initializes with default values', () => {
    const state = useCuriosityStore.getState();
    expect(state.nodes).toEqual([]);
    expect(state.edges).toEqual([]);
    expect(state.selectedNodeId).toBeNull();
    expect(state.activeDepth).toBe('simple');
  });

  it('sets and merges graph nodes and edges without duplicates', () => {
    const nodeA: Node = {
      id: 'node_a',
      slug: 'node-a',
      label: 'Node A',
      domain: 'science',
      summary_short: 'First test node.',
      verified: true,
      is_wildcard: false,
      depth_explored: 'simple',
      created_at: new Date().toISOString(),
    };

    const nodeB: Node = {
      id: 'node_b',
      slug: 'node-b',
      label: 'Node B',
      domain: 'tech',
      summary_short: 'Second test node.',
      verified: false,
      is_wildcard: false,
      depth_explored: 'simple',
      created_at: new Date().toISOString(),
    };

    const edgeAB: Edge = {
      id: 'edge_ab',
      source_id: 'node_a',
      target_id: 'node_b',
      relation_type: 'causes',
      why: 'Direct causal test link.',
      surprise_score: 0.5,
      created_at: new Date().toISOString(),
    };

    useCuriosityStore.getState().setGraphData([nodeA], []);
    expect(useCuriosityStore.getState().nodes.length).toBe(1);

    // Merge nodeB and edgeAB
    useCuriosityStore.getState().addNodesAndEdges([nodeB, nodeA], [edgeAB]);
    expect(useCuriosityStore.getState().nodes.length).toBe(2);
    expect(useCuriosityStore.getState().edges.length).toBe(1);
  });

  it('records trail visit when a node is selected', () => {
    useCuriosityStore.getState().selectNode('node_alpha');
    const state = useCuriosityStore.getState();

    expect(state.selectedNodeId).toBe('node_alpha');
    expect(state.isInspectorOpen).toBe(true);
    expect(state.trail).toContain('node_alpha');
    expect(state.trailSteps.length).toBe(1);
    expect(state.trailSteps[0].node_id).toBe('node_alpha');
  });

  it('toggles stars and updates notes', () => {
    useCuriosityStore.getState().toggleStarNode('node_star');
    expect(useCuriosityStore.getState().userNodes['node_star']?.starred).toBe(true);

    useCuriosityStore.getState().toggleStarNode('node_star');
    expect(useCuriosityStore.getState().userNodes['node_star']?.starred).toBe(false);

    useCuriosityStore.getState().updateNodeNotes('node_star', 'Fascinating concept!');
    expect(useCuriosityStore.getState().userNodes['node_star']?.notes).toBe('Fascinating concept!');
  });
});
