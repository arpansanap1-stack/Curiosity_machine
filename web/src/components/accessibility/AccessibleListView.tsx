import { Node } from '../../types';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { DOMAIN_LABELS, RELATION_LABELS } from '../../lib/constants';
import { X, ChevronRight, Star } from 'lucide-react';

interface ListViewProps {
  onSelectNode: (node: Node) => void;
  onClose: () => void;
}

export const AccessibleListView: React.FC<ListViewProps> = ({
  onSelectNode,
  onClose,
}) => {
  const { nodes, edges, userNodes, selectedNodeId } = useCuriosityStore();

  return (
    <div
      role="region"
      aria-label="Accessible Knowledge Universe Tree"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#07090e]/80 backdrop-blur-xl animate-in fade-in duration-200"
    >
      <div className="w-full max-w-3xl glass-panel-elevated rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[var(--text-primary)] tracking-tight">
              Knowledge Observatory: Accessible Explorer
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Structured hierarchical index of all discovered concepts and relational pathways.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close accessible list view"
            className="btn-tactile p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all focus:ring-2 focus:ring-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {nodes.length === 0 ? (
            <div className="py-20 text-center text-xs text-[var(--text-muted)]">
              The constellation is currently empty. Explore a topic to chart stars.
            </div>
          ) : (
            <ul className="space-y-3.5" role="list">
              {nodes.map((node) => {
                const connectedEdges = edges.filter(
                  (e) => e.source_id === node.id || e.target_id === node.id
                );
                const isSelected = node.id === selectedNodeId;
                const isStarred = userNodes[node.id]?.starred;

                return (
                  <li
                    key={node.id}
                    className={`p-4.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                        : 'bg-white/5 border-[var(--border)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                            {node.label}
                          </h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wider bg-white/10 text-[var(--text-muted)]">
                            {DOMAIN_LABELS[node.domain] || node.domain}
                          </span>
                          {node.verified && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                              Wikipedia Verified
                            </span>
                          )}
                          {isStarred && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-[65ch]">
                          {node.summary_short}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onSelectNode(node);
                          onClose();
                        }}
                        aria-label={`Inspect ${node.label}`}
                        className="btn-tactile px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shrink-0 shadow-md shadow-indigo-600/25 cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Connected Neighbors Sub-list */}
                    {connectedEdges.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-white/5 space-y-2">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] tracking-wide">
                          Connected Pathways:
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {connectedEdges.map((e) => {
                            const otherId =
                              e.source_id === node.id ? e.target_id : e.source_id;
                            const otherNode = nodes.find((n) => n.id === otherId);
                            if (!otherNode) return null;
                            return (
                              <li
                                key={e.id}
                                className="p-2.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between"
                              >
                                <span className="font-medium text-[var(--text-primary)]">
                                  {otherNode.label}
                                </span>
                                <span className="text-[10px] text-indigo-300 font-mono-numbers">
                                  {RELATION_LABELS[e.relation_type] || e.relation_type}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
