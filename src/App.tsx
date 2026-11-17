/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { ImperialAtelierModal } from './components/ImperialAtelierModal';
import { CodexModal, OutcomeModal, PauseModal } from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import { WuxiaCourtyardEngine } from './game/WuxiaScene';
import type { CombatSnapshot } from './game/types';

const INITIAL_SNAPSHOT: CombatSnapshot = {
  phase: 'title',
  activeHero: 'jinka',
  squadHp: 200,
  squadMaxHp: 200,
  barrier: 0,
  miasmaStacks: 0,
  resonance: 25,
  fightIqStacks: 0,
  retaliationsTriggered: 0,
  wave: 1,
  maxWaves: 3,
  enemiesRemaining: 5,
  bossHp: 380,
  bossMaxHp: 380,
  bossActive: false,
  bossShielded: false,
  bossTelegraph: '',
  score: 0,
  combo: 0,
  damageTaken: 0,
  elapsedSeconds: 0,
  cooldowns: { strike: 0, skillQ: 0, skillE: 0, ultimate: 0 },
  bannerText: 'Three heroes stand united against the encroaching frost.',
  muted: false,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WuxiaCourtyardEngine | null>(null);

  const [snapshot, setSnapshot] = useState<CombatSnapshot>(INITIAL_SNAPSHOT);
  const [showAtelier, setShowAtelier] = useState(false);
  const [showCodex, setShowCodex] = useState(false);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new WuxiaCourtyardEngine(mount, (nextSnap) => {
      setSnapshot(nextSnap);
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startGame();
    }

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const openModalSafely = (which: 'atelier' | 'codex') => {
    if (snapshot.phase === 'playing') {
      engineRef.current?.togglePause();
    }
    if (which === 'atelier') setShowAtelier(true);
    else setShowCodex(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0c16]">
      {/* Isolated Full-Viewport WebGL Mount */}
      <div
        ref={canvasMountRef}
        data-testid="wuxia-canvas-mount"
        className="fixed inset-0 w-screen h-screen"
      />

      {snapshot.phase === 'title' && (
        <TitleScreen
          onStart={() => engineRef.current?.startGame()}
          onOpenAtelier={() => openModalSafely('atelier')}
          onOpenCodex={() => openModalSafely('codex')}
        />
      )}

      {(snapshot.phase === 'playing' || snapshot.phase === 'paused') && (
        <GameHUD
          snapshot={snapshot}
          onSwitchHero={(hero) => engineRef.current?.switchHero(hero)}
          onTriggerAction={(act) => engineRef.current?.triggerAction(act)}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onTogglePause={() => engineRef.current?.togglePause()}
          onOpenAtelier={() => openModalSafely('atelier')}
          onOpenCodex={() => openModalSafely('codex')}
        />
      )}

      {snapshot.phase === 'paused' && !showAtelier && !showCodex && (
        <PauseModal
          onResume={() => engineRef.current?.togglePause()}
          onRestart={() => engineRef.current?.startGame()}
          onReturnTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {(snapshot.phase === 'victory' || snapshot.phase === 'defeat') && (
        <OutcomeModal
          snapshot={snapshot}
          onRestart={() => engineRef.current?.startGame()}
          onReturnTitle={() => engineRef.current?.returnToTitle()}
        />
      )}

      {showCodex && <CodexModal onClose={() => setShowCodex(false)} />}
      {showAtelier && <ImperialAtelierModal onClose={() => setShowAtelier(false)} />}
    </div>
  );
}
