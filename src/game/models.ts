import * as THREE from 'three';
import type { EnemyPolicy, HeroId } from './types';

export interface ProceduralTextures {
  stoneColor: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  woodColor: THREE.CanvasTexture;
  scrollRune: THREE.CanvasTexture;
  serpentScale: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  maxAnisotropy: number;
}

function createAnimeFaceTexture(opts: {
  skin: string;
  eyeColor: string;
  browColor: string;
  lipColor: string;
  blush?: string;
  masked?: boolean;
  maxAnisotropy: number;
}): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Base skin tone
  ctx.fillStyle = opts.skin;
  ctx.fillRect(0, 0, 256, 256);

  if (opts.masked) {
    // Dark shinobi hood & cloth mask covering lower face
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, 256, 256);
    // Narrow skin slit around eyes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(72, 102, 112, 34);
    // Glowing crimson eyes
    ctx.fillStyle = opts.eyeColor;
    ctx.shadowColor = opts.eyeColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(104, 119, 10, 5, -0.14, 0, Math.PI * 2);
    ctx.ellipse(152, 119, 10, 5, 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Subtle cheek blush
    if (opts.blush) {
      ctx.fillStyle = opts.blush;
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      ctx.ellipse(82, 162, 16, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(174, 162, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Expressive Anime Eyes (bold & readable at 3D gameplay distance)
    const drawEye = (cx: number, flip: number) => {
      // Sclera
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(cx, 136, 17, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Iris
      const grad = ctx.createRadialGradient(cx, 134, 3, cx, 137, 14);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.62, opts.eyeColor);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, 137, 12.5, 14.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.ellipse(cx, 138, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Specular Catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 4.5, 130, 3.8, 0, Math.PI * 2);
      ctx.arc(cx + 4.5, 143, 2.1, 0, Math.PI * 2);
      ctx.fill();

      // Bold Upper Eyelash Line
      ctx.strokeStyle = '#090d16';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 18, 129);
      ctx.quadraticCurveTo(cx, 115, cx + 18, 130);
      ctx.stroke();

      // Eyebrow
      ctx.strokeStyle = opts.browColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 15 * flip, 110);
      ctx.quadraticCurveTo(cx, 104, cx + 15 * flip, 112);
      ctx.stroke();
    };

    drawEye(96, 1);
    drawEye(160, -1);

    // Subtle Nose Shadow
    ctx.strokeStyle = 'rgba(155, 95, 78, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(128, 150);
    ctx.lineTo(126, 161);
    ctx.lineTo(131, 162);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = opts.lipColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(118, 178);
    ctx.quadraticCurveTo(128, 184, 138, 178);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.maxAnisotropy;
  return tex;
}

function createRuneRobeTexture(opts: {
  baseColor: string;
  shadeColor: string;
  runeColor: string;
  trimColor: string;
  maxAnisotropy: number;
}): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, opts.baseColor);
  grad.addColorStop(1, opts.shadeColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle vertical silk folds
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 3;
  for (let x = 16; x < 256; x += 28) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 6, 256);
    ctx.stroke();
  }

  // Gold border trim near hem
  ctx.fillStyle = opts.trimColor;
  ctx.fillRect(0, 214, 256, 7);
  ctx.fillRect(0, 244, 256, 6);

  // Glowing mystical rune diamonds & sigils along the hem
  ctx.strokeStyle = opts.runeColor;
  ctx.fillStyle = opts.runeColor;
  ctx.shadowColor = opts.runeColor;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.4;
  for (let x = 24; x < 256; x += 52) {
    ctx.beginPath();
    ctx.moveTo(x, 178);
    ctx.lineTo(x + 12, 194);
    ctx.lineTo(x, 210);
    ctx.lineTo(x - 12, 194);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 194, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = opts.maxAnisotropy;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Stone Courtyard Flagstones (Color + Bump)
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = 512;
  stoneCanvas.height = 512;
  const sCtx = stoneCanvas.getContext('2d')!;
  sCtx.fillStyle = '#252c40';
  sCtx.fillRect(0, 0, 512, 512);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#909090';
  bCtx.fillRect(0, 0, 512, 512);

  const tile = 64;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const offset = (row % 2) * (tile / 2);
      const x = (col * tile + offset) % 512;
      const y = row * tile;
      const tone = 34 + Math.floor(Math.random() * 14);
      sCtx.fillStyle = `rgb(${tone}, ${tone + 7}, ${tone + 24})`;
      sCtx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      bCtx.fillStyle = `rgb(${150 + Math.floor(Math.random() * 35)}, ${150 + Math.floor(Math.random() * 35)}, ${150 + Math.floor(Math.random() * 35)})`;
      bCtx.fillRect(x + 2, y + 2, tile - 4, tile - 4);

      if (Math.random() > 0.65) {
        sCtx.fillStyle = 'rgba(42, 85, 78, 0.28)';
        sCtx.beginPath();
        sCtx.arc(x + tile * 0.5, y + tile * 0.5, 8 + Math.random() * 10, 0, Math.PI * 2);
        sCtx.fill();
      }
    }
  }

  const stoneColor = new THREE.CanvasTexture(stoneCanvas);
  stoneColor.colorSpace = THREE.SRGBColorSpace;
  stoneColor.wrapS = stoneColor.wrapT = THREE.RepeatWrapping;
  stoneColor.repeat.set(6, 6);
  stoneColor.anisotropy = maxAnisotropy;

  const stoneBump = new THREE.CanvasTexture(bumpCanvas);
  stoneBump.wrapS = stoneBump.wrapT = THREE.RepeatWrapping;
  stoneBump.repeat.set(6, 6);
  stoneBump.anisotropy = maxAnisotropy;

  // 2. Lacquered Imperial Wood Grain
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#4c1d24';
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 48; i++) {
    wCtx.strokeStyle = i % 2 === 0 ? 'rgba(92, 34, 38, 0.5)' : 'rgba(30, 10, 14, 0.45)';
    wCtx.lineWidth = 2 + Math.random() * 3;
    wCtx.beginPath();
    wCtx.moveTo(0, i * 5.4);
    wCtx.bezierCurveTo(85, i * 5.4 + 4, 170, i * 5.4 - 4, 256, i * 5.4);
    wCtx.stroke();
  }
  const woodColor = new THREE.CanvasTexture(woodCanvas);
  woodColor.colorSpace = THREE.SRGBColorSpace;
  woodColor.wrapS = woodColor.wrapT = THREE.RepeatWrapping;
  woodColor.anisotropy = maxAnisotropy;

  // 3. Calligraphic Rune Scroll Texture
  const scrollCanvas = document.createElement('canvas');
  scrollCanvas.width = 128;
  scrollCanvas.height = 256;
  const scCtx = scrollCanvas.getContext('2d')!;
  scCtx.fillStyle = '#e0f2fe';
  scCtx.fillRect(0, 0, 128, 256);
  scCtx.strokeStyle = '#0284c7';
  scCtx.lineWidth = 6;
  scCtx.strokeRect(8, 8, 112, 240);
  scCtx.fillStyle = '#0369a1';
  scCtx.font = 'bold 34px serif';
  scCtx.textAlign = 'center';
  ['符', '陣', '封', '脈'].forEach((glyph, idx) => {
    scCtx.fillText(glyph, 64, 62 + idx * 50);
  });
  const scrollRune = new THREE.CanvasTexture(scrollCanvas);
  scrollRune.colorSpace = THREE.SRGBColorSpace;
  scrollRune.anisotropy = maxAnisotropy;

  // 4. Iridescent White Serpent Scale Texture
  const scaleCanvas = document.createElement('canvas');
  scaleCanvas.width = 256;
  scaleCanvas.height = 256;
  const spCtx = scaleCanvas.getContext('2d')!;
  spCtx.fillStyle = '#e0f2fe';
  spCtx.fillRect(0, 0, 256, 256);
  spCtx.strokeStyle = '#7dd3fc';
  spCtx.lineWidth = 2;
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 10; col++) {
      const ox = (row % 2) * 14;
      spCtx.beginPath();
      spCtx.arc(col * 28 + ox, row * 22, 13, 0, Math.PI);
      spCtx.stroke();
    }
  }
  const serpentScale = new THREE.CanvasTexture(scaleCanvas);
  serpentScale.colorSpace = THREE.SRGBColorSpace;
  serpentScale.wrapS = serpentScale.wrapT = THREE.RepeatWrapping;
  serpentScale.repeat.set(3, 5);
  serpentScale.anisotropy = maxAnisotropy;

  // 5. Soft Radial Contact Shadow Disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(3, 6, 14, 0.78)');
  grad.addColorStop(0.55, 'rgba(3, 6, 14, 0.35)');
  grad.addColorStop(1, 'rgba(3, 6, 14, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  return { stoneColor, stoneBump, woodColor, scrollRune, serpentScale, contactShadow, maxAnisotropy };
}

