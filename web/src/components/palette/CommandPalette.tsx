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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg glass-panel-elevated rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Palette" className="w-full">
          <div className="flex items-center px-4 border-b border-white/10">
            <Search className="w-4 h-4 text-gray-400 mr-2.5 shrink-0" />
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search concepts or type a new topic to explore…"
              className="w-full h-12 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              autoFocus
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2 text-xs space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-gray-400">
              {searchQuery ? (
                <button
                  onClick={() => {
                    onExploreTopic(searchQuery);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore "{searchQuery}" as new topic
                </button>
              ) : (
                'No matching commands.'
              )}
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Navigation & Views" className="text-[10px] text-gray-500 px-2 py-1 font-semibold uppercase tracking-wider">
              <Command.Item
                onSelect={() => {
                  setViewMode('explore');
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-indigo-400" />
                <span>Explore Observatory Canvas</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('map');
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span>Open Personal Curiosity Map</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('bridge');
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <GitMerge className="w-4 h-4 text-purple-400" />
                <span>Open Bridge Finder</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setViewMode('profile');
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>View Curiosity Profile & Share Card</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  toggleTheme();
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                {theme === 'observatory' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400" />
                )}
                <span>
                  Switch to {theme === 'observatory' ? 'Atlas (Light)' : 'Observatory (Dark)'} Theme
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setAccessibleListView(!isAccessibleListView);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <List className="w-4 h-4 text-blue-400" />
                <span>Toggle Accessible List View</span>
              </Command.Item>
            </Command.Group>

            {/* Concepts in Current Universe */}
            {nodes.length > 0 && (
              <Command.Group heading="Charted Concepts" className="text-[10px] text-gray-500 px-2 py-1 font-semibold uppercase tracking-wider">
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
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      <span className="truncate">{n.label}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 capitalize">
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
