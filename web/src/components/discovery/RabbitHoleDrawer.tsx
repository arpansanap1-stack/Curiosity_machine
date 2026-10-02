import React, { useState, useEffect } from 'react';
import { X, Compass, Sparkles, ArrowRight } from 'lucide-react';
import { Node, RabbitHoleCandidate } from '../../types';
import { fetchRabbitHoles, travelRabbitHole } from '../../lib/api';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS } from '../../lib/constants';

interface RabbitHoleProps {
  sourceNode: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onTravelComplete: (destNode: Node) => void;
}

function computeWarpCoords(sourceX = 0, sourceY = 0) {
  const angle = (Date.now() % 360) * (Math.PI / 180);
  const dist = 180;
  return {
    x: sourceX + Math.cos(angle) * dist,
    y: sourceY + Math.sin(angle) * dist,
  };
}

export const RabbitHoleDrawer: React.FC<RabbitHoleProps> = ({
  sourceNode,
  isOpen,
  onClose,
  onTravelComplete,
}) => {
  const { theme, addNodesAndEdges, triggerWarp } = useCuriosityStore();
  const [candidates, setCandidates] = useState<RabbitHoleCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [traveling, setTraveling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;

  useEffect(() => {
    if (!isOpen || !sourceNode) return;

    let isSubscribed = true;

    const loadCandidates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRabbitHoles(sourceNode.id);
        if (isSubscribed) setCandidates(res.candidates);
      } catch (err: unknown) {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : 'Could not discover rabbit holes.');
        }
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    loadCandidates();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, sourceNode]);

  if (!isOpen || !sourceNode) return null;

  const handleTravel = async (candidate: RabbitHoleCandidate) => {
    try {
      setTraveling(true);
      const res = await travelRabbitHole(sourceNode.id, candidate);
      addNodesAndEdges([res.destination], [res.edge]);

      // Calculate warp coordinates
      const coords = computeWarpCoords(sourceNode.x, sourceNode.y);
      triggerWarp(coords.x, coords.y, res.destination.id);

      onTravelComplete(res.destination);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Travel failed.');
    } finally {
      setTraveling(false);
    }
  };

  const handleSurpriseMe = () => {
    if (candidates.length > 0) {
      const idx = Date.now() % candidates.length;
      handleTravel(candidates[idx]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-panel-elevated rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.2)]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-[var(--text-primary)] tracking-tight">
                Rabbit Hole Discovery
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Departing from <span className="text-[var(--text-primary)] font-medium">{sourceNode.label}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close rabbit holes"
            className="btn-tactile p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 mx-auto border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-indigo-300 font-medium">
                Scanning distant conceptual dimensions…
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 text-xs text-red-300 text-center">
              {error}
            </div>
          ) : (
            candidates.map((cand) => {
              const col = domainColors[cand.domain];
              const surprisePct = Math.round(cand.surprise_score * 100);
              return (
                <div
                  key={cand.candidate_id}
                  onClick={() => !traveling && handleTravel(cand)}
                  className="btn-tactile p-4.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-[var(--border)] hover:border-indigo-400/40 transition-all cursor-pointer group space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: col }}
                      />
                      <span className="font-display text-sm font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
                        {cand.label}
                      </span>
                    </div>
                    {/* Surprise Meter */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono-numbers font-medium text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/25">
                      <Sparkles className="w-3 h-3" />
                      <span>{surprisePct}% Surprise</span>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-200 font-medium italic">
                    "{cand.teaser}"
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {cand.why}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="capitalize">{cand.domain}</span>
                    <span className="text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform font-medium">
                      <span>Warp here</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-black/15 flex items-center justify-between">
          <button
            onClick={handleSurpriseMe}
            disabled={candidates.length === 0 || traveling}
            className="btn-tactile px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Surprise Me</span>
          </button>
          <button
            onClick={onClose}
            className="btn-tactile text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
