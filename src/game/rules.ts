import type { EnemyPolicy, HeroDefinition, HeroId } from './types';

export const COURTYARD_BOUNDS = {
  minX: -14.5,
  maxX: 14.5,
  minZ: -12.5,
  maxZ: 14.5,
} as const;

export const LORE_CHRONICLES = {
  elixirTitle: 'Elixir of Immunity (Qi Yang)',
  elixirOrigin:
    'Of unknown ancient origin, whispered to have been forged by Axia, the God of Medicine. The Qi Yang Elixir heals mortals from within, purges every malady, and bestows immortality alongside eternal youth.',
  elixirFlaw:
    "Its radiance carries a fatal flaw: consumed beyond measure, Qi Yang's life-giving essence inverts into a lethal, corrosive poison. Even divine beings covet it to ascend beyond their limits—yet excess invites ruin.",
  whiteLadyTitle: 'The White Lady · Cursed Divine Serpent',
  whiteLadyLore:
    'Once a revered Divine Serpent, she was cast down and cursed by the King of Gods. Yet in her consuming wrath, the curse twisted into far greater frost-serpent power. She hovers over the imperial altar to seize Axia’s Elixir and break heaven’s decree.',
} as const;

export const HERO_ROSTER: Record<HeroId, HeroDefinition> = {
  maomi: {
    id: 'maomi',
    name: 'Maomi',
    title: 'Poison-Tasting Herbalist',
    archetype: 'Venom Stun & Tolerance',
    weapon: 'Qi Yang Venom Vial',
    passive: 'Natural Tolerance: Resists 50% Miasma/Poison damage & converts cleansed toxins into retaliation.',
    accentHex: '#10b981',
    moveSpeed: 7.4,
    basicDamage: 24,
    basicRange: 5.5,
    poisonResistance: 0.5,
    primarySkill: {
      key: 'Q',
      name: 'Venom-Fang Stun',
      role: 'Poison Stun (2.4s) · 36 DMG',
      cooldown: 3.4,
    },
    secondarySkill: {
      key: 'E',
      name: 'Tolerance Purge',
      role: '+38 HP · Cleanse & Toxic Burst',
      cooldown: 6.2,
    },
    quote: 'Axia’s Qi Yang heals in drops and slays in floods—my tongue knows the razor’s edge.',
  },
  jinka: {
    id: 'jinka',
    name: 'Jinka',
    title: 'Sharp Court Strategist',
    archetype: 'Intuition & Tactical Planning',
    weapon: 'Ley-Line Strategy Scrolls',
    passive: 'Perfect Planning: Marks expose weak spots (+35% Fight IQ damage) & accelerate squad cooldowns.',
    accentHex: '#38bdf8',
    moveSpeed: 7.2,
    basicDamage: 26,
    basicRange: 9.8,
    poisonResistance: 0.1,
    primarySkill: {
      key: 'Q',
      name: 'Tactical Insight',
      role: '3 Scrolls · Expose (+35% DMG)',
      cooldown: 3.1,
    },
    secondarySkill: {
      key: 'E',
      name: 'Grand Plan Seal',
      role: '-35% Cooldowns · Slow & Break',
      cooldown: 5.8,
    },
    quote: 'His intuition reads every shadow step before the blade leaves its sheath.',
  },
  laulan: {
    id: 'laulan',
    name: 'Laulan',
    title: 'Martial Arts Tactician',
    archetype: 'Acupuncturist & Precision Combat',
    weapon: 'Combat Fan & Acu-Needles',
    passive: 'Pinpoint Acupressure: Precision strikes interrupt enemy attacks & trigger squad retaliation.',
    accentHex: '#f472b6',
    moveSpeed: 8.6,
    basicDamage: 30,
    basicRange: 4.5,
    poisonResistance: 0.15,
    primarySkill: {
      key: 'Q',
      name: 'Acupoint Piercer',
      role: 'Interrupt Telegraph · 46 DMG',
      cooldown: 2.8,
    },
    secondarySkill: {
      key: 'E',
      name: 'Meridian Counter',
      role: 'Dash · +35 Ward & Retaliate',
      cooldown: 5.2,
    },
    quote: 'One needle on the lung meridian halts a killer; one sweep of the fan scatters frost!',
  },
};

export const HERO_ORDER: HeroId[] = ['maomi', 'jinka', 'laulan'];

export function clampCourtyardPosition(x: number, z: number): { x: number; z: number } {
  return {
    x: Math.max(COURTYARD_BOUNDS.minX, Math.min(COURTYARD_BOUNDS.maxX, x)),
    z: Math.max(COURTYARD_BOUNDS.minZ, Math.min(COURTYARD_BOUNDS.maxZ, z)),
  };
}

export interface DamageResult {
  nextHp: number;
  nextBarrier: number;
  hpDamageTaken: number;
  mitigatedByResistance: number;
  defeated: boolean;
}

export function applySquadDamage(
  currentHp: number,
  currentBarrier: number,
  incomingDamage: number,
  isPoisonOrMiasma = false,
  activeHero: HeroId = 'jinka'
): DamageResult {
  const resistance = isPoisonOrMiasma ? HERO_ROSTER[activeHero].poisonResistance : 0;
  const resistedDamage = Math.round(Math.max(0, incomingDamage) * (1 - resistance));
  const mitigatedByResistance = Math.max(0, Math.round(incomingDamage) - resistedDamage);

  const absorbed = Math.min(currentBarrier, resistedDamage);
  const nextBarrier = Math.max(0, currentBarrier - absorbed);
  const hpDamageTaken = resistedDamage - absorbed;
  const nextHp = Math.max(0, currentHp - hpDamageTaken);
  return {
    nextHp,
    nextBarrier,
    hpDamageTaken,
    mitigatedByResistance,
    defeated: nextHp <= 0,
  };
}

