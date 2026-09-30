import React from 'react';
import { Play, Sparkles } from 'lucide-react';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS } from '../../lib/constants';

export const TrailStrip: React.FC = () => {
  const { trail, nodes, selectedNodeId, selectNode, theme, triggerWarp } = useCuriosityStore();
  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;

  if (trail.length === 0) return null;

  const trailNodes = trail
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean);

  const handleReplay = async () => {
    for (const node of trailNodes) {
      if (node && node.x !== undefined && node.y !== undefined) {
        selectNode(node.id);
        triggerWarp(node.x, node.y, node.id);
        await new Promise((r) => setTimeout(r, 1400));
      }
    }
  };

  return (
    <div
      aria-label="Exploration Trail"
      className="hidden md:flex items-center gap-2 h-10 px-4 glass-panel border-t border-white/10 z-20 overflow-x-auto text-xs"
    >
      <div className="flex items-center gap-1.5 text-gray-400 font-medium shrink-0 pr-2 border-r border-white/10">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>Comet Trail:</span>
        <button
          onClick={handleReplay}
          title="Replay journey"
          className="p-1 rounded hover:bg-white/10 text-indigo-400 transition-colors"
        >
          <Play className="w-3 h-3 fill-indigo-400" />
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1">
        {trailNodes.map((n, idx) => {
          const isSelected = n!.id === selectedNodeId;
          const col = domainColors[n!.domain];
          return (
            <button
              key={`${n!.id}_${idx}`}
              onClick={() => {
                selectNode(n!.id);
                if (n!.x !== undefined && n!.y !== undefined) {
                  triggerWarp(n!.x, n!.y, n!.id);
                }
              }}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                isSelected
                  ? 'bg-white/20 text-white border border-white/30 shadow'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: col }}
              />
              <span className="truncate max-w-[140px]">{n!.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
