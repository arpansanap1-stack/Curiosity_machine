import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  ExternalLink,
  Sparkles,
  Layers,
  Compass,
  FileText,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Node, Edge, DepthLevel } from '../../types';
import { useCuriosityStore } from '../../store/useCuriosityStore';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS, DEPTH_LABELS, RELATION_LABELS } from '../../lib/constants';
import { streamExplanation, fetchExplanation } from '../../lib/api';

interface InspectorProps {
  node: Node | null;
  onClose: () => void;
  onExpand: (node: Node) => void;
  onOpenRabbitHole: (node: Node) => void;
  onSelectNeighbor: (neighborNode: Node) => void;
}

type TabMode = 'explain' | 'connections' | 'sources' | 'notes';

export const InspectorPanel: React.FC<InspectorProps> = ({
  node,
  onClose,
  onExpand,
  onOpenRabbitHole,
  onSelectNeighbor,
}) => {
  const {
    activeDepth,
    setActiveDepth,
    theme,
    toggleStarNode,
    userNodes,
    updateNodeNotes,
    edges,
    nodes,
  } = useCuriosityStore();

  const [activeTab, setActiveTab] = useState<TabMode>('explain');
  const [explanationText, setExplanationText] = useState<string>('');
  const [nextQuestion, setNextQuestion] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const currentNotes = (node && userNodes[node.id]?.notes) || '';
  const [localNotes, setLocalNotes] = useState<string | null>(null);
  const notesValue = localNotes !== null ? localNotes : currentNotes;

  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;
  const isStarred = node ? userNodes[node.id]?.starred : false;

  // Load or stream explanation on node or activeDepth change
  useEffect(() => {
    if (!node) return;

    let isSubscribed = true;
    let cancelStream: (() => void) | null = null;

    const startStream = async () => {
      setIsStreaming(true);
      setExplanationText('');
      setNextQuestion(null);

      cancelStream = await streamExplanation(
        node.id,
        activeDepth,
        (chunk) => {
          if (!isSubscribed) return;
          setExplanationText((prev) => prev + chunk);
        },
        (question) => {
          if (!isSubscribed) return;
          setNextQuestion(question);
        },
        () => {
          if (!isSubscribed) return;
          setIsStreaming(false);
        },
        (err) => {
          if (!isSubscribed) return;
          console.warn('Streaming error, falling back to static fetch:', err);
          fetchExplanation(node.id, activeDepth)
            .then((res) => {
              if (!isSubscribed) return;
              setExplanationText(res.text);
              setNextQuestion(res.next_question || null);
            })
            .catch(() => {
              if (!isSubscribed) return;
              setExplanationText('Could not load explanation. Please check connection.');
            })
            .finally(() => {
              if (isSubscribed) setIsStreaming(false);
            });
        }
      );
    };

    startStream();

    return () => {
      isSubscribed = false;
      if (cancelStream) cancelStream();
    };
  }, [node, activeDepth]);

  if (!node) return null;

  // Filter edges connected to this node
  const neighborEdges = edges.filter(
    (e) => e.source_id === node.id || e.target_id === node.id
  );

  const neighbors = neighborEdges
    .map((e) => {
      const neighborId = e.source_id === node.id ? e.target_id : e.source_id;
      const neighborNode = nodes.find((n) => n.id === neighborId);
      return {
        edge: e,
        neighbor: neighborNode,
      };
    })
    .filter((item): item is { edge: Edge; neighbor: Node } => Boolean(item.neighbor));

  const depths: DepthLevel[] = ['simple', 'student', 'undergrad', 'expert'];

  return (
    <aside
      aria-label="Concept Inspector"
      className="fixed top-14 right-0 bottom-14 md:bottom-0 w-full sm:w-[460px] glass-panel-elevated z-40 flex flex-col border-l border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out"
    >
      {/* Top Header */}
      <div className="p-5 border-b border-[var(--border)] flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className="text-[10px] font-semibold tracking-wider px-2.5 py-0.5 rounded-full capitalize"
              style={{
                backgroundColor: `${domainColors[node.domain]}20`,
                color: domainColors[node.domain],
              }}
            >
              {node.domain}
            </span>
            {node.verified && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                ✓ Verified Source
              </span>
            )}
            {node.is_wildcard && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                ★ Serendipity Link
              </span>
            )}
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)] truncate">
            {node.label}
          </h2>
          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-1 leading-relaxed">
            {node.summary_short}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleStarNode(node.id)}
            title={isStarred ? 'Starred' : 'Star node'}
            aria-label={isStarred ? 'Starred' : 'Star node'}
            className={`btn-tactile p-2 rounded-xl transition-all ${
              isStarred
                ? 'text-amber-400 bg-amber-400/15 border border-amber-400/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="btn-tactile p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-[var(--border)] px-4 text-xs font-medium bg-black/10">
        <button
          onClick={() => setActiveTab('explain')}
          className={`btn-tactile py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'explain'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Explain</span>
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`btn-tactile py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'connections'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Connections ({neighbors.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`btn-tactile py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'sources'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Sources</span>
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`btn-tactile py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'border-indigo-400 text-indigo-400 font-semibold'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>
      </nav>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === 'explain' && (
          <div className="space-y-4">
            {/* Depth Lens 4-stop slider */}
            <div className="p-3.5 rounded-2xl bg-[var(--surface)]/80 border border-[var(--border)] space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)] font-medium">Zoom Lens (Depth):</span>
                <span className="text-indigo-400 font-semibold uppercase tracking-wider text-[10px]">
                  {DEPTH_LABELS[activeDepth].title}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black/20 border border-white/5">
                {depths.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDepth(d)}
                    className={`btn-tactile py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      activeDepth === d
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {DEPTH_LABELS[d].title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] italic">
                {DEPTH_LABELS[activeDepth].subtitle}
              </p>
            </div>

            {/* Explanation Prose */}
            <div className="text-sm leading-relaxed text-[var(--text-primary)] space-y-3 font-normal max-w-[65ch]">
              {explanationText ? (
                <p className="whitespace-pre-line leading-7 [text-wrap:pretty]">
                  {explanationText}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                  )}
                </p>
              ) : (
                <div className="py-10 text-center text-[var(--text-muted)] animate-pulse text-xs">
                  Streaming conceptual breakdown from the observatory…
                </div>
              )}
            </div>

            {/* What to Wonder Next Chip */}
            {nextQuestion && (
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/25 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>What to wonder next</span>
                </div>
                <p className="text-xs text-indigo-100 font-medium leading-relaxed">
                  {nextQuestion}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Connected concepts in the knowledge constellation:
            </p>
            {neighbors.length === 0 ? (
              <div className="text-xs text-[var(--text-muted)] py-8 text-center">
                No connections discovered yet. Click "Expand Star" below!
              </div>
            ) : (
              neighbors.map(({ edge, neighbor }) => (
                <div
                  key={neighbor.id}
                  onClick={() => onSelectNeighbor(neighbor)}
                  className="btn-tactile p-3.5 rounded-2xl bg-white/5 border border-[var(--border)] hover:border-indigo-400/40 cursor-pointer transition-all hover:bg-white/10 group space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: domainColors[neighbor.domain],
                        }}
                      />
                      <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
                        {neighbor.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="text-[11px] text-indigo-400 font-mono-numbers">
                    {RELATION_LABELS[edge.relation_type] || edge.relation_type}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{edge.why}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-[var(--border)] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] font-medium">Grounding Source:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  Wikipedia Verified
                </span>
              </div>
              {node.wiki_url ? (
                <a
                  href={node.wiki_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 underline font-medium text-sm"
                >
                  <span>{node.wiki_title || node.label}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-[var(--text-muted)] italic">
                  Inferred through interconnected scholarly dynamics.
                </p>
              )}
              {node.wiki_extract && (
                <p className="text-[var(--text-primary)] mt-2 p-3 rounded-xl bg-black/20 border border-white/5 leading-relaxed">
                  "{node.wiki_extract}"
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <label className="text-xs text-[var(--text-muted)] font-medium">
              Private Exploratory Notes:
            </label>
            <textarea
              value={notesValue}
              onChange={(e) => {
                setLocalNotes(e.target.value);
                updateNodeNotes(node.id, e.target.value);
              }}
              placeholder="Record personal thoughts, curiosities, or questions about this concept..."
              className="w-full h-44 p-3.5 rounded-2xl bg-black/20 border border-[var(--border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/60 resize-none font-sans"
            />
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-[var(--border)] bg-black/10 flex items-center gap-2.5">
        <button
          onClick={() => onExpand(node)}
          className="btn-tactile flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Expand Star</span>
        </button>
        <button
          onClick={() => onOpenRabbitHole(node)}
          className="btn-tactile py-2.5 px-3.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Rabbit Hole</span>
        </button>
      </div>
    </aside>
  );
};
