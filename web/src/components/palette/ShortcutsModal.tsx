import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Cmd/Ctrl + K', desc: 'Open Command Palette' },
    { key: '/', desc: 'Focus topic search' },
    { key: 'E', desc: 'Expand selected star' },
    { key: 'R', desc: 'Open Rabbit Hole from selected' },
    { key: 'B', desc: 'Open Bridge Finder' },
    { key: 'F', desc: 'Fit and center camera view' },
    { key: '[ / ]', desc: 'Step backward / forward along trail' },
    { key: 'Esc', desc: 'Deselect star or close panels' },
    { key: '?', desc: 'Toggle keyboard shortcuts cheat-sheet' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass-panel-elevated rounded-2xl border border-white/10 shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-1.5 border-b border-white/5"
            >
              <span className="text-gray-300">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-white/10 text-white font-mono text-[11px] font-semibold border border-white/10">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