export function createContactShadow(shadowTex: THREE.CanvasTexture, radius = 0.8): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 20);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.015;
  return mesh;
}

export interface ArticulatedCharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  auraRing: THREE.Mesh;
  weaponAnchor: THREE.Group;
  orbiters: THREE.Object3D[];
  hitFlashMaterials: THREE.MeshStandardMaterial[];
}

function buildHumanHead(opts: {
  skinMat: THREE.MeshStandardMaterial;
  faceTex: THREE.CanvasTexture;
  hairMat: THREE.MeshStandardMaterial;
  style: 'maomi' | 'jinka' | 'laulan' | 'whitelady' | 'assassin';
  frostMat?: THREE.Material;
}): THREE.Group {
  const headGroup = new THREE.Group();

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.08, 0.16, 10), opts.skinMat);
  neck.position.y = -0.14;
  headGroup.add(neck);

  // Slightly oval human anime head with mapped face texture facing +Z
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: opts.faceTex,
    roughness: 0.6,
    metalness: 0.02,
  });
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), faceMat);
  cranium.scale.set(0.95, 1.08, 0.96);
  cranium.rotation.y = -Math.PI / 2; // Align u=0.5 directly forward (+Z)
  cranium.castShadow = true;
  headGroup.add(cranium);

  if (opts.style === 'assassin') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.4, 12), opts.hairMat);
    hood.position.set(0, 0.12, -0.03);
    hood.rotation.x = -0.2;
    headGroup.add(hood);
    return headGroup;
  }

  // Hair Crown & Front Layered Bangs (kept cleanly above eyebrows)
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    opts.hairMat
  );
  crown.rotation.x = -0.34;
  crown.position.y = 0.04;
  headGroup.add(crown);

  // Sculpted forehead bangs & cheek side-locks
  const bangGeo = new THREE.ConeGeometry(0.042, 0.1, 6);
  [-0.1, -0.03, 0.04, 0.1].forEach((bx, idx) => {
    const bang = new THREE.Mesh(bangGeo, opts.hairMat);
    bang.position.set(bx, 0.145, 0.155);
    bang.rotation.x = Math.PI + 0.15;
    bang.rotation.z = (idx - 1.5) * 0.1;
    headGroup.add(bang);
  });

  const sideLockGeo = new THREE.CylinderGeometry(0.034, 0.014, 0.34, 7);
  const lockL = new THREE.Mesh(sideLockGeo, opts.hairMat);
  lockL.position.set(-0.18, -0.06, 0.06);
  const lockR = new THREE.Mesh(sideLockGeo, opts.hairMat);
  lockR.position.set(0.18, -0.06, 0.06);
  headGroup.add(lockL, lockR);

  if (opts.style === 'maomi') {
    const bunGeo = new THREE.SphereGeometry(0.095, 12, 10);
    const bunL = new THREE.Mesh(bunGeo, opts.hairMat);
    bunL.position.set(-0.2, 0.17, -0.03);
    const bunR = new THREE.Mesh(bunGeo, opts.hairMat);
    bunR.position.set(0.2, 0.17, -0.03);
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    const pinGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6);
    const pinL = new THREE.Mesh(pinGeo, pinMat);
    pinL.position.set(-0.2, 0.18, -0.03);
    pinL.rotation.z = 0.7;
    const pinR = new THREE.Mesh(pinGeo, pinMat);
    pinR.position.set(0.2, 0.18, -0.03);
    pinR.rotation.z = -0.7;
    headGroup.add(bunL, bunR, pinL, pinR);
  } else if (opts.style === 'jinka') {
    // Long flowing strategist hair down the back
    const backMane = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.78, 12), opts.hairMat);
    backMane.position.set(0, -0.32, -0.13);
    backMane.rotation.x = 0.12;
    headGroup.add(backMane);
  } else if (opts.style === 'laulan') {
    // Twin sweeping martial pigtails angled downward/back
    const tailGeo = new THREE.ConeGeometry(0.062, 0.56, 8);
    const tailL = new THREE.Mesh(tailGeo, opts.hairMat);
    tailL.position.set(-0.22, -0.12, -0.11);
    tailL.rotation.z = -0.28;
    tailL.rotation.x = 0.25;
    const tailR = new THREE.Mesh(tailGeo, opts.hairMat);
    tailR.position.set(0.22, -0.12, -0.11);
    tailR.rotation.z = 0.28;
    tailR.rotation.x = 0.25;
    headGroup.add(tailL, tailR);
  } else if (opts.style === 'whitelady') {
    // Flowing silver locks + twin frost crystal horns
    const mane = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.9, 12), opts.hairMat);
    mane.position.set(0, -0.36, -0.16);
    mane.rotation.x = 0.18;
    headGroup.add(mane);
    if (opts.frostMat) {
      const hornGeo = new THREE.ConeGeometry(0.05, 0.38, 6);
      const hornL = new THREE.Mesh(hornGeo, opts.frostMat);
      hornL.position.set(-0.18, 0.24, 0);
      hornL.rotation.z = 0.55;
      const hornR = new THREE.Mesh(hornGeo, opts.frostMat);
      hornR.position.set(0.18, 0.24, 0);
      hornR.rotation.z = -0.55;
      headGroup.add(hornL, hornR);
    }
  }

  return headGroup;
}