export function applyHealingAndCleanse(
  currentHp: number,
  maxHp: number,
  healAmount: number,
  cleanseMiasma: boolean,
  currentMiasma: number
): { nextHp: number; nextMiasma: number; cleansedStacks: number } {
  const cleansedStacks = cleanseMiasma ? currentMiasma : 0;
  return {
    nextHp: Math.min(maxHp, Math.max(0, currentHp + Math.round(healAmount))),
    nextMiasma: cleanseMiasma ? 0 : currentMiasma,
    cleansedStacks,
  };
}

export function computeSynergyRetaliation(params: {
  baseDamage: number;
  targetPoisoned: boolean;
  targetExposed: boolean;
  fightIqStacks: number;
}): { finalDamage: number; triggeredRetaliation: boolean; nextFightIqStacks: number } {
  const synergyCount = (params.targetPoisoned ? 1 : 0) + (params.targetExposed ? 1 : 0);
  const exposedMult = params.targetExposed ? 1.35 : 1.0;
  const triggeredRetaliation = synergyCount >= 1 && params.fightIqStacks >= 2;

  const retaliationBonus = triggeredRetaliation ? 18 + params.fightIqStacks * 3 : 0;
  const finalDamage = Math.round(params.baseDamage * exposedMult + retaliationBonus);
  const nextFightIqStacks = triggeredRetaliation
    ? 0
    : Math.min(5, params.fightIqStacks + 1);

  return {
    finalDamage,
    triggeredRetaliation,
    nextFightIqStacks,
  };
}

export function addResonance(current: number, gain: number): number {
  return Math.max(0, Math.min(100, current + gain));
}

export function calculateFinalScore(params: {
  squadHp: number;
  elapsedSeconds: number;
  damageTaken: number;
  enemiesDefeated: number;
  retaliationsTriggered: number;
  victory: boolean;
}): number {
  const baseKills = params.enemiesDefeated * 120 + params.retaliationsTriggered * 75;
  if (!params.victory) {
    return Math.max(0, baseKills);
  }
  const hpBonus = Math.max(0, params.squadHp) * 12;
  const speedBonus = Math.max(0, Math.round(1200 - params.elapsedSeconds * 8));
  const disciplineBonus = Math.max(0, 500 - params.damageTaken * 2);
  return baseKills + hpBonus + speedBonus + disciplineBonus;
}

export interface EnemyAiStepInput {
  policy: EnemyPolicy;
  ex: number;
  ez: number;
  px: number;
  pz: number;
  speed: number;
  dt: number;
  strafeSign: number;
  state: 'approach' | 'windup' | 'attack' | 'recover' | 'ko';
}

export function computeEnemyDesiredVelocity(input: EnemyAiStepInput): { vx: number; vz: number; dist: number } {
  const dx = input.px - input.ex;
  const dz = input.pz - input.ez;
  const dist = Math.hypot(dx, dz) || 0.0001;
  const nx = dx / dist;
  const nz = dz / dist;
  const tx = -nz * input.strafeSign;
  const tz = nx * input.strafeSign;

  if (input.state === 'windup' || input.state === 'ko') {
    return { vx: 0, vz: 0, dist };
  }

  if (input.policy === 'stalker') {
    const flankWeight = dist > 3.2 ? 0.52 : 0.18;
    return {
      vx: (nx + tx * flankWeight) * input.speed,
      vz: (nz + tz * flankWeight) * input.speed,
      dist,
    };
  }

  if (input.policy === 'kunai') {
    let radial = 0;
    if (dist < 6.0) radial = -0.85;
    else if (dist > 10.5) radial = 0.85;
    return {
      vx: (nx * radial + tx * 0.72) * input.speed,
      vz: (nz * radial + tz * 0.72) * input.speed,
      dist,
    };
  }

  if (input.policy === 'sentinel') {
    if (dist <= 2.9) return { vx: 0, vz: 0, dist };
    return { vx: nx * input.speed, vz: nz * input.speed, dist };
  }

  const targetZ = Math.min(input.pz - 6.5, -3.5);
  const altarDx = input.px * 0.45 - input.ex;
  const altarDz = targetZ - input.ez;
  return {
    vx: (altarDx * 0.35 + tx * 0.75) * input.speed,
    vz: altarDz * 0.4 * input.speed,
    dist,
  };
}

export function getWaveConfiguration(wave: number): {
  stalkers: number;
  kunai: number;
  sentinels: number;
  spawnBoss: boolean;
  banner: string;
} {
  if (wave === 1) {
    return {
      stalkers: 3,
      kunai: 2,
      sentinels: 0,
      spawnBoss: false,
      banner: 'Wave I · Shadow Assassins ambush the outer lanterns seeking Axia’s Qi Yang Elixir!',
    };
  }
  if (wave === 2) {
    return {
      stalkers: 3,
      kunai: 2,
      sentinels: 2,
      spawnBoss: false,
      banner: 'Wave II · Frost Sentinels march! Chain Maomi’s Venom Stun into Jinka’s Insight!',
    };
  }
  return {
    stalkers: 2,
    kunai: 2,
    sentinels: 1,
    spawnBoss: true,
    banner: 'Final Confrontation · The Cursed Divine Serpent descends for the Qi Yang Elixir!',
  };
}
