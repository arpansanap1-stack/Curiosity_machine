import React from 'react';
import {
  Compass,
  Map as MapIcon,
  GitMerge,
  User,
} from 'lucide-react';
import { useCuriosityStore, ViewMode } from '../../store/useCuriosityStore';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'explore', label: 'Observatory', icon: Compass },
  { id: 'map', label: 'Curiosity Map', icon: MapIcon },
  { id: 'bridge', label: 'Conceptual Bridge', icon: GitMerge },
  { id: 'profile', label: 'Explorer Profile', icon: User },
];

export const LeftRail: React.FC = () => {
  const { viewMode, setViewMode } = useCuriosityStore();

  return (
    <>
      {/* Desktop Left Rail Dock */}
      <nav
        aria-label="Main Navigation"
        className="hidden md:flex flex-col items-center justify-between w-15 py-4.5 glass-panel border-r border-[var(--border)] z-30 select-none"
      >
        <div className="flex flex-col items-center gap-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`btn-tactile relative p-3 rounded-2xl transition-all ${
                  isActive
                    ? 'text-white bg-indigo-600/25 border border-indigo-400/40 shadow-[0_0_16px_rgba(99,102,241,0.25)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-15 glass-panel-elevated border-t border-[var(--border)] z-40 items-center justify-around px-3"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = viewMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`btn-tactile flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors ${
                isActive ? 'text-indigo-400 font-semibold' : 'text-[var(--text-muted)]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