function buildArticulatedHumanArm(opts: {
  sleeveMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  side: -1 | 1;
}): { armGroup: THREE.Group; handAnchor: THREE.Group } {
  const armGroup = new THREE.Group();

  // Shoulder & Wide Flowing Wuxia Sleeve
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), opts.sleeveMat);
  armGroup.add(shoulder);

  const upperSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.14, 0.36, 10), opts.sleeveMat);
  upperSleeve.position.y = -0.18;
  upperSleeve.castShadow = true;
  armGroup.add(upperSleeve);

  // Bare human forearm & articulated hand emerging from sleeve cuff
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.038, 0.24, 8), opts.skinMat);
  forearm.position.set(0, -0.4, 0.04);
  forearm.rotation.x = -0.35;
  armGroup.add(forearm);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), opts.skinMat);
  hand.scale.set(0.9, 1.15, 0.8);
  hand.position.set(0, -0.51, 0.1);
  armGroup.add(hand);

  const handAnchor = new THREE.Group();
  handAnchor.position.set(0, -0.51, 0.12);
  armGroup.add(handAnchor);

  return { armGroup, handAnchor };
}

/**
 * Builds articulated real-human 3D heroes (Maomi, Jinka, Laulan) matching the concept poster:
 * - Anime-human faces with expressive eyes, brows, noses, and mouths
 * - Crossed Hanfu lapels, rune-embroidered silk robes, waist sashes & real human limbs/hands
 */
