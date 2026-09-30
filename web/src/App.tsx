import React, { useEffect, useState, useCallback } from 'react';
import { useCuriosityStore } from './store/useCuriosityStore';
import { exploreTopic, expandNode, checkHealth } from './lib/api';
import { Node, BridgeResponse } from './types';
import { TopBar } from './components/layout/TopBar';
import { LeftRail } from './components/layout/LeftRail';
import { TrailStrip } from './components/layout/TrailStrip';
import { LandingHero } from './components/landing/LandingHero';
import { KnowledgeCanvas } from './components/canvas/KnowledgeCanvas';
import { GhostStarsOverlay } from './components/canvas/GhostStarsOverlay';
import { InspectorPanel } from './components/inspector/InspectorPanel';
import { RabbitHoleDrawer } from './components/discovery/RabbitHoleDrawer';
import { BridgeFinder } from './components/discovery/BridgeFinder';
import { MyMapView } from './components/map/MyMapView';
import { CuriosityProfileCard } from './components/profile/CuriosityProfileCard';
import { AccessibleListView } from './components/accessibility/AccessibleListView';
import { CommandPalette } from './components/palette/CommandPalette';
import { ShortcutsModal } from './components/palette/ShortcutsModal';

export const App: React.FC = () => {
  const {
    nodes,
    setGraphData,
    addNodesAndEdges,
    selectedNodeId,
    selectNode,
    isInspectorOpen,
    setInspectorOpen,
    isRabbitHoleDrawerOpen,
    setRabbitHoleDrawerOpen,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isAccessibleListView,
    setAccessibleListView,
    shortcutsModalOpen,
    setShortcutsModalOpen,
    viewMode,
    setViewMode,
    isLoading,
    loadingMessage,
    setLoading,
    setDegraded,
    trail,
    hydrateOffline,
    triggerWarp,
  } = useCuriosityStore();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show friendly toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  }, []);

  // Hydrate offline universe and check backend health on mount
  useEffect(() => {
    hydrateOffline().catch(() => {});
    checkHealth()
      .then((h) => {
        setDegraded(h.degraded_mode);
      })
      .catch(() => {
        setDegraded(true);
      });
  }, [hydrateOffline, setDegraded]);

  // Main Explore Action
  const handleExplore = async (topic: string) => {
    setLoading(true, `Charting knowledge constellation for "${topic}"…`);
    try {
      const res = await exploreTopic(topic);
      setGraphData([res.root, ...res.neighbors], res.edges);
      selectNode(res.root.id);
      if (res.degraded) {
        setDegraded(true);
        showToast('Observatory running with encyclopedic grounding.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Exploration failed.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  // Expand Star Action
  const handleExpandNode = useCallback(async (node: Node) => {
    setLoading(true, `Expanding "${node.label}" into deeper concepts…`);
    try {
      const existingLabels = nodes.map((n) => n.label);
      const res = await expandNode(node.id, trail, existingLabels);
      addNodesAndEdges(res.neighbors, res.edges);
      showToast(`Discovered ${res.neighbors.length} new connected stars.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Expansion failed.';
      showToast(msg);
    } finally {
      setLoading(false);
    }
  }, [nodes, trail, addNodesAndEdges, setLoading, showToast]);

  // Node Click Handlers
  const handleNodeClick = (node: Node) => {
    selectNode(node.id);
  };

  const handleNodeDoubleClick = (node: Node) => {
    selectNode(node.id);
    handleExpandNode(node);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }

      if (e.key === 'Escape') {
        if (isInspectorOpen) setInspectorOpen(false);
        else if (selectedNodeId) selectNode(null);
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShortcutsModalOpen(!shortcutsModalOpen);
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        if (selectedNode) handleExpandNode(selectedNode);
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (selectedNode) setRabbitHoleDrawerOpen(true);
        return;
      }

      if (e.key === 'b' || e.key === 'B') {
        setViewMode('bridge');
        return;
      }

      if (e.key === '[' && trail.length > 1) {
        const currIdx = trail.indexOf(selectedNodeId || '');
        if (currIdx > 0) {
          const prevId = trail[currIdx - 1];
          selectNode(prevId);
          const target = nodes.find((n) => n.id === prevId);
          if (target?.x !== undefined && target?.y !== undefined) {
            triggerWarp(target.x, target.y, target.id);
          }
        }
        return;
      }

      if (e.key === ']' && trail.length > 1) {
        const currIdx = trail.indexOf(selectedNodeId || '');
        if (currIdx >= 0 && currIdx < trail.length - 1) {
          const nextId = trail[currIdx + 1];
          selectNode(nextId);
          const target = nodes.find((n) => n.id === nextId);
          if (target?.x !== undefined && target?.y !== undefined) {
            triggerWarp(target.x, target.y, target.id);
          }
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isCommandPaletteOpen,
    isInspectorOpen,
    selectedNodeId,
    selectedNode,
    shortcutsModalOpen,
    trail,
    nodes,
    selectNode,
    setCommandPaletteOpen,
    setInspectorOpen,
    setShortcutsModalOpen,
    setRabbitHoleDrawerOpen,
    setViewMode,
    triggerWarp,
    handleExpandNode,
  ]);

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-black text-white font-sans select-none">
      {/* Top Header */}
      <TopBar />

      {/* Main Body */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Left Navigation Rail */}
        <LeftRail />

        {/* Center Canvas Area */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {nodes.length === 0 ? (
            <LandingHero onExplore={handleExplore} isLoading={isLoading} />
          ) : (
            <div className="flex-1 relative w-full h-full">
              <KnowledgeCanvas
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
              />
              {/* Shimmering Ghost Stars Loading Overlay */}
              {isLoading && <GhostStarsOverlay message={loadingMessage} />}
            </div>
          )}

          {/* Filmstrip Comet Trail along bottom */}
          <TrailStrip />
        </main>

        {/* Collapsible Inspector Panel */}
        {isInspectorOpen && selectedNode && (
          <InspectorPanel
            node={selectedNode}
            onClose={() => setInspectorOpen(false)}
            onExpand={handleExpandNode}
            onOpenRabbitHole={() => setRabbitHoleDrawerOpen(true)}
            onSelectNeighbor={(neighbor) => selectNode(neighbor.id)}
          />
        )}
      </div>

      {/* Rabbit Hole Discovery Drawer */}
      <RabbitHoleDrawer
        sourceNode={selectedNode}
        isOpen={isRabbitHoleDrawerOpen}
        onClose={() => setRabbitHoleDrawerOpen(false)}
        onTravelComplete={(dest) => {
          selectNode(dest.id);
          showToast(`Arrived at rabbit hole: ${dest.label}`);
        }}
      />

      {/* Bridge Finder Modal */}
      {viewMode === 'bridge' && (
        <BridgeFinder
          onBridgeComplete={(res: BridgeResponse) => {
            showToast(`Bridge established across ${res.hops.length} conceptual hops.`);
          }}
          onClose={() => setViewMode('explore')}
        />
      )}

      {/* Personal Curiosity Map Modal */}
      {viewMode === 'map' && (
        <MyMapView
          onSelectNode={(node) => selectNode(node.id)}
          onClose={() => setViewMode('explore')}
        />
      )}

      {/* Curiosity Profile Card Modal */}
      {viewMode === 'profile' && (
        <CuriosityProfileCard onClose={() => setViewMode('explore')} />
      )}

      {/* Accessible List View Modal */}
      {isAccessibleListView && (
        <AccessibleListView
          onSelectNode={(node) => selectNode(node.id)}
          onClose={() => setAccessibleListView(false)}
        />
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onExploreTopic={handleExplore}
      />

      {/* Keyboard Shortcuts Modal */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Friendly Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl glass-panel-elevated border border-indigo-500/40 text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-bounce">
          <div className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default App;
