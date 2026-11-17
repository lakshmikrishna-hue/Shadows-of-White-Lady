import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
  onOpenAtelier: () => void;
  onOpenCodex: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenAtelier,
  onOpenCodex,
}) => {
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 sm:p-8">
      {/* Upper-left framed title plaque leaving 65%+ of the courtyard vista clear */}
      <div
        className="w-full max-w-[500px] pointer-events-auto p-5 sm:p-6 rounded-2xl border border-amber-400/35"
        style={{
          backgroundColor: 'rgba(10, 13, 24, 0.86)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.72), inset 0 1px 0 rgba(251, 191, 36, 0.16)',
        }}
      >
        {/* Bespoke Inline SVG Title Emblem & Lockup */}
        <svg
          viewBox="0 0 520 130"
          className="w-full h-auto mb-4"
          aria-label="Shadows of the White Lady"
        >
          <defs>
            <linearGradient id="titleGoldGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fef3c7" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Left Seal Crest: Elixir Vial */}
          <g transform="translate(8, 18)">
            <circle cx="38" cy="38" r="34" fill="#10182b" stroke="#fbbf24" strokeWidth="2" />
            <circle cx="38" cy="38" r="28" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="4 3" />
            <path d="M38 14 L50 38 L38 62 L26 38 Z" fill="#10b981" fillOpacity="0.3" stroke="#6ee7b7" strokeWidth="1.5" />
            <circle cx="38" cy="40" r="8" fill="#34d399" />
            <rect x="35" y="25" width="6" height="5" fill="#fbbf24" />
          </g>

          {/* Chinese Seal Stamp */}
          <text
            x="96"
            y="34"
            fill="#67e8f9"
            fontSize="13"
            fontFamily="Noto Serif SC, serif"
            letterSpacing="4"
          >
            白衣魅影 · 靈藥試煉
          </text>

          {/* Primary Display Title */}
          <text
            x="96"
            y="72"
            fill="url(#titleGoldGrad)"
            fontSize="31"
            fontWeight="900"
            fontFamily="Cinzel, Georgia, serif"
            letterSpacing="2"
          >
            SHADOWS OF THE
          </text>
          <text
            x="96"
            y="108"
            fill="#e0f2fe"
            fontSize="30"
            fontWeight="800"
            fontFamily="Cinzel, Georgia, serif"
            letterSpacing="3"
          >
            WHITE LADY
          </text>
          <line x1="96" y1="120" x2="504" y2="120" stroke="#fbbf24" strokeOpacity="0.45" strokeWidth="1.5" />
        </svg>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onStart}
            className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-wuxia font-bold text-xs sm:text-sm tracking-wide shadow-lg cursor-pointer transition-colors whitespace-nowrap"
          >
            Begin Courtyard Battle
          </button>

          <button
            type="button"
            onClick={onOpenAtelier}
            className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-200 border border-cyan-400/40 font-wuxia font-bold text-xs tracking-wide cursor-pointer transition-colors whitespace-nowrap"
          >
            Imperial Atelier
          </button>

          <button
            type="button"
            onClick={onOpenCodex}
            className="px-3.5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-200 border border-emerald-400/40 font-wuxia font-bold text-xs tracking-wide cursor-pointer transition-colors whitespace-nowrap"
          >
            Squad Codex
          </button>
        </div>
      </div>

      {/* Single flat borderless control-hint line in bottom safe margin */}
      <div className="w-full text-center pb-1">
        <p className="text-xs sm:text-sm text-slate-200/90 tracking-wide hud-text-stroke">
          WASD Move · 1–3 Switch Hero · Space Strike · Q/E Arts · R Resonance · Esc Pause
        </p>
      </div>
    </div>
  );
};