export function buildHeroModel(
  hero: HeroId,
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): ArticulatedCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];

  const config = {
    maomi: {
      robeHex: '#059669',
      shadeHex: '#064e3b',
      runeHex: '#6ee7b7',
      trimHex: '#fbbf24',
      hairColor: 0x064e3b,
      hairHex: '#064e3b',
      eyeHex: '#10b981',
      skinHex: '#fde6d8',
      skinColor: 0xfde6d8,
      pantsColor: 0x065f46,
      collarColor: 0xfef3c7,
      auraColor: 0x34d399,
      blush: '#fda4af',
    },
    jinka: {
      robeHex: '#1d4ed8',
      shadeHex: '#172554',
      runeHex: '#38bdf8',
      trimHex: '#93c5fd',
      hairColor: 0x3b0764,
      hairHex: '#2e1065',
      eyeHex: '#6366f1',
      skinHex: '#fde8dc',
      skinColor: 0xfde8dc,
      pantsColor: 0x0f172a,
      collarColor: 0xe0f2fe,
      auraColor: 0x38bdf8,
      blush: undefined,
    },
    laulan: {
      robeHex: '#db2777',
      shadeHex: '#831843',
      runeHex: '#fbcfe8',
      trimHex: '#f472b6',
      hairColor: 0xc084fc,
      hairHex: '#7e22ce',
      eyeHex: '#ec4899',
      skinHex: '#fde6d8',
      skinColor: 0xfde6d8,
      pantsColor: 0x31102f,
      collarColor: 0xfce7f3,
      auraColor: 0xf472b6,
      blush: '#f9a8d4',
    },
  }[hero];

  const robeTex = createRuneRobeTexture({
    baseColor: config.robeHex,
    shadeColor: config.shadeHex,
    runeColor: config.runeHex,
    trimColor: config.trimHex,
    maxAnisotropy: textures.maxAnisotropy,
  });
  const faceTex = createAnimeFaceTexture({
    skin: config.skinHex,
    eyeColor: config.eyeHex,
    browColor: config.hairHex,
    lipColor: '#be123c',
    blush: config.blush,
    maxAnisotropy: textures.maxAnisotropy,
  });

  const robeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: robeTex,
    roughness: 0.74,
    metalness: 0.06,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.trimHex,
    roughness: 0.25,
    metalness: 0.78,
    emissive: config.auraColor,
    emissiveIntensity: 0.25,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: config.collarColor,
    roughness: 0.6,
    metalness: 0.05,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinColor,
    roughness: 0.62,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: config.hairColor,
    roughness: 0.48,
    metalness: 0.12,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.pantsColor,
    roughness: 0.78,
    metalness: 0.08,
  });
  hitFlashMaterials.push(robeMat, trimMat);

  root.add(createContactShadow(textures.contactShadow, 0.85));

  // Glowing mystical rune circle at feet
  const auraGeo = new THREE.RingGeometry(0.7, 0.84, 32);
  auraGeo.rotateX(-Math.PI / 2);
  const auraRing = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({
      color: config.auraColor,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  auraRing.position.y = 0.025;
  root.add(auraRing);

  // Articulated Human Legs (Thigh + Shin + Boot)
  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.76, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.36, 10), pantsMat);
    thigh.position.y = -0.18;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.34, 10), pantsMat);
    shin.position.y = -0.5;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.22), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 }));
    boot.position.set(0, -0.7, 0.04);
    leg.add(thigh, shin, boot);
    return leg;
  };
  const leftLeg = makeLeg(-0.13);
  const rightLeg = makeLeg(0.13);
  bodyGroup.add(leftLeg, rightLeg);

  // Flowing Split Hanfu Skirt / Martial Coat Tails
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, hero === 'laulan' ? 0.38 : 0.48, 0.76, 16, 1, true, 0.3, Math.PI * 1.72),
    robeMat
  );
  skirt.rotation.y = Math.PI * 0.14;
  skirt.position.y = 0.56;
  skirt.material.side = THREE.DoubleSide;
  skirt.castShadow = true;
  bodyGroup.add(skirt);

  // Human Waist & Sculpted Torso with Crossed Hanfu Collar
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.48, 14), robeMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.04), collarMat);
  lapelL.position.set(-0.06, 1.22, 0.175);
  lapelL.rotation.z = -0.35;
  const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 0.04), collarMat);
  lapelR.position.set(0.06, 1.22, 0.18);
  lapelR.rotation.z = 0.35;
  bodyGroup.add(lapelL, lapelR);

  // Ornate Belt Sash & Jade Buckle
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.21, 0.11, 14), trimMat);
  sash.position.y = 0.94;
  const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), new THREE.MeshStandardMaterial({ color: config.auraColor, emissive: config.auraColor, emissiveIntensity: 0.7 }));
  buckle.position.set(0, 0.94, 0.21);
  bodyGroup.add(sash, buckle);

  // Human Head (with anime eyes, bangs & character hairstyle)
  const headGroup = buildHumanHead({
    skinMat,
    faceTex,
    hairMat,
    style: hero,
  });
  headGroup.position.set(0, 1.59, 0);
  bodyGroup.add(headGroup);

  // Articulated Arms + Forearms + Human Hands
  const left = buildArticulatedHumanArm({ sleeveMat: robeMat, skinMat, side: -1 });
  left.armGroup.position.set(-0.26, 1.34, 0);
  bodyGroup.add(left.armGroup);

  const right = buildArticulatedHumanArm({ sleeveMat: robeMat, skinMat, side: 1 });
  right.armGroup.position.set(0.26, 1.34, 0);
  bodyGroup.add(right.armGroup);

  const weaponAnchor = right.handAnchor;
  const orbiters: THREE.Object3D[] = [];

  if (hero === 'maomi') {
    // Glowing Emerald Qi Yang Vial in right hand + herb satchel in left hand
    const vialMat = new THREE.MeshPhysicalMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.1,
      roughness: 0.1,
      clearcoat: 1.0,
      transmission: isSoftwareGl ? 0 : 0.7,
      transparent: true,
      opacity: 0.9,
    });
    const flask = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), vialMat);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.042, 0.1, 10), vialMat);
    neck.position.y = 0.11;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.04, 8), trimMat);
    cork.position.y = 0.17;
    weaponAnchor.add(flask, neck, cork);

    const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), trimMat);
    pouch.position.y = -0.05;
    left.handAnchor.add(pouch);
  } else if (hero === 'jinka') {
    // Floating Calligraphic Strategy Scrolls orbiting Jinka
    const scrollMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.scrollRune,
      roughness: 0.65,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.32,
      side: THREE.DoubleSide,
    });
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    for (let i = 0; i < 3; i++) {
      const scrollGroup = new THREE.Group();
      const parchment = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.46), scrollMat);
      const topRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), rodMat);
      topRod.rotation.z = Math.PI / 2;
      topRod.position.y = 0.23;
      const botRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), rodMat);
      botRod.rotation.z = Math.PI / 2;
      botRod.position.y = -0.23;
      scrollGroup.add(parchment, topRod, botRod);
      const angle = (i / 3) * Math.PI * 2;
      scrollGroup.position.set(Math.cos(angle) * 0.72, 1.15, Math.sin(angle) * 0.72);
      root.add(scrollGroup);
      orbiters.push(scrollGroup);
    }
  } else {
    // Laulan: Unfolded Pleated Combat Fan in right hand + Golden Acupuncture Needles in left
    const fanShape = new THREE.Shape();
    fanShape.moveTo(0, 0);
    fanShape.absarc(0, 0, 0.44, -Math.PI * 0.32, Math.PI * 0.32, false);
    fanShape.lineTo(0, 0);
    const fanGeo = new THREE.ExtrudeGeometry(fanShape, {
      depth: 0.015,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.005,
      bevelSegments: 2,
    });
    const fanMesh = new THREE.Mesh(
      fanGeo,
      new THREE.MeshStandardMaterial({
        color: 0xfbcfe8,
        emissive: 0xf472b6,
        emissiveIntensity: 0.48,
        roughness: 0.38,
      })
    );
    fanMesh.rotation.x = Math.PI / 2;
    fanMesh.rotation.z = Math.PI / 2;
    weaponAnchor.add(fanMesh);

    const needleMat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.9, roughness: 0.15 });
    [-0.03, 0, 0.03].forEach((nx) => {
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.003, 0.28, 6), needleMat);
      needle.position.set(nx, 0.04, 0.1);
      needle.rotation.x = Math.PI / 2.2;
      left.handAnchor.add(needle);
    });
  }

  return {
    root,
    bodyGroup,
    leftArm: left.armGroup,
    rightArm: right.armGroup,
    leftLeg,
    rightLeg,
    auraRing,
    weaponAnchor,
    orbiters,
    hitFlashMaterials,
  };
}

