import React, { useRef, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { Download, Sparkles, X, Flame, ShieldAlert } from 'lucide-react';
import { fetchProfile } from '../../lib/api';
import { CuriosityProfileResponse, Domain } from '../../types';
import { DOMAIN_COLORS, DOMAIN_COLORS_ATLAS, DOMAIN_LABELS } from '../../lib/constants';
import { useCuriosityStore } from '../../store/useCuriosityStore';

interface ProfileProps {
  onClose: () => void;
}

export const CuriosityProfileCard: React.FC<ProfileProps> = ({ onClose }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useCuriosityStore();
  const [profile, setProfile] = useState<CuriosityProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const domainColors = theme === 'atlas' ? DOMAIN_COLORS_ATLAS : DOMAIN_COLORS;

  useEffect(() => {
    let isSubscribed = true;
    fetchProfile()
      .then((data) => {
        if (!isSubscribed) return;
        setProfile(data);
      })
      .catch((err) => {
        console.warn('Could not fetch profile:', err);
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });
    return () => {
      isSubscribed = false;
    };
  }, []);

  const handleExportPng = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `curiosity-profile-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export card PNG:', err);
    } finally {
      setExporting(false);
    }
  };

  // Generate SVG Radar Chart coordinates
  const renderRadarChart = () => {
    if (!profile) return null;
    const allDomains: Domain[] = [
      'science',
      'nature',
      'history',
      'art',
      'tech',
      'math',
      'philosophy',
      'society',
    ];
    const center = 100;
    const maxR = 75;
    const totalSlices = allDomains.length;

    // Find max domain count
    const values = allDomains.map((d) => profile.domain_distribution[d] || 0);
    const maxVal = Math.max(...values, 1);

    // Compute polygon points
    const points = allDomains.map((d, i) => {
      const val = profile.domain_distribution[d] || 0;
      const r = (val / maxVal) * maxR * 0.85 + maxR * 0.15;
      const angle = (i * 2 * Math.PI) / totalSlices - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    });

    return (
      <svg className="w-52 h-52 mx-auto drop-shadow-[0_0_16px_rgba(99,102,241,0.2)]" viewBox="0 0 200 200">
        {/* Background web rings */}
        {[0.33, 0.66, 1.0].map((ring) => (
          <circle
            key={ring}
            cx={center}
            cy={center}
            r={maxR * ring}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeDasharray="2,2"
          />
        ))}

        {/* Spokes */}
        {allDomains.map((_, i) => {
          const angle = (i * 2 * Math.PI) / totalSlices - Math.PI / 2;
          const x = center + maxR * Math.cos(angle);
          const y = center + maxR * Math.sin(angle);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.06)"
            />
          );
        })}

        {/* User Interest Shape */}
        <polygon
          points={points.join(' ')}
          fill="rgba(99, 102, 241, 0.3)"
          stroke="#6366f1"
          strokeWidth="2"
        />

        {/* Data Points */}
        {allDomains.map((d, i) => {
          const val = profile.domain_distribution[d] || 0;
          const r = (val / maxVal) * maxR * 0.85 + maxR * 0.15;
          const angle = (i * 2 * Math.PI) / totalSlices - Math.PI / 2;
          const x = center + r * Math.cos(angle);
          const y = center + r * Math.sin(angle);
          return (
            <circle
              key={d}
              cx={x}
              cy={y}
              r="3.5"
              fill={domainColors[d]}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090e]/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-panel-elevated rounded-2xl border border-[var(--border)] shadow-[0_24px_50px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="font-display text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Curiosity Profile
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile card"
            className="btn-tactile p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body (Exportable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 text-center text-xs text-[var(--text-muted)]">
              Synthesizing your curiosity profile…
            </div>
          ) : profile ? (
            <div
              ref={cardRef}
              className="p-6 rounded-2xl bg-gradient-to-b from-[#141829] to-[#0a0d16] border border-indigo-500/25 text-white space-y-5 shadow-2xl relative overflow-hidden"
            >
              {/* Card Watermark */}
              <div className="flex items-center justify-between text-[11px] text-indigo-300 font-mono-numbers tracking-wider uppercase border-b border-white/10 pb-3">
                <span className="font-semibold">Curiosity Machine Wrapped</span>
                <span>{profile.created_at ? profile.created_at.slice(0, 10) : 'Active'}</span>
              </div>

              {/* Archetype Title */}
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                  Explorer Archetype
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {profile.title}
                </h3>
                <p className="text-xs text-gray-300 italic max-w-xs mx-auto leading-relaxed">
                  "{profile.tagline}"
                </p>
              </div>

              {/* Radar Chart */}
              <div className="py-2">{renderRadarChart()}</div>

              {/* Key Stats Grid */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="font-display font-mono-numbers text-xl font-extrabold text-white">
                    {profile.total_explored}
                  </div>
                  <div className="text-[10px] text-gray-400 tracking-tight">Concepts Explored</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="font-display font-mono-numbers text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                    <Flame className="w-4 h-4" />
                    <span>{profile.streak_days}d</span>
                  </div>
                  <div className="text-[10px] text-gray-400 tracking-tight">Curiosity Streak</div>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="font-display text-xl font-extrabold text-indigo-400 capitalize">
                    {profile.deepest_depth}
                  </div>
                  <div className="text-[10px] text-gray-400 tracking-tight">Deepest Lens</div>
                </div>
              </div>

              {/* Blind spots */}
              {profile.blind_spots.length > 0 && (
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Uncharted Dimensions:</span>
                  </div>
                  <p className="text-gray-300 capitalize text-[11px] leading-relaxed">
                    You haven't explored concepts in{' '}
                    <span className="text-white font-medium">
                      {profile.blind_spots.map((b) => DOMAIN_LABELS[b as Domain] || b).join(', ')}
                    </span>
                    .
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border)] bg-black/15 flex items-center justify-between">
          <button
            onClick={handleExportPng}
            disabled={exporting || loading}
            className="btn-tactile px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Generating PNG…' : 'Export Share Card'}</span>
          </button>
          <button
            onClick={onClose}
            className="btn-tactile text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
