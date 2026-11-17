import React, { useEffect, useState } from 'react';
import { HERO_ORDER, HERO_ROSTER } from '../game/rules';
import type { CombatSnapshot, HeroId } from '../game/types';

interface GameHUDProps {
  snapshot: CombatSnapshot;
  onSwitchHero: (hero: HeroId) => void;
  onTriggerAction: (action: 'strike' | 'skillQ' | 'skillE' | 'ultimate') => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenAtelier: () => void;
  onOpenCodex: () => void;
}

function HeroIconSvg({ hero }: { hero: HeroId }) {
  if (hero === 'maomi') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path d="M9 3h6v3l4 8a5 5 0 0 1-4.5 7h-5A5 5 0 0 1 5 14l4-8V3z" fill="#10b981" stroke="#064e3b" strokeWidth="1.5" />
        <rect x="9" y="2" width="6" height="3" rx="1" fill="#fbbf24" stroke="#064e3b" strokeWidth="1" />
        <circle cx="11" cy="14" r="2" fill="#a7f3d0" />
      </svg>
    );
  }
  if (hero === 'jinka') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <rect x="6" y="4" width="12" height="16" rx="2" fill="#e0f2fe" stroke="#1e3a8a" strokeWidth="1.5" />
        <rect x="4" y="3" width="16" height="2.5" rx="1" fill="#fbbf24" stroke="#1e3a8a" strokeWidth="1" />
        <rect x="4" y="18.5" width="16" height="2.5" rx="1" fill="#fbbf24" stroke="#1e3a8a" strokeWidth="1" />
        <path d="M9 9h6M9 12h6M12 8v7" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path d="M12 19L3 9a12 12 0 0 1 18 0l-9 10z" fill="#fbcfe8" stroke="#831843" strokeWidth="1.5" />
      <path d="M12 19L8 7.5M12 19V6.5M12 19l4-11.5" stroke="#db2777" strokeWidth="1.2" />
    </svg>
  );
}