/**
 * Builds articulated real-human Shadow Assassins & the cursed Divine Serpent Empress (The White Lady).
 */
export function buildEnemyModel(
  policy: EnemyPolicy,
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): ArticulatedCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
  const orbiters: THREE.Object3D[] = [];

  if (policy === 'whitelady') {
    root.add(createContactShadow(textures.contactShadow, 1.65));

    const gownMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.65,
      metalness: 0.08,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.16,
    });
    const serpentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.serpentScale,
      roughness: 0.35,
      metalness: 0.25,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.18,
    });
    const frostMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.72 : 0.88,
    });
    const sashMat = new THREE.MeshStandardMaterial({ color: 0xbe123c, roughness: 0.4, metalness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.55 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
    hitFlashMaterials.push(gownMat, serpentMat, sashMat);

    // Coiling Iridescent White Serpent Lower Body
    const coilPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      const angle = t * Math.PI * 2.4;
      const radius = 0.42 + t * 0.56;
      coilPts.push(new THREE.Vector3(Math.cos(angle) * radius, 1.42 - t * 1.22, Math.sin(angle) * radius));
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilPts);
    const coilMesh = new THREE.Mesh(new THREE.TubeGeometry(coilCurve, 30, 0.21, 12, false), serpentMat);
    coilMesh.castShadow = true;
    bodyGroup.add(coilMesh);

    // Human Upper Torso & Crimson Waist Sash
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.65, 14), gownMat);
    torso.position.y = 1.78;
    torso.castShadow = true;
    bodyGroup.add(torso);

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.26, 0.14, 14), sashMat);
    sash.position.y = 1.5;
    bodyGroup.add(sash);

    // Real Human Face with Crimson Gaze + Frost Horns
    const wlFace = createAnimeFaceTexture({
      skin: '#fef2f2',
      eyeColor: '#e11d48',
      browColor: '#94a3b8',
      lipColor: '#be123c',
      maxAnisotropy: textures.maxAnisotropy,
    });
    const headGroup = buildHumanHead({
      skinMat,
      faceTex: wlFace,
      hairMat,
      style: 'whitelady',
      frostMat,
    });
    headGroup.position.set(0, 2.3, 0);
    bodyGroup.add(headGroup);

    // Articulated Flowing Sleeves + Bare Human Hands
    const left = buildArticulatedHumanArm({ sleeveMat: gownMat, skinMat, side: -1 });
    left.armGroup.position.set(-0.32, 2.02, 0);
    left.armGroup.rotation.z = -0.35;
    bodyGroup.add(left.armGroup);

    const right = buildArticulatedHumanArm({ sleeveMat: gownMat, skinMat, side: 1 });
    right.armGroup.position.set(0.32, 2.02, 0);
    right.armGroup.rotation.z = 0.35;
    bodyGroup.add(right.armGroup);

    // Orbiting Ice Crystals around White Lady
    const crystalGeo = new THREE.OctahedronGeometry(0.22, 0);
    for (let i = 0; i < 6; i++) {
      const crystal = new THREE.Mesh(crystalGeo, frostMat);
      const a = (i / 6) * Math.PI * 2;
      crystal.position.set(Math.cos(a) * 1.25, 1.55 + (i % 2) * 0.45, Math.sin(a) * 1.25);
      crystal.scale.set(0.7, 1.8, 0.7);
      root.add(crystal);
      orbiters.push(crystal);
    }

    const auraGeo = new THREE.RingGeometry(1.15, 1.38, 32);
    auraGeo.rotateX(-Math.PI / 2);
    const auraRing = new THREE.Mesh(
      auraGeo,
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    auraRing.position.y = 0.03;
    root.add(auraRing);

    return {
      root,
      bodyGroup,
      leftArm: left.armGroup,
      rightArm: right.armGroup,
      leftLeg: new THREE.Group(),
      rightLeg: new THREE.Group(),
      auraRing,
      weaponAnchor: right.handAnchor,
      orbiters,
      hitFlashMaterials,
    };
  }

  // Real Human Shadow Assassin Archetypes (Stalker, Kunai, Sentinel)
  const scale = policy === 'sentinel' ? 1.24 : policy === 'kunai' ? 0.96 : 1.02;
  root.scale.setScalar(scale);
  root.add(createContactShadow(textures.contactShadow, 0.78));

  const cloakColor = policy === 'sentinel' ? 0x1e293b : policy === 'kunai' ? 0x2e1065 : 0x0f172a;
  const accentColor = policy === 'sentinel' ? 0x38bdf8 : policy === 'kunai' ? 0xc084fc : 0xef4444;
  const eyeStr = policy === 'sentinel' ? '#38bdf8' : policy === 'kunai' ? '#c084fc' : '#ef4444';

  const cloakMat = new THREE.MeshStandardMaterial({ color: cloakColor, roughness: 0.82, metalness: 0.1 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.72 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  hitFlashMaterials.push(cloakMat, armorMat);

  const makeAssassinLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.74, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.36, 8), cloakMat);
    thigh.position.y = -0.18;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.34, 8), armorMat);
    shin.position.y = -0.5;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), cloakMat);
    boot.position.set(0, -0.68, 0.04);
    leg.add(thigh, shin, boot);
    return leg;
  };
  const leftLeg = makeAssassinLeg(-0.13);
  const rightLeg = makeAssassinLeg(0.13);
  bodyGroup.add(leftLeg, rightLeg);

  // Human Martial Tunic & Belt
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.56, 10), cloakMat);
  torso.position.y = 1.06;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.12, 10), armorMat);
  waist.position.y = 0.82;
  bodyGroup.add(waist);

  if (policy === 'sentinel') {
    const pauldronGeo = new THREE.BoxGeometry(0.22, 0.15, 0.22);
    const pL = new THREE.Mesh(pauldronGeo, armorMat);
    pL.position.set(-0.28, 1.32, 0);
    const pR = new THREE.Mesh(pauldronGeo, armorMat);
    pR.position.set(0.28, 1.32, 0);
    bodyGroup.add(pL, pR);
  }

  const maskFaceTex = createAnimeFaceTexture({
    skin: '#0f172a',
    eyeColor: eyeStr,
    browColor: '#0f172a',
    lipColor: '#0f172a',
    masked: true,
    maxAnisotropy: textures.maxAnisotropy,
  });
  const headGroup = buildHumanHead({
    skinMat,
    faceTex: maskFaceTex,
    hairMat: cloakMat,
    style: 'assassin',
  });
  headGroup.position.set(0, 1.54, 0);
  bodyGroup.add(headGroup);

  const left = buildArticulatedHumanArm({ sleeveMat: cloakMat, skinMat: armorMat, side: -1 });
  left.armGroup.position.set(-0.26, 1.28, 0);
  bodyGroup.add(left.armGroup);

  const right = buildArticulatedHumanArm({ sleeveMat: cloakMat, skinMat: armorMat, side: 1 });
  right.armGroup.position.set(0.26, 1.28, 0);
  bodyGroup.add(right.armGroup);

  if (policy === 'sentinel') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8), armorMat);
    shaft.rotation.x = Math.PI / 3;
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.42, 4),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.4,
        metalness: 0.85,
        roughness: 0.2,
      })
    );
    blade.position.set(0, 0.4, 0.65);
    blade.rotation.x = Math.PI / 3;
    right.handAnchor.add(shaft, blade);
  } else {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.42, 4), armorMat);
    blade.rotation.x = Math.PI / 2;
    blade.position.z = 0.18;
    right.handAnchor.add(blade);
  }

  const auraGeo = new THREE.RingGeometry(0.55, 0.64, 20);
  auraGeo.rotateX(-Math.PI / 2);
  const auraRing = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
  );
  auraRing.position.y = 0.02;
  root.add(auraRing);

  return {
    root,
    bodyGroup,
    leftArm: left.armGroup,
    rightArm: right.armGroup,
    leftLeg,
    rightLeg,
    auraRing,
    weaponAnchor: right.handAnchor,
    orbiters,
    hitFlashMaterials,
  };
}

