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
      className="fixed top-14 right-0 bottom-14 md:bottom-0 w-full sm:w-[440px] glass-panel-elevated z-40 flex flex-col border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out"
    >
      {/* Top Header */}
      <div className="p-4 border-b border-white/10 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
              style={{
                backgroundColor: `${domainColors[node.domain]}25`,
                color: domainColors[node.domain],
              }}
            >
              {node.domain}
            </span>
            {node.verified && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                ✓ Verified Source
              </span>
            )}
            {node.is_wildcard && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                ★ Unexpected Link
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white truncate">
            {node.label}
          </h2>
          <p className="text-xs text-gray-400 line-clamp-2 mt-1">
            {node.summary_short}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleStarNode(node.id)}
            title={isStarred ? 'Starred' : 'Star node'}
            className={`p-2 rounded-lg transition-colors ${
              isStarred
                ? 'text-amber-400 bg-amber-400/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex border-b border-white/10 px-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('explain')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'explain'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Explain
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'connections'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Connections ({neighbors.length})
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'sources'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Sources
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-400 text-indigo-300'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Notes
        </button>
      </nav>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'explain' && (
          <div className="space-y-4">
            {/* Depth Lens 4-stop slider */}
            <div className="p-3 rounded-xl bg-black/30 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Zoom Lens (Depth):</span>
                <span className="text-indigo-400 font-semibold uppercase tracking-wider text-[11px]">
                  {DEPTH_LABELS[activeDepth].title}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-white/5 border border-white/5">
                {depths.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDepth(d)}
                    className={`py-1.5 text-xs font-medium rounded transition-all ${
                      activeDepth === d
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {DEPTH_LABELS[d].title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 italic">
                {DEPTH_LABELS[activeDepth].subtitle}
              </p>
            </div>

            {/* Explanation Prose */}
            <div className="text-sm leading-relaxed text-gray-200 space-y-3 font-normal max-w-[68ch]">
              {explanationText ? (
                <p className="whitespace-pre-line leading-7">
                  {explanationText}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-4 ml-1 bg-indigo-400 animate-pulse align-middle" />
                  )}
                </p>
              ) : (
                <div className="py-8 text-center text-gray-400 animate-pulse text-xs">
                  Streaming explanation from observatory…
                </div>
              )}
            </div>

            {/* What to Wonder Next Chip */}
            {nextQuestion && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  What to wonder next
                </div>
                <p className="text-xs text-indigo-100 font-medium">
                  {nextQuestion}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400">
              Connected concepts in the knowledge universe:
            </p>
            {neighbors.length === 0 ? (
              <div className="text-xs text-gray-500 py-6 text-center">
                No connections discovered yet. Click "Expand Star" below!
              </div>
            ) : (
              neighbors.map(({ edge, neighbor }) => (
                <div
                  key={neighbor.id}
                  onClick={() => onSelectNeighbor(neighbor)}
                  className="p-3 rounded-xl bg-black/25 border border-white/5 hover:border-indigo-500/30 cursor-pointer transition-all hover:bg-white/5 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: domainColors[neighbor.domain],
                        }}
                      />
                      <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {neighbor.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="text-[11px] text-indigo-400 font-mono mb-1">
                    {RELATION_LABELS[edge.relation_type] || edge.relation_type}
                  </div>
                  <p className="text-xs text-gray-300">{edge.why}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-black/25 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Grounding Source:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  Wikipedia Verified
                </span>
              </div>
              {node.wiki_url ? (
                <a
                  href={node.wiki_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-medium text-sm"
                >
                  {node.wiki_title || node.label}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="text-gray-400 italic">
                  Inferred through interconnected scholarly dynamics.
                </p>
              )}
              {node.wiki_extract && (
                <p className="text-gray-300 mt-2 p-2 rounded bg-black/30 border border-white/5 leading-relaxed">
                  "{node.wiki_extract}"
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-3">
            <label className="text-xs text-gray-400 font-medium">
              Private Exploratory Notes:
            </label>
            <textarea
              value={notesValue}
              onChange={(e) => {
                setLocalNotes(e.target.value);
                updateNodeNotes(node.id, e.target.value);
              }}
              placeholder="Write personal thoughts, curiosities, or questions about this concept..."
              className="w-full h-44 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 resize-none font-sans"
            />
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 border-t border-white/10 flex items-center gap-2">
        <button
          onClick={() => onExpand(node)}
          className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/25 active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Expand Star
        </button>
        <button
          onClick={() => onOpenRabbitHole(node)}
          className="py-2.5 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          <Compass className="w-3.5 h-3.5" />
          Rabbit Hole
        </button>
      </div>
    </aside>
  );
};
