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
  { id: 'explore', label: 'Explore', icon: Compass },
  { id: 'map', label: 'My Map', icon: MapIcon },
  { id: 'bridge', label: 'Bridge', icon: GitMerge },
  { id: 'profile', label: 'Profile', icon: User },
];

export const LeftRail: React.FC = () => {
  const { viewMode, setViewMode } = useCuriosityStore();

  return (
    <>
      {/* Desktop Left Rail */}
      <nav
        aria-label="Main Navigation"
        className="hidden md:flex flex-col items-center justify-between w-14 py-4 glass-panel border-r border-white/10 z-30"
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
                className={`relative p-3 rounded-xl transition-all ${
                  isActive
                    ? 'text-white bg-indigo-600/30 border border-indigo-500/40 shadow-lg shadow-indigo-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden fixed bottom-0 left-0 right-0 h-14 glass-panel-elevated border-t border-white/10 z-40 items-center justify-around px-2"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = viewMode === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setViewMode(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                isActive ? 'text-indigo-400' : 'text-gray-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
