import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  Compass,
  Map as MapIcon,
  GitMerge,
  Sparkles,
  Sun,
  Moon,
  Search,
  List,
} from 'lucide-react';
import { useCuriosityStore } from '../../store/useCuriosityStore';

interface PaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreTopic: (topic: string) => void;
}

export const CommandPalette: React.FC<PaletteProps> = ({
  isOpen,
  onClose,
  onExploreTopic,
}) => {
  const {
    nodes,
    selectNode,
    setViewMode,
    theme,
    toggleTheme,
    isAccessibleListView,
    setAccessibleListView,
    triggerWarp,
  } = useCuriosityStore();

  const [searchQuery, setSearchQuery] = useState('');

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onClose(); // toggle
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        // open
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-[#07090e]/75 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-panel-elevated rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="w-full">
          <div className="flex items-center px-4 border-b border-[var(--border)] bg-black/10">
            <Search className="w-4 h-4 text-[var(--text-muted)] mr-3 shrink-0" />
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search concepts or type a new topic to explore…"
              className="w-full h-12 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
              autoFocus
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2 text-xs space-y-1">
            <Command.Empty className="py-8 text-center text-xs text-[var(--text-muted)]">
              {searchQuery ? (
                <button
                  onClick={() => {
                    onExploreTopic(searchQuery);
                    onClose();
                  }}
                  className="btn-tactile px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explore "{searchQuery}" as new topic</span>
                </button>
              ) : (
                'No matching commands.'
              )}
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Navigation & Views" className="text-[10px] text-[var(--text-muted)] px-3 py-1 font-semibold uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  setViewMode('explore');
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4 text-indigo-400" />
                <span className="font-medium">Explore Observatory Canvas</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('map');
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-medium">Open Personal Curiosity Map</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('bridge');
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <GitMerge className="w-4 h-4 text-purple-400" />
                <span className="font-medium">Open Bridge Finder</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('profile');
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-medium">View Curiosity Profile & Share Card</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleTheme();
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                {theme === 'observatory' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                <span className="font-medium">
                  Switch to {theme === 'observatory' ? 'Atlas (Light)' : 'Observatory (Dark)'} Theme
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setAccessibleListView(!isAccessibleListView);
                  onClose();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
              >
                <List className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Toggle Accessible List View</span>
              </Command.Item>
            </Command.Group>

            {/* Concepts in Current Universe */}
            {nodes.length > 0 && (
              <Command.Group heading="Charted Concepts" className="text-[10px] text-[var(--text-muted)] px-3 py-1 font-semibold uppercase tracking-wider">
                {nodes.map((n) => (
                  <Command.Item
                    key={n.id}
                    value={n.label}
                    onSelect={() => {
                      selectNode(n.id);
                      if (n.x !== undefined && n.y !== undefined) {
                        triggerWarp(n.x, n.y, n.id);
                      }
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="truncate font-medium">{n.label}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] capitalize">
                      {n.domain}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
