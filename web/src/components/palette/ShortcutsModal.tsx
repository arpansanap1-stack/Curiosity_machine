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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/75 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass-panel-elevated rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-indigo-400" />
            <h3 className="font-display text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Keyboard Navigation & Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close shortcuts"
            className="btn-tactile p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between py-2 border-b border-white/5"
            >
              <span className="text-[var(--text-muted)] font-medium">{s.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-white/10 text-[var(--text-primary)] font-mono-numbers text-[11px] font-semibold border border-white/10 shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
