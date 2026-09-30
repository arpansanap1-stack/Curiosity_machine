import React, { useState } from 'react';
import { Search, Star, Compass, X } from 'lucide-react';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { Domain, Node } from '../../types';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS, DOMAIN_LABELS } from '../../lib/constants';

interface MyMapViewProps {
  onSelectNode: (node: Node) => void;
  onClose: () => void;
}

export const MyMapView: React.FC<MyMapViewProps> = ({ onSelectNode, onClose }) => {
  const {
    nodes,
    userNodes,
    theme,
    filterDomain,
    setFilterDomain,
    searchFilter,
    setSearchFilter,
    setViewMode,
  } = useCuriosityStore();

  const [onlyStarred, setOnlyStarred] = useState(false);
  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;

  const domains: Domain[] = [
    'science',
    'nature',
    'history',
    'art',
    'tech',
    'math',
    'philosophy',
    'society',
    'other',
  ];

  // Filter nodes based on user's active filters
  const filteredNodes = nodes.filter((n) => {
    if (filterDomain !== 'all' && n.domain !== filterDomain) return false;
    if (onlyStarred && !userNodes[n.id]?.starred) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchLabel = n.label.toLowerCase().includes(q);
      const matchSummary = n.summary_short.toLowerCase().includes(q);
      const matchNotes = userNodes[n.id]?.notes?.toLowerCase().includes(q);
      if (!matchLabel && !matchSummary && !matchNotes) return false;
    }
    return true;
  });

  const totalStarred = Object.values(userNodes).filter((un) => un.starred).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-4xl glass-panel-elevated rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[85vh] overflow-hidden">
        {/* Top Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Personal Curiosity Map
              </h2>
              <p className="text-xs text-gray-400">
                {nodes.length} concepts charted · {totalStarred} starred
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-white/10 space-y-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search across concepts, summaries, or personal notes…"
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <button
              onClick={() => setOnlyStarred(!onlyStarred)}
              className={`px-3 h-10 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                onlyStarred
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400' : ''}`} />
              Starred ({totalStarred})
            </button>
          </div>

          {/* Domain Pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <button
              onClick={() => setFilterDomain('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                filterDomain === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              All Domains
            </button>
            {domains.map((dom) => {
              const count = nodes.filter((n) => n.domain === dom).length;
              if (count === 0) return null;
              const isSelected = filterDomain === dom;
              const col = domainColors[dom];
              return (
                <button
                  key={dom}
                  onClick={() => setFilterDomain(isSelected ? 'all' : dom)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'text-white border'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'
                  }`}
                  style={{
                    backgroundColor: isSelected ? `${col}30` : undefined,
                    borderColor: isSelected ? col : undefined,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: col }}
                  />
                  <span>{DOMAIN_LABELS[dom]}</span>
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredNodes.length === 0 ? (
            <div className="py-20 text-center text-xs text-gray-500">
              No concepts match your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredNodes.map((n) => {
                const col = domainColors[n.domain];
                const isStar = userNodes[n.id]?.starred;
                const notes = userNodes[n.id]?.notes;
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      onSelectNode(n);
                      setViewMode('explore');
                      onClose();
                    }}
                    className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/40 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: col }}
                        />
                        <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                          {n.label}
                        </span>
                      </div>
                      {isStar && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {n.summary_short}
                    </p>

                    {notes && (
                      <div className="p-2 rounded bg-black/30 border border-white/5 text-[11px] text-gray-300 italic line-clamp-2">
                        "{notes}"
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                      <span className="capitalize">{n.domain}</span>
                      <span className="uppercase font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/5">
                        {n.depth_explored}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
