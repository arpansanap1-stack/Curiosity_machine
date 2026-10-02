import React from 'react';
import {
  Sparkles,
  Search,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  List,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useCuriosityStore } from '../../store/useCuriosityStore';

export const TopBar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    soundEnabled,
    toggleSound,
    setCommandPaletteOpen,
    isAccessibleListView,
    setAccessibleListView,
    setShortcutsModalOpen,
    isDegraded,
    trail,
    nodes,
    selectNode,
  } = useCuriosityStore();

  const isDark = theme === 'observatory';

  // Last 3 breadcrumb nodes
  const recentTrailNodes = trail
    .slice(-3)
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean);

  return (
    <header className="h-14 px-4 glass-panel border-b border-[var(--border)] flex items-center justify-between gap-4 z-30 select-none">
      {/* Left: Emblem & Trail Breadcrumbs */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-700 flex items-center justify-center shadow-[0_0_16px_rgba(99,102,241,0.35)] border border-indigo-400/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[var(--text-primary)] hidden sm:inline">
            Curiosity Machine
          </span>
        </div>

        {/* Trail Breadcrumbs */}
        {recentTrailNodes.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--text-muted)] pl-3.5 border-l border-[var(--border)] truncate">
            {recentTrailNodes.map((n, i) => (
              <React.Fragment key={n!.id}>
                {i > 0 && <span className="opacity-40">/</span>}
                <button
                  onClick={() => selectNode(n!.id)}
                  className="hover:text-indigo-400 transition-colors truncate max-w-[120px] font-medium"
                >
                  {n!.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Center: Command Palette Search Bar */}
      <div className="flex-1 max-w-md mx-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="btn-tactile w-full h-8.5 px-3 rounded-xl bg-[var(--surface-elevated)]/60 border border-[var(--border)] hover:border-[var(--border-hover)] text-xs text-[var(--text-muted)] flex items-center justify-between transition-all group shadow-inner"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-indigo-400 transition-colors" />
            <span className="truncate">Search universe or jump to concept…</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono-numbers bg-white/10 text-[var(--text-muted)] border border-white/5">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Controls & Toggles */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Degraded mode indicator */}
        {isDegraded && (
          <div
            title="Running in Wikipedia grounding mode (offline / quota degraded)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium"
          >
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="hidden lg:inline">Encyclopedia Mode</span>
          </div>
        )}

        {/* Accessible List View Toggle */}
        <button
          onClick={() => setAccessibleListView(!isAccessibleListView)}
          title={isAccessibleListView ? 'Switch to Canvas View' : 'Switch to Accessible List View'}
          className={`btn-tactile p-2 rounded-xl text-xs font-medium transition-all ${
            isAccessibleListView
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Ambient Audio On' : 'Ambient Audio Off (Default)'}
          className={`btn-tactile p-2 rounded-xl text-xs font-medium transition-all ${
            soundEnabled
              ? 'text-indigo-400 bg-indigo-500/15 border border-indigo-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle (Observatory / Atlas) */}
        <button
          onClick={toggleTheme}
          title={`Theme: ${isDark ? 'Observatory (Dark)' : 'Atlas (Parchment)'}`}
          className="btn-tactile p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Keyboard Shortcuts Help */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          title="Keyboard shortcuts (?)"
          className="btn-tactile p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
