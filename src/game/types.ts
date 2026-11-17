export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type HeroId = 'maomi' | 'jinka' | 'laulan';

export type EnemyPolicy = 'stalker' | 'kunai' | 'sentinel' | 'whitelady';

export interface HeroAbilityMeta {
  key: string;
  name: string;
  role: string;
  cooldown: number;
}

export interface HeroDefinition {
  id: HeroId;
  name: string;
  title: string;
  archetype: string;
  weapon: string;
  passive: string;
  accentHex: string;
  moveSpeed: number;
  basicDamage: number;
  basicRange: number;
  poisonResistance: number; // 0..1 fraction of poison/miasma damage resisted
  primarySkill: HeroAbilityMeta;
  secondarySkill: HeroAbilityMeta;
  quote: string;
}

export interface CombatSnapshot {
  phase: GamePhase;
  activeHero: HeroId;
  squadHp: number;
  squadMaxHp: number;
  barrier: number;
  miasmaStacks: number;
  resonance: number;
  fightIqStacks: number;
  retaliationsTriggered: number;
  wave: number;
  maxWaves: number;
  enemiesRemaining: number;
  bossHp: number;
  bossMaxHp: number;
  bossActive: boolean;
  bossShielded: boolean;
  bossTelegraph: string;
  score: number;
  combo: number;
  damageTaken: number;
  elapsedSeconds: number;
  cooldowns: {
    strike: number;
    skillQ: number;
    skillE: number;
    ultimate: number;
  };
  bannerText: string;
  muted: boolean;
}
