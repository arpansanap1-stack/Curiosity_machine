import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Compass } from 'lucide-react';
import { CURIOUS_PROMPT_CHIPS } from '../../lib/constants';

interface LandingHeroProps {
  onExplore: (topic: string) => void;
  isLoading: boolean;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onExplore, isLoading }) => {
  const [inputVal, setInputVal] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholders = [
    'Octopus intelligence…',
    'Why do we dream?…',
    'Quantum entanglement…',
    'How do bees count?…',
    'Origin of zero…',
    'Why is the sky blue?…',
    'Bioluminescence in the deep ocean…',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [placeholders.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading) return;
    onExplore(inputVal.trim());
  };

  const handleChipClick = (chip: string) => {
    if (isLoading) return;
    setInputVal(chip);
    onExplore(chip);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center z-20 overflow-hidden">
      {/* Celestial Observatory Orbital Background Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden">
        {/* Soft atmospheric nebula haze */}
        <div className="w-[640px] h-[640px] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />
        <div className="absolute w-[420px] h-[420px] rounded-full bg-sky-500/5 blur-[90px] pointer-events-none" />

        {/* Concentric Astronomical Orbital Rings */}
        <svg
          className="absolute w-[800px] h-[800px] text-white/[0.04] animate-[spin_160s_linear_infinite]"
          viewBox="0 0 800 800"
          fill="none"
        >
          <circle cx="400" cy="400" r="380" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="400" cy="400" r="290" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
          <circle cx="400" cy="400" r="200" stroke="currentColor" strokeWidth="1" strokeDasharray="8 8" />
          <circle cx="400" cy="400" r="110" stroke="currentColor" strokeWidth="0.75" />
          {/* Subtle celestial crosshairs */}
          <line x1="400" y1="10" x2="400" y2="790" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 12" />
          <line x1="10" y1="400" x2="790" y2="400" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 12" />
        </svg>
      </div>

      <div className="max-w-2xl w-full mx-auto space-y-8 relative z-10">
        {/* Observatory Emblem Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-[11px] font-semibold tracking-wider uppercase text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all hover:border-indigo-400/40">
          <Compass className="w-3.5 h-3.5 text-indigo-400 animate-[spin_16s_linear_infinite]" />
          <span>The Knowledge Observatory</span>
        </div>

        {/* Central Inscription / Display Headline */}
        <div className="space-y-3.5">
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.08] [text-wrap:balance]">
            What are you{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-400 to-sky-300 drop-shadow-[0_0_28px_rgba(99,102,241,0.4)]">
              curious
            </span>{' '}
            about?
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed [text-wrap:pretty]">
            Chart a living constellation of interconnected ideas, deep rabbit holes, and scientific threads across human thought.
          </p>
        </div>

        {/* Search Input Bar */}
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
          <div className="relative flex items-center group">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`e.g. ${placeholders[placeholderIndex]}`}
              disabled={isLoading}
              autoFocus
              className="w-full h-14 pl-5 pr-14 rounded-2xl glass-panel-elevated text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400/60 transition-all shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(0,0,0,0.2)]"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              aria-label="Explore constellation"
              className="btn-tactile absolute right-2.5 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-600/30 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </div>
        </form>

        {/* Curiosity Prompt Starter Chips */}
        <div className="space-y-3 pt-2">
          <p className="text-xs text-[var(--text-muted)] font-medium tracking-wide">
            Or ignite a constellation with a curated thread:
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {CURIOUS_PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
                className="btn-tactile px-3.5 py-1.5 rounded-full text-xs font-medium glass-panel hover:glass-panel-elevated text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-indigo-400/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                <span>{chip}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
