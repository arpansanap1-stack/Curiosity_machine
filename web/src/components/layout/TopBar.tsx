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
    <header className="h-14 px-4 glass-panel border-b border-white/10 flex items-center justify-between gap-4 z-30 select-none">
      {/* Left: Logo & Trail Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
            Curiosity Machine
          </span>
        </div>

        {/* Trail Breadcrumbs */}
        {recentTrailNodes.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 pl-3 border-l border-white/10 truncate">
            {recentTrailNodes.map((n, i) => (
              <React.Fragment key={n!.id}>
                {i > 0 && <span className="text-gray-600">/</span>}
                <button
                  onClick={() => selectNode(n!.id)}
                  className="hover:text-indigo-300 transition-colors truncate max-w-[120px]"
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
          className="w-full h-8 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-xs text-gray-400 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-white" />
            <span className="truncate">Search universe or jump to concept…</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-gray-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Controls & Toggles */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Degraded mode indicator */}
        {isDegraded && (
          <div
            title="Running in Wikipedia grounding mode (offline / quota degraded)"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-medium"
          >
            <AlertCircle className="w-3 h-3" />
            <span className="hidden lg:inline">Degraded Mode</span>
          </div>
        )}

        {/* Accessible List View Toggle */}
        <button
          onClick={() => setAccessibleListView(!isAccessibleListView)}
          title={isAccessibleListView ? 'Switch to Canvas View' : 'Switch to Accessible List View'}
          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
            isAccessibleListView
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Ambient Audio On' : 'Ambient Audio Off (Default)'}
          className={`p-2 rounded-lg text-xs font-medium transition-colors ${
            soundEnabled
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Theme Toggle (Observatory / Atlas) */}
        <button
          onClick={toggleTheme}
          title={`Theme: ${isDark ? 'Observatory (Dark)' : 'Atlas (Parchment)'}`}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Keyboard Shortcuts Help */}
        <button
          onClick={() => setShortcutsModalOpen(true)}
          title="Keyboard shortcuts (?)"
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
