import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addResonance,
  applyHealingAndCleanse,
  applySquadDamage,
  calculateFinalScore,
  clampCourtyardPosition,
  computeEnemyDesiredVelocity,
  computeSynergyRetaliation,
  getWaveConfiguration,
  HERO_ROSTER,
  LORE_CHRONICLES,
} from './rules';

test('HERO_ROSTER and LORE_CHRONICLES reflect Qi Yang Elixir, Axia, and three hero specialties', () => {
  assert.ok(LORE_CHRONICLES.elixirOrigin.includes('Axia'));
  assert.ok(LORE_CHRONICLES.elixirFlaw.includes('poison'));
  assert.ok(LORE_CHRONICLES.whiteLadyLore.includes('Divine Serpent'));
  assert.equal(HERO_ROSTER.maomi.poisonResistance, 0.5);
  assert.equal(HERO_ROSTER.jinka.title, 'Sharp Court Strategist');
  assert.equal(HERO_ROSTER.laulan.title, 'Martial Arts Tactician');
});

test('Maomi natural tolerance mitigates 50% of poison/miasma damage', () => {
  const maomiHit = applySquadDamage(200, 0, 20, true, 'maomi');
  assert.equal(maomiHit.hpDamageTaken, 10);
  assert.equal(maomiHit.mitigatedByResistance, 10);

  const jinkaHit = applySquadDamage(200, 0, 20, true, 'jinka');
  assert.equal(jinkaHit.hpDamageTaken, 18);
});

test('applySquadDamage absorbs damage with barrier before reducing HP', () => {
  const partial = applySquadDamage(200, 25, 40, false, 'laulan');
  assert.equal(partial.nextBarrier, 0);
  assert.equal(partial.hpDamageTaken, 15);
  assert.equal(partial.nextHp, 185);
  assert.equal(partial.defeated, false);

  const lethal = applySquadDamage(10, 0, 25, false, 'jinka');
  assert.equal(lethal.nextHp, 0);
  assert.equal(lethal.defeated, true);
});

test('computeSynergyRetaliation triggers bonus Fight IQ burst when target is poisoned/exposed', () => {
  const buildUp = computeSynergyRetaliation({
    baseDamage: 30,
    targetPoisoned: true,
    targetExposed: true,
    fightIqStacks: 1,
  });
  assert.equal(buildUp.triggeredRetaliation, false);
  assert.equal(buildUp.nextFightIqStacks, 2);

  const burst = computeSynergyRetaliation({
    baseDamage: 30,
    targetPoisoned: true,
    targetExposed: true,
    fightIqStacks: 2,
  });
  assert.equal(burst.triggeredRetaliation, true);
  assert.ok(burst.finalDamage > 60);
  assert.equal(burst.nextFightIqStacks, 0);
});

test('applyHealingAndCleanse caps at maxHp and tracks cleansed stacks', () => {
  const healed = applyHealingAndCleanse(175, 200, 40, true, 3);
  assert.equal(healed.nextHp, 200);
  assert.equal(healed.nextMiasma, 0);
  assert.equal(healed.cleansedStacks, 3);
});

test('addResonance clamps between 0 and 100', () => {
  assert.equal(addResonance(80, 35), 100);
  assert.equal(addResonance(10, -25), 0);
});

test('clampCourtyardPosition keeps heroes inside playable courtyard boundaries', () => {
  const clamped = clampCourtyardPosition(99, -99);
  assert.equal(clamped.x, 14.5);
  assert.equal(clamped.z, -12.5);
});

test('computeEnemyDesiredVelocity produces distinct kiter vs stalker behavior', () => {
  const kunaiClose = computeEnemyDesiredVelocity({
    policy: 'kunai',
    ex: 0,
    ez: 0,
    px: 0,
    pz: 3,
    speed: 4,
    dt: 0.016,
    strafeSign: 1,
    state: 'approach',
  });
  assert.ok(kunaiClose.vz < 0);

  const stalkerApproach = computeEnemyDesiredVelocity({
    policy: 'stalker',
    ex: 0,
    ez: 0,
    px: 0,
    pz: 6,
    speed: 4,
    dt: 0.016,
    strafeSign: 1,
    state: 'approach',
  });
  assert.ok(stalkerApproach.vz > 0);
  assert.notEqual(stalkerApproach.vx, 0);
});

test('wave progression spawns boss only on final wave and computes positive victory score', () => {
  assert.equal(getWaveConfiguration(1).spawnBoss, false);
  assert.equal(getWaveConfiguration(3).spawnBoss, true);
  const victoryScore = calculateFinalScore({
    squadHp: 160,
    elapsedSeconds: 45,
    damageTaken: 40,
    enemiesDefeated: 12,
    retaliationsTriggered: 4,
    victory: true,
  });
  assert.ok(victoryScore > 3000);
});
