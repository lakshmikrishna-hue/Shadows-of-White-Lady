import React from 'react';
import { HERO_ORDER, HERO_ROSTER, LORE_CHRONICLES } from '../game/rules';
import type { CombatSnapshot } from '../game/types';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onReturnTitle,
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 9, 18, 0.82)' }}>
    <div
      className="w-full max-w-sm rounded-2xl border border-amber-400/45 p-6 text-center"
      style={{ backgroundColor: 'rgba(13, 18, 34, 0.96)' }}
    >
      <div className="font-hanzi text-cyan-300 text-sm tracking-widest mb-1">暫歇 · MEDITATION</div>
      <h2 className="font-wuxia text-2xl font-bold text-amber-200 mb-2">Courtyard Paused</h2>
      <p className="text-xs text-slate-300 mb-6">
        The lantern mist stills as the squad regroups their breath.
      </p>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onResume}
          className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-wuxia font-bold text-sm cursor-pointer"
        >
          Resume Battle
        </button>
        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-400/35 font-wuxia font-bold text-xs cursor-pointer"
        >
          Restart Wave I
        </button>
        <button
          type="button"
          onClick={onReturnTitle}
          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-wuxia font-bold text-xs cursor-pointer"
        >
          Return to Title
        </button>
      </div>
    </div>
  </div>
);

interface EndModalProps {
  snapshot: CombatSnapshot;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const OutcomeModal: React.FC<EndModalProps> = ({
  snapshot,
  onRestart,
  onReturnTitle,
}) => {
  const isVictory = snapshot.phase === 'victory';
  const formatTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 9, 18, 0.86)' }}>
      <div
        className="w-full max-w-md rounded-2xl border border-amber-400/50 p-6 text-center"
        style={{ backgroundColor: 'rgba(13, 18, 34, 0.97)' }}
      >
        <div className="font-hanzi text-sm tracking-widest text-cyan-300 mb-1">
          {isVictory ? '靈藥歸位 · VICTORY' : '寒霧侵蝕 · DEFEAT'}
        </div>
        <h2 className="font-wuxia text-2xl font-bold text-amber-200 mb-2">
          {isVictory ? 'Elixir of Immunity Secured' : 'Overcome by Frost & Shadow'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
          {snapshot.bannerText}
        </p>

        <div className="grid grid-cols-3 gap-2.5 mb-6">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
            <div className="text-[10px] uppercase text-slate-400">Score</div>
            <div className="tabular-nums font-wuxia text-lg font-bold text-amber-300">
              {snapshot.score}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
            <div className="text-[10px] uppercase text-slate-400">
              {isVictory ? 'Clear Time' : 'Wave Reached'}
            </div>
            <div className="tabular-nums font-wuxia text-lg font-bold text-cyan-200">
              {isVictory ? formatTime(snapshot.elapsedSeconds) : `${snapshot.wave}/${snapshot.maxWaves}`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
            <div className="text-[10px] uppercase text-slate-400">
              {isVictory ? 'Retaliations / DMG' : 'Boss HP Left'}
            </div>
            <div className="tabular-nums font-wuxia text-lg font-bold text-emerald-300">
              {isVictory
                ? `${snapshot.retaliationsTriggered} · ${snapshot.damageTaken}`
                : snapshot.bossActive
                  ? snapshot.bossHp
                  : '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRestart}
            className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-wuxia font-bold text-sm cursor-pointer"
          >
            {isVictory ? 'Play Again' : 'Try Again'}
          </button>
          <button
            type="button"
            onClick={onReturnTitle}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-wuxia font-bold text-xs cursor-pointer"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
};

interface CodexModalProps {
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(6, 9, 18, 0.88)' }}>
    <div
      className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-amber-400/45 p-6"
      style={{ backgroundColor: 'rgba(13, 18, 34, 0.98)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <span className="font-hanzi text-xs tracking-widest text-cyan-300">本草密卷 · SQUAD CODEX</span>
          <h2 className="font-wuxia text-2xl font-bold text-amber-200">
            Heroes &amp; Key Art Reference
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Squad Codex"
          className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-2 space-y-3">
          <img
            src="/assets/aistudio/Gemini_Generated_Image_ywxvhcywxvhcywxv_bc660a2b.jpg"
            alt="Shadows of the White Lady Concept Art Poster"
            className="w-full max-h-[250px] rounded-xl border border-amber-400/35 object-cover object-top"
          />

          <div className="p-3.5 rounded-xl bg-slate-900 border border-emerald-400/40">
            <div className="text-[11px] font-wuxia font-bold text-emerald-300 mb-1">
              {LORE_CHRONICLES.elixirTitle}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">
              {LORE_CHRONICLES.elixirOrigin}
            </p>
            <p className="text-[11px] text-amber-200/95 leading-relaxed">
              <strong className="text-amber-300">Fatal Flaw:</strong> {LORE_CHRONICLES.elixirFlaw}
            </p>
          </div>
        </div>

        <div className="md:col-span-3 space-y-3">
          {HERO_ORDER.map((id) => {
            const h = HERO_ROSTER[id];
            return (
              <div key={id} className="p-3.5 rounded-xl bg-slate-900 border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <strong className="font-wuxia text-sm text-white">{h.name}</strong>
                  <span className="text-[11px] font-semibold" style={{ color: h.accentHex }}>
                    {h.title} · {h.archetype}
                  </span>
                </div>
                <p className="text-[11px] text-amber-200/90 mb-1.5">{h.passive}</p>
                <div className="text-[11px] text-slate-300 mb-1">
                  [Q] <span className="text-white font-semibold">{h.primarySkill.name}</span> ({h.primarySkill.role}) ·{' '}
                  [E] <span className="text-white font-semibold">{h.secondarySkill.name}</span> ({h.secondarySkill.role})
                </div>
                <p className="text-[11px] text-slate-400 italic">"{h.quote}"</p>
              </div>
            );
          })}

          <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/40">
            <div className="flex items-center justify-between mb-1">
              <strong className="font-wuxia text-sm text-cyan-200">
                {LORE_CHRONICLES.whiteLadyTitle}
              </strong>
              <span className="text-[11px] text-cyan-400 font-semibold">Cursed Divine Boss</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {LORE_CHRONICLES.whiteLadyLore}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
);