export const GameHUD: React.FC<GameHUDProps> = ({
  snapshot,
  onSwitchHero,
  onTriggerAction,
  onToggleMute,
  onTogglePause,
  onOpenAtelier,
  onOpenCodex,
}) => {
  const [ghostHp, setGhostHp] = useState(snapshot.squadHp);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setGhostHp(snapshot.squadHp), 280);
    return () => clearTimeout(timer);
  }, [snapshot.squadHp]);

  const activeDef = HERO_ROSTER[snapshot.activeHero];
  const hpPct = Math.max(0, Math.min(100, (snapshot.squadHp / snapshot.squadMaxHp) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (ghostHp / snapshot.squadMaxHp) * 100));
  const bossPct = Math.max(0, Math.min(100, (snapshot.bossHp / snapshot.bossMaxHp) * 100));

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* TOP PERIMETER CLUSTERS */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left Cluster: Squad Vitality & Wave Readout */}
        <div
          className="pointer-events-auto rounded-xl px-3.5 py-2.5 border border-amber-400/35 min-w-[235px] max-w-[300px]"
          style={{ backgroundColor: 'rgba(11, 15, 28, 0.88)' }}
        >
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              Squad Vitality
            </span>
            <span className="tabular-nums text-sm font-bold text-emerald-300 hud-text-stroke">
              {snapshot.squadHp} / {snapshot.squadMaxHp}
              {snapshot.barrier > 0 ? ` (+${snapshot.barrier})` : ''}
            </span>
          </div>

          <div className="relative h-2.5 w-full rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-rose-400/75 transition-all duration-300"
              style={{ width: `${ghostPct}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-emerald-400 transition-all duration-150"
              style={{ width: `${hpPct}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-semibold text-cyan-200">
              Wave {snapshot.wave}/{snapshot.maxWaves} · {snapshot.enemiesRemaining} Left
            </span>
            <span className="tabular-nums text-amber-200 font-mono">
              {formatTimer(snapshot.elapsedSeconds)} · {snapshot.score} pts
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span className="text-amber-300 font-semibold" data-testid="fight-iq-readout">
              Fight IQ {snapshot.fightIqStacks}/5 · {snapshot.retaliationsTriggered} Retaliations
            </span>
            {activeDef.poisonResistance >= 0.4 && (
              <span className="text-emerald-300 font-mono text-[10px]">
                50% Toxin Resist
              </span>
            )}
          </div>

          {snapshot.miasmaStacks > 0 && (
            <div className="mt-1 text-[11px] text-rose-300 font-semibold">
              Frost Miasma x{snapshot.miasmaStacks} (Maomi [E] cleanses)
            </div>
          )}
        </div>

        {/* Top-Center Slim Boss Banner (White Lady when active) or Tactician Banner */}
        <div className="hidden md:flex flex-col items-center max-w-md flex-1">
          {snapshot.bossActive ? (
            <div
              className="w-full rounded-xl px-4 py-2 border border-cyan-400/45"
              style={{ backgroundColor: 'rgba(11, 16, 30, 0.9)' }}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-wuxia font-bold text-cyan-100">
                  The White Lady {snapshot.bossShielded ? '· Frost Ward Active' : ''}
                </span>
                <span className="tabular-nums font-mono text-cyan-300">
                  {snapshot.bossHp} / {snapshot.bossMaxHp}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-700 overflow-hidden">
                <div
                  className="h-full bg-cyan-300 transition-all duration-200"
                  style={{ width: `${bossPct}%` }}
                />
              </div>
              {snapshot.bossTelegraph && (
                <div className="mt-1 text-[11px] text-amber-300 font-semibold text-center">
                  {snapshot.bossTelegraph}
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-xl px-4 py-1.5 border border-amber-400/25 text-xs text-amber-100 text-center"
              style={{ backgroundColor: 'rgba(11, 15, 28, 0.82)' }}
            >
              {snapshot.bannerText}
            </div>
          )}
        </div>

        {/* Top-Right Utility Square Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            tabIndex={-1}
            aria-label={snapshot.muted ? 'Unmute audio [M]' : 'Mute audio [M]'}
            title={snapshot.muted ? 'Unmute [M]' : 'Mute [M]'}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleMute();
            }}
            className="w-10 h-10 rounded-xl border border-amber-400/35 flex items-center justify-center text-amber-200 hover:bg-slate-800 cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 15, 28, 0.9)' }}
          >
            {snapshot.muted ? (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M22 9l-6 6M16 9l6 6" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M19 5a9 9 0 0 1 0 14" />
              </svg>
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Imperial Atelier"
            title="Imperial Atelier (Music, Art & TTS)"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenAtelier();
            }}
            className="w-10 h-10 rounded-xl border border-cyan-400/40 flex items-center justify-center text-cyan-200 hover:bg-slate-800 cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 15, 28, 0.9)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3l1.9 4.2L18 9l-4.1 1.8L12 15l-1.9-4.2L6 9l4.1-1.8L12 3z" />
              <path d="M5 19l1-2 2-1-2-1-1-2-1 2-2 1 2 1 1 2z" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Open Squad Codex"
            title="Squad Codex"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenCodex();
            }}
            className="w-10 h-10 rounded-xl border border-emerald-400/40 flex items-center justify-center text-emerald-200 hover:bg-slate-800 cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 15, 28, 0.9)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Pause Game [P]"
            title="Pause [P / Esc]"
            onClick={(e) => {
              e.currentTarget.blur();
              onTogglePause();
            }}
            className="w-10 h-10 rounded-xl border border-amber-400/35 flex items-center justify-center text-amber-200 hover:bg-slate-800 cursor-pointer"
            style={{ backgroundColor: 'rgba(11, 15, 28, 0.9)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* BOTTOM-CENTER COLLAPSIBLE WUXIA SQUAD DOCK */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            setDockCollapsed((prev) => !prev);
          }}
          className="pointer-events-auto mb-1 px-3 py-0.5 rounded-t-lg border border-b-0 border-amber-400/35 text-[10px] uppercase tracking-wider text-amber-200 cursor-pointer"
          style={{ backgroundColor: 'rgba(11, 15, 28, 0.92)' }}
        >
          {dockCollapsed ? 'Show Squad Arts' : 'Hide Controls'}
        </button>

        {!dockCollapsed && (
          <div
            className="pointer-events-auto w-full max-w-[940px] rounded-2xl border border-amber-400/35 px-3 py-2 flex flex-col gap-1.5"
            style={{ backgroundColor: 'rgba(11, 15, 28, 0.92)' }}
          >
            <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-slate-300 border-b border-slate-800/90 pb-1">
              <span>
                <strong className="font-wuxia text-white">{activeDef.name}</strong> ·{' '}
                <span style={{ color: activeDef.accentHex }}>{activeDef.archetype}</span>
              </span>
              <span className="hidden sm:inline text-slate-400 truncate max-w-[560px]">
                {activeDef.passive}
              </span>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
            {/* Hero Switcher [1] [2] [3] */}
            <div className="flex items-center gap-1.5">
              {HERO_ORDER.map((id, idx) => {
                const def = HERO_ROSTER[id];
                const isActive = snapshot.activeHero === id;
                return (
                  <button
                    key={id}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onSwitchHero(id);
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      isActive
                        ? 'border-amber-300 bg-slate-800 text-white'
                        : 'border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <HeroIconSvg hero={id} />
                    <div>
                      <div className="text-[10px] font-mono text-amber-300">[{idx + 1}]</div>
                      <div className="font-wuxia text-xs font-bold leading-tight">{def.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 4 Active Hero Combat Abilities */}
            <div className="flex items-center gap-1.5 flex-1 justify-end flex-wrap md:flex-nowrap">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerAction('strike');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-600 bg-slate-900 hover:border-amber-300 text-left cursor-pointer min-w-[96px]"
              >
                <div className="flex justify-between text-[10px] text-amber-300 font-mono">
                  <span>[Space]</span>
                  <span>{snapshot.cooldowns.strike > 0 ? `${snapshot.cooldowns.strike}s` : 'Ready'}</span>
                </div>
                <div className="text-xs font-bold text-white">{activeDef.weapon.split(' ')[0]} Strike</div>
                <div className="text-[10px] text-slate-400">{activeDef.basicDamage} DMG</div>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerAction('skillQ');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-600 bg-slate-900 hover:border-cyan-300 text-left cursor-pointer min-w-[118px]"
              >
                <div className="flex justify-between text-[10px] text-cyan-300 font-mono">
                  <span>[Q]</span>
                  <span>{snapshot.cooldowns.skillQ > 0 ? `${snapshot.cooldowns.skillQ}s` : 'Ready'}</span>
                </div>
                <div className="text-xs font-bold text-white">{activeDef.primarySkill.name}</div>
                <div className="text-[10px] text-slate-400">{activeDef.primarySkill.role}</div>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerAction('skillE');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-600 bg-slate-900 hover:border-emerald-300 text-left cursor-pointer min-w-[118px]"
              >
                <div className="flex justify-between text-[10px] text-emerald-300 font-mono">
                  <span>[E]</span>
                  <span>{snapshot.cooldowns.skillE > 0 ? `${snapshot.cooldowns.skillE}s` : 'Ready'}</span>
                </div>
                <div className="text-xs font-bold text-white">{activeDef.secondarySkill.name}</div>
                <div className="text-[10px] text-slate-400">{activeDef.secondarySkill.role}</div>
              </button>

              <button
                type="button"
                tabIndex={-1}
                disabled={snapshot.resonance < 100}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onTriggerAction('ultimate');
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-left cursor-pointer min-w-[118px] ${
                  snapshot.resonance >= 100
                    ? 'border-amber-300 bg-amber-950/80 text-amber-100'
                    : 'border-slate-700 bg-slate-900/70 text-slate-400 opacity-75 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between text-[10px] font-mono text-amber-300">
                  <span>[R]</span>
                  <span className="tabular-nums">{snapshot.resonance}%</span>
                </div>
                <div className="text-xs font-wuxia font-bold">Tri-Qi Resonance</div>
                <div className="text-[10px] text-amber-200/80">88 AoE · Break Ward</div>
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
