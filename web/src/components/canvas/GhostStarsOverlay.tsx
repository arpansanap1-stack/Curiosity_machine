import React from 'react';

interface GhostStarsProps {
  message?: string;
}

export const GhostStarsOverlay: React.FC<GhostStarsProps> = ({
  message = 'Charting the knowledge universe…',
}) => {
  // Precomputed coordinates for ghost stars shimmering outward
  const ghostPositions = [
    { x: '50%', y: '50%', delay: '0s', size: '16px' },
    { x: '35%', y: '40%', delay: '0.15s', size: '12px' },
    { x: '65%', y: '38%', delay: '0.3s', size: '10px' },
    { x: '42%', y: '65%', delay: '0.45s', size: '14px' },
    { x: '58%', y: '62%', delay: '0.6s', size: '11px' },
    { x: '25%', y: '55%', delay: '0.75s', size: '10px' },
    { x: '75%', y: '52%', delay: '0.9s', size: '12px' },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center">
      {/* Shimmering Ghost Stars */}
      <div className="relative w-full h-full">
        {ghostPositions.map((g, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-indigo-400/40 bg-indigo-500/20 animate-ping shadow-lg shadow-indigo-500/30"
            style={{
              left: g.x,
              top: g.y,
              width: g.size,
              height: g.size,
              transform: 'translate(-50%, -50%)',
              animationDuration: '2s',
              animationDelay: g.delay,
            }}
          />
        ))}

        {/* Pulsing filament rings */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-indigo-500/10 animate-pulse pointer-events-none" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-purple-500/10 animate-pulse delay-700 pointer-events-none" />
      </div>

      {/* Floating status badge */}
      <div className="absolute bottom-16 px-4.5 py-2.5 rounded-full glass-panel-elevated border border-indigo-400/35 flex items-center gap-3 shadow-[0_16px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.9)] animate-pulse" />
        <span className="font-display text-xs font-semibold text-[var(--text-primary)] tracking-wide">
          {message}
        </span>
      </div>
    </div>
  );
};
