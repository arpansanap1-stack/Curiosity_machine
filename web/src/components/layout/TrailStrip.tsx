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
      className="hidden md:flex items-center gap-2.5 h-11 px-4 glass-panel border-t border-[var(--border)] z-20 overflow-x-auto text-xs select-none"
    >
      <div className="flex items-center gap-2 text-[var(--text-muted)] font-medium shrink-0 pr-3 border-r border-[var(--border)]">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-display font-semibold tracking-wide uppercase text-[10px] text-indigo-300">
          Comet Trail
        </span>
        <button
          onClick={handleReplay}
          title="Replay exploration sequence"
          aria-label="Replay exploration sequence"
          className="btn-tactile p-1 rounded-md hover:bg-white/10 text-indigo-400 transition-colors"
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
              className={`btn-tactile shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-indigo-600/30 text-white border border-indigo-400/50 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 border border-white/5'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
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
