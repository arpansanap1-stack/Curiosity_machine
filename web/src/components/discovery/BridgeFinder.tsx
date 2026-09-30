import React, { useState } from 'react';
import { GitMerge, ArrowRight, Sparkles, X } from 'lucide-react';
import { findBridge } from '../../lib/api';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { BridgeResponse } from '../../types';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS } from '../../lib/constants';

interface BridgeFinderProps {
  onBridgeComplete: (response: BridgeResponse) => void;
  onClose: () => void;
}

export const BridgeFinder: React.FC<BridgeFinderProps> = ({
  onBridgeComplete,
  onClose,
}) => {
  const { theme, addNodesAndEdges, selectNode, triggerWarp } = useCuriosityStore();
  const [topicA, setTopicA] = useState('');
  const [topicB, setTopicB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BridgeResponse | null>(null);

  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicA.trim() || !topicB.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await findBridge(topicA.trim(), topicB.trim());
      setResult(res);
      addNodesAndEdges(res.nodes, res.edges);

      // Center view on first hop
      if (res.nodes.length > 0) {
        selectNode(res.nodes[0].id);
        if (res.nodes[0].x !== undefined && res.nodes[0].y !== undefined) {
          triggerWarp(res.nodes[0].x, res.nodes[0].y, res.nodes[0].id);
        }
      }
      onBridgeComplete(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to discover bridge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-2xl glass-panel-elevated rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Bridge Finder
              </h2>
              <p className="text-xs text-gray-400">
                Discover the hidden conceptual path uniting two distant topics.
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

        {/* Inputs */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 border-b border-white/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <input
              type="text"
              value={topicA}
              onChange={(e) => setTopicA(e.target.value)}
              placeholder="Topic A (e.g. Mycelium networks)"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
            />
            <input
              type="text"
              value={topicB}
              onChange={(e) => setTopicB(e.target.value)}
              placeholder="Topic B (e.g. Internet routing)"
              className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI traces 3-5 factual intermediate hops</span>
            </div>
            <button
              type="submit"
              disabled={!topicA.trim() || !topicB.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Find Bridge</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Result view */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-300">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider text-indigo-400 font-bold">
                  The Journey Narrative
                </span>
                <p className="text-xs text-indigo-100 leading-relaxed">
                  {result.overall_story}
                </p>
              </div>

              <div className="space-y-3">
                <span className="text-xs text-gray-400 font-medium">
                  Intermediate Hops:
                </span>
                {result.hops.map((hop, idx) => {
                  const col = domainColors[hop.node.domain];
                  return (
                    <div
                      key={hop.node.id}
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-300">
                            {idx + 1}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: col }}
                          />
                          <span className="text-sm font-semibold text-white">
                            {hop.node.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400 capitalize">
                          {hop.node.domain}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 pl-7">
                        {hop.step_story}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