export function buildCourtyardEnvironment(
  scene: THREE.Scene,
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): {
  lanternLights: THREE.PointLight[];
  elixirOrb: THREE.Object3D;
  altarCrystals: THREE.Object3D[];
} {
  const lanternLights: THREE.PointLight[] = [];
  const altarCrystals: THREE.Object3D[] = [];

  const outerGroundMat = new THREE.MeshStandardMaterial({
    color: 0x161b2e,
    roughness: 0.92,
    metalness: 0.05,
  });
  const outerGround = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), outerGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.05;
  outerGround.receiveShadow = true;
  scene.add(outerGround);

  const courtyardMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures.stoneColor,
    bumpMap: textures.stoneBump,
    bumpScale: 0.04,
    roughness: 0.84,
    metalness: 0.08,
  });
  const courtyard = new THREE.Mesh(new THREE.BoxGeometry(31, 0.2, 30), courtyardMat);
  courtyard.position.set(0, -0.1, 1.0);
  courtyard.receiveShadow = true;
  scene.add(courtyard);

  const stoneTrimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.15 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: textures.woodColor, roughness: 0.6, metalness: 0.1 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.32 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
  const lanternPaperMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.65,
    roughness: 0.4,
  });

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(11, 0.35, 5.5), stoneTrimMat);
  step1.position.set(0, 0.17, -14.2);
  step1.receiveShadow = true;
  scene.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, 4.0), stoneTrimMat);
  step2.position.set(0, 0.56, -14.8);
  step2.receiveShadow = true;
  scene.add(step2);

  const altarPedestal = new THREE.Group();
  altarPedestal.position.set(0, 0.78, -14.8);
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.2, 0.9, 8), stoneTrimMat);
  plinth.position.y = 0.45;
  plinth.castShadow = true;
  const plinthCap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 2.1), goldMat);
  plinthCap.position.y = 0.96;
  altarPedestal.add(plinth, plinthCap);

  // Forbidden Elixir of Immunity (Qi Yang)
  const elixirGroup = new THREE.Group();
  elixirGroup.position.set(0, 1.42, 0);
  const elixirMat = new THREE.MeshPhysicalMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.94,
  });
  const elixirBody = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 1), elixirMat);
  const elixirNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.16, 10), elixirMat);
  elixirNeck.position.y = 0.28;
  const elixirAura = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.02, 8, 24),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.65 })
  );
  elixirAura.rotation.x = Math.PI / 2;
  elixirGroup.add(elixirBody, elixirNeck, elixirAura);
  altarPedestal.add(elixirGroup);

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xa5f3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: isSoftwareGl ? 0.7 : 0.85,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = 1.2 + (i % 3) * 0.55;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.28, h, 5), iceMat);
    shard.position.set(Math.cos(a) * 2.1, h * 0.4, Math.sin(a) * 1.4);
    shard.rotation.z = Math.cos(a) * -0.25;
    shard.rotation.x = Math.sin(a) * 0.2;
    altarPedestal.add(shard);
    altarCrystals.push(shard);
  }
  scene.add(altarPedestal);

  const postGeo = new THREE.BoxGeometry(0.42, 1.1, 0.42);
  const railGeo = new THREE.BoxGeometry(0.24, 0.18, 28);
  [-15.3, 15.3].forEach((sideX) => {
    const rail = new THREE.Mesh(railGeo, stoneTrimMat);
    rail.position.set(sideX, 0.72, 1.0);
    scene.add(rail);
    for (let z = -12; z <= 14; z += 4.3) {
      const post = new THREE.Mesh(postGeo, stoneTrimMat);
      post.position.set(sideX, 0.55, z);
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), goldMat);
      finial.position.set(sideX, 1.2, z);
      scene.add(post, finial);
    }
  });

  const buildPavilionWing = (sideX: number, addLightAtZ: number[]) => {
    const wing = new THREE.Group();
    wing.position.set(sideX, 0, 0);

    const pillarGeo = new THREE.CylinderGeometry(0.24, 0.27, 4.6, 12);
    for (let z = -9; z <= 9; z += 6) {
      const pillar = new THREE.Mesh(pillarGeo, woodMat);
      pillar.position.set(0, 2.3, z);
      pillar.castShadow = true;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.25, 10), stoneTrimMat);
      base.position.set(0, 0.125, z);
      wing.add(pillar, base);
    }

    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 22), woodMat);
    roofBeam.position.set(sideX > 0 ? 1.1 : -1.1, 4.65, 0);
    const roofSlope = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 23), roofMat);
    roofSlope.position.set(sideX > 0 ? 1.3 : -1.3, 5.2, 0);
    roofSlope.rotation.z = sideX > 0 ? -0.34 : 0.34;
    wing.add(roofBeam, roofSlope);

    addLightAtZ.forEach((lz) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(sideX > 0 ? -0.9 : 0.9, 3.65, lz);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), woodMat);
      cord.position.y = 0.65;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.68, 12), lanternPaperMat);
      const glowHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.22, depthWrite: false })
      );
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.1, 12), woodMat);
      topCap.position.y = 0.36;
      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.1, 12), woodMat);
      botCap.position.y = -0.36;
      lanternGroup.add(cord, body, glowHalo, topCap, botCap);

      const pt = new THREE.PointLight(0xf59e0b, 9.5, 16, 1.5);
      pt.position.set(0, 0, 0);
      lanternGroup.add(pt);
      lanternLights.push(pt);

      wing.add(lanternGroup);
    });

    scene.add(wing);
  };

  buildPavilionWing(-16.2, [-6, 6]);
  buildPavilionWing(16.2, [-6, 6]);

  const sakuraTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2622, roughness: 0.9 });
  const sakuraLeafMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xbe185d,
    emissiveIntensity: 0.28,
    roughness: 0.68,
  });
  const sakuraHighlightMat = new THREE.MeshStandardMaterial({
    color: 0xfbcfe8,
    emissive: 0xf472b6,
    emissiveIntensity: 0.22,
    roughness: 0.6,
  });

  const treeCoords = [
    [-12.5, -10.5],
    [12.5, -10.5],
    [-12.8, 11.5],
    [12.8, 11.5],
  ];
  treeCoords.forEach(([tx, tz], idx) => {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(idx % 2 === 0 ? 0.3 : -0.3, 1.8, 0.2),
      new THREE.Vector3(idx % 2 === 0 ? -0.2 : 0.2, 3.6, -0.1),
    ]);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 10, 0.24, 8, false), sakuraTrunkMat);
    trunk.castShadow = true;
    tree.add(trunk);

    const canopyOffsets = [
      [0, 4.1, 0, 1.55, false],
      [-1.05, 3.65, 0.5, 1.2, false],
      [1.15, 3.75, -0.4, 1.15, true],
      [0.2, 4.75, 0.4, 1.05, true],
      [-0.4, 4.4, -0.7, 0.95, true],
    ] as const;
    canopyOffsets.forEach(([cx, cy, cz, cr, bright]) => {
      const puff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(cr, 1),
        bright ? sakuraHighlightMat : sakuraLeafMat
      );
      puff.position.set(cx, cy, cz);
      puff.scale.y = 0.65;
      tree.add(puff);
    });
    scene.add(tree);
  });

  const mountainMat = new THREE.MeshStandardMaterial({ color: 0x11182c, roughness: 0.95 });
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 48 + (i % 3) * 10;
    const height = 16 + (i % 4) * 7;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(12 + (i % 3) * 4, height, 6), mountainMat);
    peak.position.set(Math.cos(angle) * dist, height * 0.45 - 1, Math.sin(angle) * dist);
    scene.add(peak);
  }

  return {
    lanternLights,
    elixirOrb: elixirGroup,
    altarCrystals,
  };
}
