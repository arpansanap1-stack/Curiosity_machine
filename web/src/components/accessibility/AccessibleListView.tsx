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
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-3xl glass-panel-elevated rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Knowledge Universe: Accessible List View
            </h2>
            <p className="text-xs text-gray-400">
              Navigable hierarchical representation of charted concepts and connections.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close accessible list view"
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus:ring-2 focus:ring-indigo-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {nodes.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-400">
              The universe is currently empty. Enter a concept to begin.
            </div>
          ) : (
            <ul className="space-y-3" role="list">
              {nodes.map((node) => {
                const connectedEdges = edges.filter(
                  (e) => e.source_id === node.id || e.target_id === node.id
                );
                const isSelected = node.id === selectedNodeId;
                const isStarred = userNodes[node.id]?.starred;

                return (
                  <li
                    key={node.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-400/50'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {node.label}
                          </h3>
                          <span className="text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider bg-white/10 text-gray-300">
                            {DOMAIN_LABELS[node.domain] || node.domain}
                          </span>
                          {node.verified && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                              Wikipedia Verified
                            </span>
                          )}
                          {isStarred && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {node.summary_short}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          onSelectNode(node);
                          onClose();
                        }}
                        aria-label={`Inspect ${node.label}`}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 shrink-0 focus:ring-2 focus:ring-indigo-400"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Connected Neighbors Sub-list */}
                    {connectedEdges.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
                        <span className="text-[11px] font-semibold text-gray-400">
                          Connected to:
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
                                className="p-2 rounded bg-black/20 border border-white/5 flex items-center justify-between"
                              >
                                <span className="font-medium text-gray-200">
                                  {otherNode.label}
                                </span>
                                <span className="text-[10px] text-indigo-300 font-mono">
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
