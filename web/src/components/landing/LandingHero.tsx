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
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center z-20">
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      </div>

      <div className="max-w-2xl w-full mx-auto space-y-8 relative">
        {/* Observatory Emblem */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-indigo-300 font-medium">
          <Compass className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
          <span>The Knowledge Observatory</span>
        </div>

        {/* Central Inscription */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-sm font-sans">
            What are you <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300">curious</span> about?
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto">
            Type any concept to generate a living constellation of interconnected ideas, rabbit holes, and scientific threads.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`e.g. ${placeholders[placeholderIndex]}`}
              disabled={isLoading}
              autoFocus
              className="w-full h-14 pl-5 pr-14 rounded-2xl glass-panel-elevated text-base text-white placeholder-gray-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans shadow-2xl"
            />
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className="absolute right-2.5 w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white flex items-center justify-center transition-all shadow-md active:scale-95"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Curiosity Prompt Chips */}
        <div className="space-y-2.5 pt-2">
          <p className="text-xs text-gray-500 font-medium">
            Or ignite a constellation with a prompt:
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {CURIOUS_PROMPT_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full text-xs font-medium glass-panel hover:glass-panel-elevated text-gray-300 hover:text-white hover:border-indigo-400/40 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-400" />
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
