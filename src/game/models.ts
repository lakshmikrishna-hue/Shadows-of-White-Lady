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
  flowParts?: THREE.Object3D[];
  idleRightArmX?: number;
  idleRightArmZ?: number;
  idleLeftArmX?: number;
  idleLeftArmZ?: number;
}

// ---------------------------------------------------------------------------
// Procedural Canvas Textures (Zero External 404 Dependencies)
// ---------------------------------------------------------------------------

function createAnimeFaceTexture(opts: {
  skin: string;
  skinShadow: string;
  eyeColor: string;
  browColor: string;
  lipColor: string;
  blush?: string;
  foreheadMark?: string;
  masked?: boolean;
  maxAnisotropy: number;
}): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Base skin tone + subtle warm/cool chin & forehead shading
  const skinGrad = ctx.createLinearGradient(0, 60, 0, 440);
  skinGrad.addColorStop(0, opts.skinShadow);
  skinGrad.addColorStop(0.28, opts.skin);
  skinGrad.addColorStop(0.78, opts.skin);
  skinGrad.addColorStop(1, opts.skinShadow);
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, 512, 512);

  if (opts.masked) {
    // Dark shinobi cowl & lower face mask
    ctx.fillStyle = '#090e1c';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle fabric weave bands across lower mask
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 4;
    for (let y = 290; y < 440; y += 18) {
      ctx.beginPath();
      ctx.moveTo(120, y);
      ctx.quadraticCurveTo(256, y + 14, 392, y);
      ctx.stroke();
    }

    // Narrow dark visor opening around eyes
    ctx.fillStyle = '#182235';
    ctx.beginPath();
    ctx.roundRect(142, 206, 228, 66, 20);
    ctx.fill();

    // Glowing fierce assassin eyes
    ctx.fillStyle = opts.eyeColor;
    ctx.shadowColor = opts.eyeColor;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(208, 239, 22, 10, -0.18, 0, Math.PI * 2);
    ctx.ellipse(304, 239, 22, 10, 0.18, 0, Math.PI * 2);
    ctx.fill();

    // Bright eye cores
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(208, 239, 7, 4, -0.18, 0, Math.PI * 2);
    ctx.ellipse(304, 239, 7, 4, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Cheek blush & soft anime nose shading
    if (opts.blush) {
      ctx.fillStyle = opts.blush;
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.ellipse(166, 318, 30, 14, -0.08, 0, Math.PI * 2);
      ctx.ellipse(346, 318, 30, 14, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Optional celestial forehead mark (White Lady)
    if (opts.foreheadMark) {
      ctx.fillStyle = opts.foreheadMark;
      ctx.shadowColor = opts.foreheadMark;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(256, 178);
      ctx.lineTo(266, 198);
      ctx.lineTo(256, 218);
      ctx.lineTo(246, 198);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const drawEye = (cx: number, flip: number) => {
      // Soft upper eyelid shadow
      ctx.fillStyle = 'rgba(90, 52, 65, 0.18)';
      ctx.beginPath();
      ctx.ellipse(cx, 266, 36, 30, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sclera
      ctx.fillStyle = '#fffdfd';
      ctx.beginPath();
      ctx.ellipse(cx, 272, 32, 29, 0, 0, Math.PI * 2);
      ctx.fill();

      // Multi-stop detailed anime iris
      const irisGrad = ctx.createLinearGradient(cx, 244, cx, 302);
      irisGrad.addColorStop(0, '#0b1020');
      irisGrad.addColorStop(0.32, opts.eyeColor);
      irisGrad.addColorStop(0.82, opts.eyeColor);
      irisGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(cx, 274, 23, 27, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#070a14';
      ctx.beginPath();
      ctx.ellipse(cx, 275, 10.5, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Luminous anime catchlights
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - 9, 261, 7.2, 0, Math.PI * 2);
      ctx.arc(cx + 8, 286, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Bold sculpted upper eyelash + outer wing
      ctx.strokeStyle = '#0b0e18';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - 35 * flip, 263);
      ctx.quadraticCurveTo(cx, 236, cx + 33 * flip, 260);
      ctx.stroke();

      // Subtle lower lash accent
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(30, 24, 34, 0.72)';
      ctx.beginPath();
      ctx.moveTo(cx - 18, 299);
      ctx.quadraticCurveTo(cx, 303, cx + 18, 299);
      ctx.stroke();

      // Expressive eyebrow
      ctx.strokeStyle = opts.browColor;
      ctx.lineWidth = 6.5;
      ctx.beginPath();
      ctx.moveTo(cx - 30 * flip, 224);
      ctx.quadraticCurveTo(cx, 212, cx + 28 * flip, 228);
      ctx.stroke();
    };

    drawEye(204, 1);
    drawEye(308, -1);

    // Subtle anime nose line + highlight dot
    ctx.strokeStyle = 'rgba(155, 92, 76, 0.58)';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(256, 304);
    ctx.lineTo(254, 322);
    ctx.lineTo(259, 324);
    ctx.stroke();

    // Expressive lip line
    ctx.strokeStyle = opts.lipColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(240, 353);
    ctx.quadraticCurveTo(256, 361, 272, 353);
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
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, opts.baseColor);
  grad.addColorStop(0.6, opts.baseColor);
  grad.addColorStop(1, opts.shadeColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle vertical pleated silk sheen & shading
  for (let x = 0; x < 512; x += 32) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
    ctx.fillRect(x, 0, 8, 512);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(x + 12, 0, 6, 512);
  }

  // Traditional cloud-scroll brocade & metallic border near hem
  ctx.fillStyle = opts.trimColor;
  ctx.fillRect(0, 428, 512, 10);
  ctx.fillRect(0, 488, 512, 10);

  // Key-fret imperial trim pattern
  ctx.strokeStyle = opts.trimColor;
  ctx.lineWidth = 3;
  for (let x = 0; x < 512; x += 32) {
    ctx.strokeRect(x + 4, 444, 24, 36);
  }

  // Glowing mystical rune diamonds & sigils
  ctx.strokeStyle = opts.runeColor;
  ctx.fillStyle = opts.runeColor;
  ctx.shadowColor = opts.runeColor;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4;
  for (let x = 44; x < 512; x += 88) {
    ctx.beginPath();
    ctx.moveTo(x, 336);
    ctx.lineTo(x + 22, 368);
    ctx.lineTo(x, 400);
    ctx.lineTo(x - 22, 368);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, 368, 6, 0, Math.PI * 2);
    ctx.fill();

    // Vertical calligraphy dot-rune chain higher on robe
    ctx.beginPath();
    ctx.moveTo(x, 265);
    ctx.lineTo(x, 315);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 252, 4, 0, Math.PI * 2);
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

  // 4. Iridescent White Serpent Dorsal Scales + Segmented Ventral Belly Scutes
  const scaleCanvas = document.createElement('canvas');
  scaleCanvas.width = 512;
  scaleCanvas.height = 512;
  const spCtx = scaleCanvas.getContext('2d')!;
  spCtx.fillStyle = '#e2f1fc';
  spCtx.fillRect(0, 0, 512, 512);

  // Dorsal scale pattern across full wrap
  for (let row = 0; row < 20; row++) {
    for (let col = 0; col < 16; col++) {
      const ox = (row % 2) * 16;
      spCtx.fillStyle = (row + col) % 2 === 0 ? '#eef7ff' : '#d5e9f8';
      spCtx.strokeStyle = '#60a5fa';
      spCtx.lineWidth = 2;
      spCtx.beginPath();
      spCtx.arc(col * 32 + ox, row * 26, 15, 0, Math.PI);
      spCtx.fill();
      spCtx.stroke();
    }
  }

  // Ventral creamy-silver ribbed serpent belly plates along center strip (u = 0.34..0.66)
  const bellyGrad = spCtx.createLinearGradient(170, 0, 342, 0);
  bellyGrad.addColorStop(0, 'rgba(226, 241, 252, 0)');
  bellyGrad.addColorStop(0.18, '#f8fafc');
  bellyGrad.addColorStop(0.5, '#ffffff');
  bellyGrad.addColorStop(0.82, '#f8fafc');
  bellyGrad.addColorStop(1, 'rgba(226, 241, 252, 0)');
  spCtx.fillStyle = bellyGrad;
  spCtx.fillRect(170, 0, 172, 512);

  spCtx.strokeStyle = 'rgba(100, 145, 195, 0.65)';
  spCtx.lineWidth = 3;
  for (let y = 12; y < 512; y += 22) {
    spCtx.beginPath();
    spCtx.moveTo(192, y);
    spCtx.quadraticCurveTo(256, y + 10, 320, y);
    spCtx.stroke();
  }

  const serpentScale = new THREE.CanvasTexture(scaleCanvas);
  serpentScale.colorSpace = THREE.SRGBColorSpace;
  serpentScale.wrapS = THREE.ClampToEdgeWrapping;
  serpentScale.wrapT = THREE.RepeatWrapping;
  serpentScale.repeat.set(1, 7);
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

// ---------------------------------------------------------------------------
// Sculpted Procedural Wuxia Geometry Builders
// ---------------------------------------------------------------------------

/**
 * Generates a tapered tubular mesh with parallel-transported frames so
 * hair locks, flowing silk ribbons, and coiled serpent bodies never pinch or twist awkwardly.
 */
function createTaperedTubeGeometry(
  points: THREE.Vector3[],
  tubularSegments: number,
  radiusAt: (t: number) => number,
  radialSegments = 10
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tangent = new THREE.Vector3();
  const prevTangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const rotAxis = new THREE.Vector3();
  const rotQuat = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const p = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const t = i / tubularSegments;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tangent).normalize();

    if (i === 0) {
      // Seed normal facing +Z where possible so u=0.5 faces viewer cleanly
      const ref = Math.abs(tangent.dot(up)) > 0.92 ? new THREE.Vector3(0, 0, 1) : up;
      binormal.crossVectors(tangent, ref).normalize();
      normal.crossVectors(binormal, tangent).normalize();
    } else {
      rotAxis.crossVectors(prevTangent, tangent);
      const len = rotAxis.length();
      if (len > 1e-5) {
        rotAxis.divideScalar(len);
        const angle = Math.acos(THREE.MathUtils.clamp(prevTangent.dot(tangent), -1, 1));
        rotQuat.setFromAxisAngle(rotAxis, angle);
        normal.applyQuaternion(rotQuat).normalize();
        binormal.crossVectors(tangent, normal).normalize();
      }
    }
    prevTangent.copy(tangent);

    const r = Math.max(0.002, radiusAt(t));
    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const theta = v * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      vertex.copy(p).addScaledVector(normal, cosT * r).addScaledVector(binormal, sinT * r);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(v, t);
    }
  }

  const stride = radialSegments + 1;
  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + (j + 1);
      const d = i * stride + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Sculpts an oval anime-human cranium with a tapered chin/jawline below the cheeks.
 * Note: local +X maps to u=0.5 (front face) prior to rotation.y = -Math.PI/2.
 */
function createSculptedAnimeHeadGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.19, 24, 18);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Slight cranial depth & height proportion
    y *= 1.08;
    z *= 0.94;

    if (y < -0.01) {
      // Taper lower cheeks smoothly to an anime chin
      const chinT = THREE.MathUtils.clamp((-y - 0.01) / 0.19, 0, 1);
      const widthTaper = 1 - chinT * 0.48;
      z *= widthTaper;
      // Gently pull the chin slightly forward toward face (+X) and narrow back jaw
      if (x > 0) {
        x = x * (1 - chinT * 0.16) + chinT * 0.018;
      } else {
        x *= 1 - chinT * 0.36;
      }
      y -= chinT * 0.014;
    }

    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a pleated Wuxia Hanfu skirt/overskirt using LatheGeometry + sinusoidal silk pleats.
 */
function createPleatedSkirtGeometry(
  topRadius: number,
  midRadius: number,
  hemRadius: number,
  height: number,
  pleats = 10,
  arcStart = 0.28,
  arcLen = Math.PI * 1.72
): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(topRadius, height * 0.5),
    new THREE.Vector2(midRadius, height * 0.1),
    new THREE.Vector2(hemRadius * 0.88, -height * 0.25),
    new THREE.Vector2(hemRadius, -height * 0.5),
  ];
  const geo = new THREE.LatheGeometry(profile, 28, arcStart, arcLen);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const heightFrac = THREE.MathUtils.clamp((height * 0.5 - y) / height, 0, 1);
    const angle = Math.atan2(z, x);
    const pleat = 1 + Math.sin(angle * pleats) * 0.048 * heightFrac;
    pos.setXYZ(i, x * pleat, y, z * pleat);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function buildHumanHead(opts: {
  skinMat: THREE.MeshStandardMaterial;
  faceTex: THREE.CanvasTexture;
  hairMat: THREE.MeshStandardMaterial;
  trimMat?: THREE.MeshStandardMaterial;
  accentMat?: THREE.MeshStandardMaterial;
  style: 'maomi' | 'jinka' | 'laulan' | 'whitelady' | 'assassin';
  frostMat?: THREE.Material;
  flowParts: THREE.Object3D[];
}): THREE.Group {
  const headGroup = new THREE.Group();

  // Sculpted neck
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.064, 0.082, 0.17, 12),
    opts.skinMat
  );
  neck.position.y = -0.14;
  headGroup.add(neck);

  // Sculpted anime-human cranium with tapered jawline
  const faceMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: opts.faceTex,
    roughness: 0.58,
    metalness: 0.02,
  });
  const cranium = new THREE.Mesh(createSculptedAnimeHeadGeometry(), faceMat);
  cranium.rotation.y = -Math.PI / 2; // Align local +X (u=0.5) toward +Z
  cranium.castShadow = true;
  headGroup.add(cranium);

  if (opts.style === 'assassin') {
    // Draped pointed shinobi cowl hood + lower shoulder wrap
    const hoodProfile = [
      new THREE.Vector2(0.01, 0.34),
      new THREE.Vector2(0.14, 0.22),
      new THREE.Vector2(0.225, 0.04),
      new THREE.Vector2(0.245, -0.14),
    ];
    const hood = new THREE.Mesh(
      new THREE.LatheGeometry(hoodProfile, 16, -Math.PI * 0.18, Math.PI * 1.44),
      opts.hairMat
    );
    hood.rotation.y = Math.PI * 0.78;
    hood.position.set(0, 0.02, -0.02);
    hood.material = opts.hairMat.clone();
    hood.material.side = THREE.DoubleSide;
    hood.castShadow = true;
    headGroup.add(hood);

    const cowlTail = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(0, 0.22, -0.1),
          new THREE.Vector3(0, 0.12, -0.25),
          new THREE.Vector3(0.03, -0.06, -0.35),
        ],
        8,
        (t) => 0.12 * (1 - t * 0.85),
        8
      ),
      opts.hairMat
    );
    headGroup.add(cowlTail);
    opts.flowParts.push(cowlTail);
    return headGroup;
  }

  // Ears (celestial pointed elf ears for Laulan & White Lady, rounded ears for Maomi & Jinka)
  const pointed = opts.style === 'laulan' || opts.style === 'whitelady';
  [-1, 1].forEach((side) => {
    const ear = pointed
      ? new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.15, 7), opts.skinMat)
      : new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), opts.skinMat);
    if (pointed) {
      ear.position.set(side * 0.21, -0.01, -0.01);
      ear.rotation.z = -side * 1.25;
      ear.rotation.y = -side * 0.25;
    } else {
      ear.scale.set(0.55, 1.0, 0.75);
      ear.position.set(side * 0.175, -0.02, -0.005);
    }
    headGroup.add(ear);
  });

  // Layered Hair Cap & Crown Volume
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(0.206, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56),
    opts.hairMat
  );
  crown.scale.set(1.01, 1.04, 1.03);
  crown.rotation.x = -0.3;
  crown.position.y = 0.035;
  crown.castShadow = true;
  headGroup.add(crown);

  // Back hair shell
  const backShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.205, 18, 12, Math.PI * 0.1, Math.PI * 0.8, 0.2, Math.PI * 0.72),
    opts.hairMat
  );
  backShell.rotation.y = Math.PI;
  backShell.position.set(0, 0.01, -0.015);
  headGroup.add(backShell);

  // Sculpted sweeping forehead bangs (arched cleanly above eyes so face reads crisply!)
  [-0.11, -0.045, 0.015, 0.075, 0.125].forEach((bx, idx) => {
    const bangCurve = [
      new THREE.Vector3(bx * 0.7, 0.21, 0.08),
      new THREE.Vector3(bx * 0.95, 0.16, 0.185),
      new THREE.Vector3(bx * 1.04 + (idx % 2 === 0 ? -0.01 : 0.01), 0.095, 0.195),
    ];
    const bang = new THREE.Mesh(
      createTaperedTubeGeometry(bangCurve, 7, (t) => 0.03 * (1 - t * 0.82), 7),
      opts.hairMat
    );
    headGroup.add(bang);
  });

  // Graceful cheek-framing tapered side locks
  [-1, 1].forEach((side) => {
    const lockPts = [
      new THREE.Vector3(side * 0.16, 0.1, 0.07),
      new THREE.Vector3(side * 0.195, -0.06, 0.085),
      new THREE.Vector3(side * 0.165, -0.24, 0.095),
    ];
    const sideLock = new THREE.Mesh(
      createTaperedTubeGeometry(lockPts, 8, (t) => 0.034 * (1 - t * 0.84), 7),
      opts.hairMat
    );
    headGroup.add(sideLock);
  });

  if (opts.style === 'maomi') {
    // Maomi: Iconic twin ox-horn buns with gold hairpins & fluttering ribbon ties
    const bunGeo = new THREE.SphereGeometry(0.096, 14, 12);
    const pinMat = opts.trimMat ?? new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.2 });
    const tieMat = opts.accentMat ?? new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55 });
    [-1, 1].forEach((side) => {
      const bun = new THREE.Mesh(bunGeo, opts.hairMat);
      bun.position.set(side * 0.195, 0.175, -0.025);
      const bunRing = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.016, 8, 16), tieMat);
      bunRing.position.set(side * 0.185, 0.165, -0.025);
      bunRing.rotation.y = side * 0.7;

      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.006, 0.24, 8), pinMat);
      pin.position.set(side * 0.2, 0.185, -0.025);
      pin.rotation.z = -side * 0.72;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), pinMat);
      pearl.position.set(side * 0.28, 0.27, -0.025);

      // Trailing hair ribbon off each bun
      const ribbon = new THREE.Mesh(
        createTaperedTubeGeometry(
          [
            new THREE.Vector3(side * 0.2, 0.14, -0.05),
            new THREE.Vector3(side * 0.27, 0.02, -0.14),
            new THREE.Vector3(side * 0.31, -0.14, -0.22),
          ],
          8,
          (t) => 0.022 * (1 - t * 0.65),
          6
        ),
        tieMat
      );
      headGroup.add(bun, bunRing, pin, pearl, ribbon);
      opts.flowParts.push(ribbon);
    });
  } else if (opts.style === 'jinka') {
    // Jinka: Long cascading violet strategist hair + silver/azure crown hairpin
    const pinMat = opts.trimMat ?? new THREE.MeshStandardMaterial({ color: 0x93c5fd, metalness: 0.8, roughness: 0.2 });
    const hairCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.07, 10), pinMat);
    hairCrown.position.set(0, 0.21, -0.08);
    const pinBar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), pinMat);
    pinBar.rotation.z = Math.PI / 2;
    pinBar.position.set(0, 0.22, -0.08);
    headGroup.add(hairCrown, pinBar);

    [-0.12, -0.04, 0.04, 0.12].forEach((hx, idx) => {
      const lock = new THREE.Mesh(
        createTaperedTubeGeometry(
          [
            new THREE.Vector3(hx, 0.08, -0.16),
            new THREE.Vector3(hx * 1.4, -0.22, -0.22),
            new THREE.Vector3(hx * 1.7 + (idx % 2 === 0 ? -0.02 : 0.02), -0.58, -0.26),
          ],
          10,
          (t) => (0.068 - Math.abs(hx) * 0.12) * (1 - t * 0.72),
          8
        ),
        opts.hairMat
      );
      lock.castShadow = true;
      headGroup.add(lock);
      opts.flowParts.push(lock);
    });
  } else if (opts.style === 'laulan') {
    // Laulan: High wind-swept lilac ponytail tails streaming dynamically backward
    const tieMat = opts.accentMat ?? new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });
    const topKnot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), opts.hairMat);
    topKnot.position.set(0, 0.2, -0.14);
    const knotRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 8, 16), tieMat);
    knotRing.position.set(0, 0.19, -0.14);
    knotRing.rotation.x = Math.PI / 2.4;
    headGroup.add(topKnot, knotRing);

    [-1, 1].forEach((side) => {
      const tail = new THREE.Mesh(
        createTaperedTubeGeometry(
          [
            new THREE.Vector3(side * 0.025, 0.2, -0.16),
            new THREE.Vector3(side * 0.17, 0.26, -0.32),
            new THREE.Vector3(side * 0.32, 0.12, -0.46),
            new THREE.Vector3(side * 0.41, -0.16, -0.49),
          ],
          12,
          (t) => 0.052 * (1 - t * 0.85),
          8
        ),
        opts.hairMat
      );
      tail.castShadow = true;
      headGroup.add(tail);
      opts.flowParts.push(tail);
    });
  } else if (opts.style === 'whitelady') {
    // White Lady: Floating wind-swept silver tresses + jagged frost-crystal crown antlers
    [-0.18, -0.1, -0.03, 0.03, 0.1, 0.18].forEach((hx, idx) => {
      const wave = idx % 2 === 0 ? 0.08 : -0.05;
      const strand = new THREE.Mesh(
        createTaperedTubeGeometry(
          [
            new THREE.Vector3(hx * 0.85, 0.1, -0.14),
            new THREE.Vector3(hx * 1.9, 0.02 + wave, -0.27),
            new THREE.Vector3(hx * 2.7, -0.22 + wave * 1.4, -0.36),
            new THREE.Vector3(hx * 3.1, -0.58, -0.32),
          ],
          12,
          (t) => 0.068 * (1 - t * 0.82),
          8
        ),
        opts.hairMat
      );
      headGroup.add(strand);
      opts.flowParts.push(strand);
    });

    if (opts.frostMat) {
      [-1, 1].forEach((side) => {
        const mainHorn = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.42, 6), opts.frostMat!);
        mainHorn.position.set(side * 0.17, 0.24, -0.02);
        mainHorn.rotation.z = -side * 0.58;
        mainHorn.rotation.x = -0.15;
        const sideBranch = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.22, 5), opts.frostMat!);
        sideBranch.position.set(side * 0.24, 0.25, -0.03);
        sideBranch.rotation.z = -side * 1.02;
        headGroup.add(mainHorn, sideBranch);
      });
    }
  }

  return headGroup;
}

function buildArticulatedHumanArm(opts: {
  sleeveMat: THREE.MeshStandardMaterial;
  cuffMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  side: -1 | 1;
  wideSleeve?: boolean;
}): { armGroup: THREE.Group; handAnchor: THREE.Group } {
  const armGroup = new THREE.Group();

  // Rounded shoulder cap
  const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), opts.sleeveMat);
  armGroup.add(shoulder);

  // Sculpted flowing Wuxia Shuixiu (water-sleeve) via LatheGeometry
  const flare = opts.wideSleeve ? 0.22 : 0.165;
  const sleeveProfile = [
    new THREE.Vector2(0.072, 0.02),
    new THREE.Vector2(0.095, -0.14),
    new THREE.Vector2(flare, -0.34),
    new THREE.Vector2(flare * 0.86, -0.37),
  ];
  const upperSleeve = new THREE.Mesh(new THREE.LatheGeometry(sleeveProfile, 14), opts.sleeveMat);
  upperSleeve.castShadow = true;
  armGroup.add(upperSleeve);

  // Embroidered golden/accent cuff ring
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(flare * 0.92, 0.015, 8, 16), opts.cuffMat);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.y = -0.35;
  armGroup.add(cuff);

  // Tapered human forearm emerging forward from wide sleeve
  const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.034, 0.24, 10), opts.skinMat);
  forearm.position.set(0, -0.39, 0.05);
  forearm.rotation.x = -0.45;
  armGroup.add(forearm);

  // Sculpted human hand (palm + thumb + fingers)
  const handGroup = new THREE.Group();
  handGroup.position.set(0, -0.49, 0.115);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.068, 0.034), opts.skinMat);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.032, 4, 6), opts.skinMat);
  thumb.position.set(-opts.side * 0.032, 0.006, 0.014);
  thumb.rotation.z = opts.side * 0.55;
  const fingers = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.046, 0.026), opts.skinMat);
  fingers.position.set(0, -0.046, 0.008);
  fingers.rotation.x = 0.25;
  handGroup.add(palm, thumb, fingers);
  armGroup.add(handGroup);

  const handAnchor = new THREE.Group();
  handAnchor.position.set(0, -0.5, 0.135);
  armGroup.add(handAnchor);

  return { armGroup, handAnchor };
}

function buildSculptedHeroLeg(
  xOff: number,
  pantsMat: THREE.MeshStandardMaterial,
  bootMat: THREE.MeshStandardMaterial,
  trimMat: THREE.MeshStandardMaterial
): THREE.Group {
  const leg = new THREE.Group();
  leg.position.set(xOff, 0.78, 0);

  const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.068, 0.36, 10), pantsMat);
  thigh.position.y = -0.18;

  const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.048, 0.34, 10), bootMat);
  shin.position.y = -0.5;

  const bootTop = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.013, 6, 14), trimMat);
  bootTop.rotation.x = Math.PI / 2;
  bootTop.position.y = -0.35;

  // Traditional upturned Wuxia boot foot
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.09, 0.2), bootMat);
  foot.position.set(0, -0.69, 0.045);
  const toeTip = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.09, 6), bootMat);
  toeTip.rotation.x = Math.PI / 2.6;
  toeTip.position.set(0, -0.68, 0.16);

  leg.add(thigh, shin, bootTop, foot, toeTip);
  return leg;
}

// ---------------------------------------------------------------------------
// Heroes (Maomi, Jinka, Laulan)
// ---------------------------------------------------------------------------

export function buildHeroModel(
  hero: HeroId,
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): ArticulatedCharacterRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitFlashMaterials: THREE.MeshStandardMaterial[] = [];
  const flowParts: THREE.Object3D[] = [];

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
      skinShadowHex: '#f3cbb8',
      skinColor: 0xfde6d8,
      pantsColor: 0x065f46,
      collarColor: 0xfef3c7,
      auraColor: 0x34d399,
      blush: '#fda4af',
      ribbonColor: 0x34d399,
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
      skinShadowHex: '#f1ccbe',
      skinColor: 0xfde8dc,
      pantsColor: 0x0f172a,
      collarColor: 0xe0f2fe,
      auraColor: 0x38bdf8,
      blush: undefined,
      ribbonColor: 0x38bdf8,
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
      skinShadowHex: '#f2c8bc',
      skinColor: 0xfde6d8,
      pantsColor: 0x2a1029,
      collarColor: 0xfce7f3,
      auraColor: 0xf472b6,
      blush: '#f9a8d4',
      ribbonColor: 0xf472b6,
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
    skinShadow: config.skinShadowHex,
    eyeColor: config.eyeHex,
    browColor: config.hairHex,
    lipColor: '#be123c',
    blush: config.blush,
    maxAnisotropy: textures.maxAnisotropy,
  });

  const robeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: robeTex,
    roughness: 0.72,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.trimHex,
    roughness: 0.22,
    metalness: 0.82,
    emissive: config.auraColor,
    emissiveIntensity: 0.25,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: config.collarColor,
    roughness: 0.62,
    metalness: 0.05,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: config.skinColor,
    roughness: 0.6,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: config.hairColor,
    roughness: 0.42,
    metalness: 0.14,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: config.pantsColor,
    roughness: 0.78,
    metalness: 0.08,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.42,
    metalness: 0.2,
  });
  hitFlashMaterials.push(robeMat, trimMat);

  root.add(createContactShadow(textures.contactShadow, 0.88));

  // Glowing mystical rune circle at feet
  const auraGeo = new THREE.RingGeometry(0.68, 0.86, 36);
  auraGeo.rotateX(-Math.PI / 2);
  const auraRing = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({
      color: config.auraColor,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  auraRing.position.y = 0.025;
  root.add(auraRing);

  // Articulated legs + upturned Wuxia boots
  const leftLeg = buildSculptedHeroLeg(-0.13, pantsMat, bootMat, trimMat);
  const rightLeg = buildSculptedHeroLeg(0.13, pantsMat, bootMat, trimMat);
  bodyGroup.add(leftLeg, rightLeg);

  // Pleated Multi-Layered Hanfu Skirt / Martial Coat
  if (hero === 'laulan') {
    // Laulan wears flared martial hip-skirts over fitted dark combat trousers
    const sidePanels = new THREE.Mesh(
      createPleatedSkirtGeometry(0.19, 0.29, 0.37, 0.56, 8, 0.55, Math.PI * 1.48),
      robeMat
    );
    sidePanels.rotation.y = Math.PI * 0.26;
    sidePanels.position.y = 0.68;
    sidePanels.castShadow = true;
    bodyGroup.add(sidePanels);
    flowParts.push(sidePanels);
  } else {
    // Inner ankle-length silk underskirt (wide hip radius so legs never clip)
    const innerSkirt = new THREE.Mesh(
      createPleatedSkirtGeometry(0.22, 0.34, 0.46, 0.8, 12, 0, Math.PI * 2),
      collarMat
    );
    innerSkirt.position.y = 0.53;
    bodyGroup.add(innerSkirt);

    // Outer open pleated rune coat with clean centered front split
    const outerSkirt = new THREE.Mesh(
      createPleatedSkirtGeometry(0.23, 0.37, 0.53, 0.8, 12, 0.22, Math.PI * 2 - 0.44),
      robeMat
    );
    outerSkirt.position.y = 0.55;
    outerSkirt.castShadow = true;
    bodyGroup.add(outerSkirt);
    flowParts.push(outerSkirt);
  }

  // Sculpted Anatomical Upper Torso via LatheGeometry (defined shoulders -> cinched waist)
  const torsoProfile =
    hero === 'jinka'
      ? [
          new THREE.Vector2(0.18, -0.25),
          new THREE.Vector2(0.165, -0.1),
          new THREE.Vector2(0.205, 0.08),
          new THREE.Vector2(0.225, 0.22),
          new THREE.Vector2(0.11, 0.26),
        ]
      : [
          new THREE.Vector2(0.185, -0.25),
          new THREE.Vector2(0.145, -0.09),
          new THREE.Vector2(0.195, 0.07),
          new THREE.Vector2(0.205, 0.2),
          new THREE.Vector2(0.1, 0.25),
        ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 18), robeMat);
  torso.scale.set(1.02, 1.0, 0.78); // Natural human chest depth!
  torso.position.y = 1.16;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Layered Cloud Collar / Yunjian Mantle
  const shoulderMantle = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.24, -0.06),
        new THREE.Vector2(0.2, 0.02),
        new THREE.Vector2(0.105, 0.05),
      ],
      16
    ),
    trimMat
  );
  shoulderMantle.scale.set(1.06, 1.0, 0.84);
  shoulderMantle.position.y = 1.37;
  bodyGroup.add(shoulderMantle);

  // Crossed Hanfu Lapels (Jiaoling Youren) hugging sculpted chest
  [-1, 1].forEach((side) => {
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.34, 0.032), collarMat);
    lapel.position.set(side * 0.055, 1.24, 0.145);
    lapel.rotation.z = side * 0.36;
    lapel.rotation.x = -0.12;
    bodyGroup.add(lapel);
  });

  // Ornate Waist Obi Sash + Glowing Jade Yupei Pendant + Hanging Ribbon Tails
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.192, 0.11, 16), trimMat);
  sash.scale.set(1.04, 1.0, 0.82);
  sash.position.y = 0.94;
  const jadePendant = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.058, 0),
    new THREE.MeshStandardMaterial({
      color: config.auraColor,
      emissive: config.auraColor,
      emissiveIntensity: 0.75,
      roughness: 0.15,
      metalness: 0.35,
    })
  );
  jadePendant.position.set(0, 0.94, 0.172);
  bodyGroup.add(sash, jadePendant);

  // Fluttering silk waist ribbons
  [-1, 1].forEach((side) => {
    const ribbon = new THREE.Mesh(
      createTaperedTubeGeometry(
        [
          new THREE.Vector3(side * 0.14, 0.92, 0.1),
          new THREE.Vector3(side * 0.25, 0.7, 0.02),
          new THREE.Vector3(side * 0.31, 0.45, -0.14),
        ],
        8,
        (t) => 0.028 * (1 - t * 0.55),
        6
      ),
      trimMat
    );
    bodyGroup.add(ribbon);
    flowParts.push(ribbon);
  });

  // Sculpted Human Head (anime eyes, jawline, ears & signature hairstyle)
  const headGroup = buildHumanHead({
    skinMat,
    faceTex,
    hairMat,
    trimMat,
    style: hero,
    flowParts,
  });
  headGroup.position.set(0, 1.59, 0);
  bodyGroup.add(headGroup);

  // Articulated Arms + Billowing Shuixiu Water-Sleeves + Sculpted Hands
  const left = buildArticulatedHumanArm({
    sleeveMat: robeMat,
    cuffMat: trimMat,
    skinMat,
    side: -1,
    wideSleeve: hero !== 'laulan',
  });
  left.armGroup.position.set(-0.24, 1.34, 0);
  bodyGroup.add(left.armGroup);

  const right = buildArticulatedHumanArm({
    sleeveMat: robeMat,
    cuffMat: trimMat,
    skinMat,
    side: 1,
    wideSleeve: hero !== 'laulan',
  });
  right.armGroup.position.set(0.24, 1.34, 0);
  bodyGroup.add(right.armGroup);

  // Swirling Qi Spirit Ribbon wrapping hero silhouette (matches poster's emerald/azure/pink Qi rings!)
  const qiRibbonMat = new THREE.MeshBasicMaterial({
    color: config.ribbonColor,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const qiPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const ang = t * Math.PI * 2.5 + (hero === 'maomi' ? 0.4 : hero === 'laulan' ? -0.4 : 0);
    const rad = hero === 'jinka' ? 0.58 + Math.sin(t * Math.PI) * 0.25 : 0.46 + t * 0.34;
    const y = hero === 'jinka' ? 0.22 + Math.sin(t * Math.PI * 2) * 0.14 : 0.32 + t * 1.18;
    qiPts.push(new THREE.Vector3(Math.cos(ang) * rad, y, Math.sin(ang) * rad));
  }
  const qiRibbon = new THREE.Mesh(
    createTaperedTubeGeometry(qiPts, 28, (t) => 0.042 * Math.sin(t * Math.PI), 6),
    qiRibbonMat
  );
  root.add(qiRibbon);
  flowParts.push(qiRibbon);

  const weaponAnchor = right.handAnchor;
  const orbiters: THREE.Object3D[] = [];

  let idleRightArmX = -0.15;
  let idleRightArmZ = 0.08;
  let idleLeftArmX = -0.15;
  let idleLeftArmZ = -0.08;

  if (hero === 'maomi') {
    // Maomi holds glowing emerald Qi Yang potion flask aloft + drawstring herb satchel
    idleRightArmX = -1.25;
    idleRightArmZ = 0.24;
    idleLeftArmX = -0.45;
    idleLeftArmZ = -0.22;

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 0.4,
      roughness: 0.08,
      clearcoat: 1.0,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: 0.44,
    });
    const liquidMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 1.85,
      roughness: 0.15,
    });
    const flaskProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.085, 0.01),
      new THREE.Vector2(0.11, 0.07),
      new THREE.Vector2(0.095, 0.14),
      new THREE.Vector2(0.032, 0.19),
      new THREE.Vector2(0.032, 0.25),
      new THREE.Vector2(0.048, 0.265),
    ];
    const flaskGlass = new THREE.Mesh(new THREE.LatheGeometry(flaskProfile, 16), glassMat);
    const liquidCore = new THREE.Mesh(new THREE.SphereGeometry(0.082, 12, 10), liquidMat);
    liquidCore.position.y = 0.082;
    const glowHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.155, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.26, depthWrite: false })
    );
    glowHalo.position.y = 0.09;
    const stopper = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.045, 10), trimMat);
    stopper.position.y = 0.275;
    weaponAnchor.add(flaskGlass, liquidCore, glowHalo, stopper);

    // Drawstring herb pouch in left hand
    const pouchMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78, metalness: 0.05 });
    const pouchProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.095, 0.03),
      new THREE.Vector2(0.105, 0.1),
      new THREE.Vector2(0.04, 0.15),
      new THREE.Vector2(0.065, 0.19),
    ];
    const pouch = new THREE.Mesh(new THREE.LatheGeometry(pouchProfile, 12), pouchMat);
    pouch.position.y = -0.14;
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), trimMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 0.01;
    left.handAnchor.add(pouch, cord);
  } else if (hero === 'jinka') {
    // Jinka: Sculpted scholar casting pose + 4 orbiting glowing talisman scrolls
    idleRightArmX = -0.58;
    idleRightArmZ = 0.18;
    idleLeftArmX = -0.68;
    idleLeftArmZ = -0.24;

    const scrollMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.scrollRune,
      roughness: 0.6,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.42,
      side: THREE.DoubleSide,
    });
    const rodMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.18 });
    for (let i = 0; i < 4; i++) {
      const scrollGroup = new THREE.Group();
      const parchment = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.46), scrollMat);
      const topRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), rodMat);
      topRod.rotation.z = Math.PI / 2;
      topRod.position.y = 0.23;
      const botRod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), rodMat);
      botRod.rotation.z = Math.PI / 2;
      botRod.position.y = -0.23;
      scrollGroup.add(parchment, topRod, botRod);
      const angle = (i / 4) * Math.PI * 2;
      scrollGroup.position.set(Math.cos(angle) * 0.78, 1.15, Math.sin(angle) * 0.78);
      root.add(scrollGroup);
      orbiters.push(scrollGroup);
    }
  } else {
    // Laulan: Sculpted ribbed folding war-fan + trailing pink crescent + acupuncture needles
    idleRightArmX = -0.72;
    idleRightArmZ = 0.32;
    idleLeftArmX = -0.45;
    idleLeftArmZ = -0.35;

    const fanGroup = new THREE.Group();
    const fanShape = new THREE.Shape();
    fanShape.moveTo(0, 0.08);
    fanShape.absarc(0, 0, 0.46, -Math.PI * 0.34, Math.PI * 0.34, false);
    fanShape.lineTo(Math.cos(-Math.PI * 0.34) * 0.12, Math.sin(-Math.PI * 0.34) * 0.12);
    fanShape.absarc(0, 0, 0.12, -Math.PI * 0.34, Math.PI * 0.34, false);
    const fanGeo = new THREE.ExtrudeGeometry(fanShape, {
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    });
    const fanSilk = new THREE.Mesh(
      fanGeo,
      new THREE.MeshStandardMaterial({
        color: 0xfbcfe8,
        emissive: 0xf472b6,
        emissiveIntensity: 0.55,
        roughness: 0.35,
      })
    );
    fanGroup.add(fanSilk);

    // Individual golden fan ribs
    for (let r = -4; r <= 4; r++) {
      const ang = (r / 4) * Math.PI * 0.34;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.44, 0.018), trimMat);
      rib.position.set(Math.cos(ang) * 0.22, Math.sin(ang) * 0.22, 0.006);
      rib.rotation.z = ang - Math.PI / 2;
      fanGroup.add(rib);
    }
    fanGroup.rotation.x = Math.PI / 2;
    fanGroup.rotation.z = Math.PI / 2;
    weaponAnchor.add(fanGroup);

    const needleMat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.92, roughness: 0.14 });
    [-0.025, 0, 0.025].forEach((nx) => {
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.002, 0.3, 6), needleMat);
      needle.position.set(nx, 0.02, 0.11);
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
    flowParts,
    idleRightArmX,
    idleRightArmZ,
    idleLeftArmX,
    idleLeftArmZ,
  };
}

// ---------------------------------------------------------------------------
// Villains (The White Lady & Shadow Assassins)
// ---------------------------------------------------------------------------

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
  const flowParts: THREE.Object3D[] = [];

  if (policy === 'whitelady') {
    root.scale.setScalar(1.12);
    root.add(createContactShadow(textures.contactShadow, 1.7));

    const gownMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.58,
      metalness: 0.08,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.16,
      side: THREE.DoubleSide,
    });
    const azureTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.32,
      metalness: 0.35,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.45,
    });
    const serpentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.serpentScale,
      roughness: 0.34,
      metalness: 0.22,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.18,
    });
    const frostMat = new THREE.MeshPhysicalMaterial({
      color: 0xa5f3fc,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.52,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1.0,
      transparent: true,
      opacity: isSoftwareGl ? 0.74 : 0.9,
    });
    const sashMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      roughness: 0.42,
      metalness: 0.25,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfef2f2, roughness: 0.54, metalness: 0.02 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.16 });
    hitFlashMaterials.push(gownMat, serpentMat, sashMat);

    // 1. Muscular Tapered Coiling Serpent Body (poster-accurate S-coil with smooth tip taper & belly scutes)
    const coilPts = [
      new THREE.Vector3(0, 1.56, 0),
      new THREE.Vector3(-0.34, 1.18, 0.28),
      new THREE.Vector3(-0.62, 0.72, -0.04),
      new THREE.Vector3(-0.18, 0.36, -0.48),
      new THREE.Vector3(0.56, 0.32, -0.22),
      new THREE.Vector3(0.86, 0.56, 0.36),
      new THREE.Vector3(0.58, 0.88, 0.62),
      new THREE.Vector3(0.14, 1.06, 0.68),
    ];
    const coilGeo = createTaperedTubeGeometry(
      coilPts,
      44,
      (t) => {
        if (t < 0.22) return 0.24 + t * 0.25;
        return Math.max(0.025, 0.295 * Math.pow(1 - (t - 0.22) / 0.78, 0.78));
      },
      16
    );
    const coilMesh = new THREE.Mesh(coilGeo, serpentMat);
    coilMesh.castShadow = true;
    bodyGroup.add(coilMesh);

    // 2. Sculpted Human Empress Upper Torso + Azure-Trimmed Plunging Collar + Open Coat
    const torsoProfile = [
      new THREE.Vector2(0.22, -0.32),
      new THREE.Vector2(0.155, -0.14),
      new THREE.Vector2(0.225, 0.08),
      new THREE.Vector2(0.24, 0.24),
      new THREE.Vector2(0.115, 0.3),
    ];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 18), gownMat);
    torso.scale.set(1.04, 1.0, 0.76);
    torso.position.y = 1.84;
    torso.castShadow = true;
    bodyGroup.add(torso);

    // Crossed azure-embroidered lapels + crimson waist corset belt
    [-1, 1].forEach((side) => {
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.36, 0.036), azureTrimMat);
      collar.position.set(side * 0.072, 1.92, 0.165);
      collar.rotation.z = side * 0.38;
      collar.rotation.x = -0.15;
      bodyGroup.add(collar);
    });

    const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.16, 16), sashMat);
    sash.scale.set(1.04, 1.0, 0.78);
    sash.position.y = 1.56;
    const jadeGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), frostMat);
    jadeGem.position.set(0, 1.56, 0.175);
    bodyGroup.add(sash, jadeGem);

    // 3. Ethereal Anime Face with Crimson Gaze + Celestial Ears + Frost Antler Horns
    const wlFace = createAnimeFaceTexture({
      skin: '#fef2f2',
      skinShadow: '#e2d4de',
      eyeColor: '#e11d48',
      browColor: '#94a3b8',
      lipColor: '#be123c',
      foreheadMark: '#38bdf8',
      maxAnisotropy: textures.maxAnisotropy,
    });
    const headGroup = buildHumanHead({
      skinMat,
      faceTex: wlFace,
      hairMat,
      style: 'whitelady',
      frostMat,
      flowParts,
    });
    headGroup.position.set(0, 2.32, 0);
    bodyGroup.add(headGroup);

    // 4. Dramatic Wide Billowing Shuixiu Sleeves raised outward
    const left = buildArticulatedHumanArm({
      sleeveMat: gownMat,
      cuffMat: azureTrimMat,
      skinMat,
      side: -1,
      wideSleeve: true,
    });
    left.armGroup.position.set(-0.28, 2.04, 0);
    left.armGroup.rotation.z = -1.04;
    left.armGroup.rotation.x = -0.18;
    bodyGroup.add(left.armGroup);

    const right = buildArticulatedHumanArm({
      sleeveMat: gownMat,
      cuffMat: azureTrimMat,
      skinMat,
      side: 1,
      wideSleeve: true,
    });
    right.armGroup.position.set(0.28, 2.04, 0);
    right.armGroup.rotation.z = 1.04;
    right.armGroup.rotation.x = -0.18;
    bodyGroup.add(right.armGroup);

    // 5. Blazing Cyan-and-Shadow Spirit Aura Flames Behind Her (high contrast halo!)
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.56,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const shadowWispMat = new THREE.MeshBasicMaterial({
      color: 0x090d1a,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.28;
      const h = 1.85 - Math.abs(i) * 0.22;
      const tongue = new THREE.Mesh(
        createTaperedTubeGeometry(
          [
            new THREE.Vector3(x * 0.55, 1.32, -0.34),
            new THREE.Vector3(x * 1.15, 1.32 + h * 0.55, -0.48),
            new THREE.Vector3(x * 0.42, 1.32 + h, -0.38),
          ],
          10,
          (t) => (Math.abs(i) >= 2 ? 0.2 : 0.17) * Math.sin(t * Math.PI),
          7
        ),
        Math.abs(i) >= 2 ? shadowWispMat : flameMat
      );
      bodyGroup.add(tongue);
      flowParts.push(tongue);
    }

    // 6. Orbiting Jagged Ice Crystals
    const crystalGeo = new THREE.OctahedronGeometry(0.24, 0);
    for (let i = 0; i < 6; i++) {
      const crystal = new THREE.Mesh(crystalGeo, frostMat);
      const a = (i / 6) * Math.PI * 2;
      crystal.position.set(Math.cos(a) * 1.28, 1.55 + (i % 2) * 0.45, Math.sin(a) * 1.28);
      crystal.scale.set(0.65, 1.9, 0.65);
      root.add(crystal);
      orbiters.push(crystal);
    }

    const auraGeo = new THREE.RingGeometry(1.18, 1.42, 36);
    auraGeo.rotateX(-Math.PI / 2);
    const auraRing = new THREE.Mesh(
      auraGeo,
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false })
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
      flowParts,
    };
  }

  // Real Human Shadow Assassin Archetypes (Stalker, Kunai, Sentinel)
  const scale = policy === 'sentinel' ? 1.24 : policy === 'kunai' ? 0.96 : 1.02;
  root.scale.setScalar(scale);
  root.add(createContactShadow(textures.contactShadow, 0.8));

  const cloakColor = policy === 'sentinel' ? 0x1e293b : policy === 'kunai' ? 0x2e1065 : 0x0f172a;
  const accentColor = policy === 'sentinel' ? 0x38bdf8 : policy === 'kunai' ? 0xc084fc : 0xef4444;
  const eyeStr = policy === 'sentinel' ? '#38bdf8' : policy === 'kunai' ? '#c084fc' : '#ef4444';

  const cloakMat = new THREE.MeshStandardMaterial({ color: cloakColor, roughness: 0.82, metalness: 0.1, side: THREE.DoubleSide });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.28, metalness: 0.78 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  hitFlashMaterials.push(cloakMat, armorMat);

  const leftLeg = buildSculptedHeroLeg(-0.13, cloakMat, armorMat, armorMat);
  const rightLeg = buildSculptedHeroLeg(0.13, cloakMat, armorMat, armorMat);
  bodyGroup.add(leftLeg, rightLeg);

  // Sculpted Martial Assassin Tunic + Torn Flowing Cloak Skirt + Bandolier Straps
  const tunicProfile = [
    new THREE.Vector2(0.18, -0.26),
    new THREE.Vector2(0.16, -0.06),
    new THREE.Vector2(0.22, 0.14),
    new THREE.Vector2(0.23, 0.25),
    new THREE.Vector2(0.11, 0.28),
  ];
  const torso = new THREE.Mesh(new THREE.LatheGeometry(tunicProfile, 14), cloakMat);
  torso.scale.set(1.04, 1.0, 0.78);
  torso.position.y = 1.08;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Tattered knee-length assassin waist coat & shoulder cape
  const waistCape = new THREE.Mesh(
    createPleatedSkirtGeometry(0.19, 0.28, 0.38, 0.56, 7, 0.5, Math.PI * 1.5),
    cloakMat
  );
  waistCape.rotation.y = Math.PI * 0.25;
  waistCape.position.y = 0.64;
  bodyGroup.add(waistCape);

  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 0.36), armorMat);
  strap.position.set(0, 1.12, 0);
  strap.rotation.z = 0.65;
  bodyGroup.add(strap);

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.2, 0.11, 12), armorMat);
  waist.scale.set(1.05, 1.0, 0.8);
  waist.position.y = 0.84;
  bodyGroup.add(waist);

  // Billowing dark shoulder cloak / scarf
  const backCloak = new THREE.Mesh(
    createTaperedTubeGeometry(
      [
        new THREE.Vector3(0, 1.36, -0.14),
        new THREE.Vector3(0, 0.96, -0.28),
        new THREE.Vector3(0.04, 0.45, -0.4),
      ],
      10,
      (t) => 0.24 * (1 - t * 0.45),
      8
    ),
    cloakMat
  );
  bodyGroup.add(backCloak);
  flowParts.push(backCloak);

  if (policy === 'sentinel') {
    [-1, 1].forEach((side) => {
      const pauldron = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        armorMat
      );
      pauldron.position.set(side * 0.27, 1.32, 0);
      pauldron.rotation.z = -side * 0.45;
      bodyGroup.add(pauldron);
    });
  }

  const maskFaceTex = createAnimeFaceTexture({
    skin: '#0f172a',
    skinShadow: '#090e1c',
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
    flowParts,
  });
  headGroup.position.set(0, 1.54, 0);
  bodyGroup.add(headGroup);

  const left = buildArticulatedHumanArm({
    sleeveMat: cloakMat,
    cuffMat: armorMat,
    skinMat: armorMat,
    side: -1,
    wideSleeve: false,
  });
  left.armGroup.position.set(-0.26, 1.28, 0);
  bodyGroup.add(left.armGroup);

  const right = buildArticulatedHumanArm({
    sleeveMat: cloakMat,
    cuffMat: armorMat,
    skinMat: armorMat,
    side: 1,
    wideSleeve: false,
  });
  right.armGroup.position.set(0.26, 1.28, 0);
  bodyGroup.add(right.armGroup);

  if (policy === 'sentinel') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 8), armorMat);
    shaft.rotation.x = Math.PI / 3;
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.48, 4),
      new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        metalness: 0.88,
        roughness: 0.18,
      })
    );
    blade.position.set(0, 0.44, 0.72);
    blade.rotation.x = Math.PI / 3;
    right.handAnchor.add(shaft, blade);
  } else if (policy === 'kunai') {
    const kunaiMat = new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0x9333ea,
      emissiveIntensity: 0.55,
      metalness: 0.85,
      roughness: 0.2,
    });
    [-0.18, 0, 0.18].forEach((ang) => {
      const k = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.34, 4), kunaiMat);
      k.rotation.x = Math.PI / 2;
      k.rotation.z = ang;
      k.position.set(Math.sin(ang) * 0.08, 0, 0.16);
      right.handAnchor.add(k);
    });
  } else {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.46, 4), armorMat);
    blade.rotation.x = Math.PI / 2;
    blade.position.z = 0.2;
    right.handAnchor.add(blade);
  }

  const auraGeo = new THREE.RingGeometry(0.55, 0.65, 24);
  auraGeo.rotateX(-Math.PI / 2);
  const auraRing = new THREE.Mesh(
    auraGeo,
    new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
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
    flowParts,
  };
}

// ---------------------------------------------------------------------------
// Courtyard Environment (Imperial Wuxia Palace + Guardian Lions + Dusk Sky)
// ---------------------------------------------------------------------------

function buildGuardianLion(stoneMat: THREE.MeshStandardMaterial, goldMat: THREE.MeshStandardMaterial): THREE.Group {
  const lion = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.82, 1.15), stoneMat);
  plinth.position.y = 0.41;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 1.28), stoneMat);
  cap.position.y = 0.89;

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), stoneMat);
  body.scale.set(0.88, 1.12, 1.15);
  body.position.set(0, 1.25, -0.06);
  body.castShadow = true;

  // Front legs & paws
  [-0.18, 0.18].forEach((px) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.38, 8), stoneMat);
    leg.position.set(px, 1.12, 0.24);
    lion.add(leg);
  });

  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 1), stoneMat);
  head.position.set(0, 1.66, 0.12);
  head.castShadow = true;

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), stoneMat);
  snout.position.set(0, 1.6, 0.3);

  [-0.2, 0.2].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 5), stoneMat);
    ear.position.set(ex, 1.88, 0.1);
    ear.rotation.z = -Math.sign(ex) * 0.4;
    lion.add(ear);
  });

  const mane = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 8, 14), stoneMat);
  mane.position.set(0, 1.66, 0.04);

  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), goldMat);
  pearl.position.set(0.18, 1.08, 0.34);

  lion.add(plinth, cap, body, head, snout, mane, pearl);
  return lion;
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

  // Atmospheric Dusk Twilight Sky Dome (deep indigo zenith -> rose-violet horizon)
  const skyGeo = new THREE.SphereGeometry(85, 24, 16);
  const skyPos = skyGeo.attributes.position;
  const skyColors = new Float32Array(skyPos.count * 3);
  const topColor = new THREE.Color(0x0a0f24);
  const midColor = new THREE.Color(0x1f1d45);
  const horizonColor = new THREE.Color(0x52294a);
  const tmpCol = new THREE.Color();
  for (let i = 0; i < skyPos.count; i++) {
    const yNorm = THREE.MathUtils.clamp(skyPos.getY(i) / 85, 0, 1);
    if (yNorm < 0.35) {
      tmpCol.copy(horizonColor).lerp(midColor, yNorm / 0.35);
    } else {
      tmpCol.copy(midColor).lerp(topColor, (yNorm - 0.35) / 0.65);
    }
    skyColors[i * 3] = tmpCol.r;
    skyColors[i * 3 + 1] = tmpCol.g;
    skyColors[i * 3 + 2] = tmpCol.b;
  }
  skyGeo.setAttribute('color', new THREE.BufferAttribute(skyColors, 3));
  const skyDome = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })
  );
  scene.add(skyDome);

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

  // Elevated Altar Steps & Obsidian Plinth
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

  // Forbidden Elixir of Immunity (Qi Yang) Bottle on the Altar
  const elixirGroup = new THREE.Group();
  elixirGroup.position.set(0, 1.24, 0);
  const elixirMat = new THREE.MeshPhysicalMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.94,
  });
  const elixirProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.24, 0.02),
    new THREE.Vector2(0.3, 0.16),
    new THREE.Vector2(0.24, 0.34),
    new THREE.Vector2(0.09, 0.46),
    new THREE.Vector2(0.09, 0.58),
    new THREE.Vector2(0.14, 0.62),
  ];
  const elixirBody = new THREE.Mesh(new THREE.LatheGeometry(elixirProfile, 18), elixirMat);
  const elixirAura = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.022, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: 0.72 })
  );
  elixirAura.rotation.x = Math.PI / 2;
  elixirAura.position.y = 0.24;
  elixirGroup.add(elixirBody, elixirAura);
  altarPedestal.add(elixirGroup);

  const iceMat = new THREE.MeshPhysicalMaterial({
    color: 0xa5f3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: isSoftwareGl ? 0.72 : 0.86,
  });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const h = 1.25 + (i % 3) * 0.55;
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.28, h, 5), iceMat);
    shard.position.set(Math.cos(a) * 2.1, h * 0.4, Math.sin(a) * 1.4);
    shard.rotation.z = Math.cos(a) * -0.25;
    shard.rotation.x = Math.sin(a) * 0.2;
    altarPedestal.add(shard);
    altarCrystals.push(shard);
  }
  scene.add(altarPedestal);

  // Foreground Guardian Stone Lions (matching poster!)
  const lionL = buildGuardianLion(stoneTrimMat, goldMat);
  lionL.position.set(-7.2, 0, 8.8);
  lionL.rotation.y = 0.42;
  const lionR = buildGuardianLion(stoneTrimMat, goldMat);
  lionR.position.set(7.2, 0, 8.8);
  lionR.rotation.y = -0.42;
  scene.add(lionL, lionR);

  // Carved Stone Balustrades
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

  // Symmetrical Palace Colonnades with Upturned Imperial Roof Eaves & Hanging Lanterns
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

    const dir = sideX > 0 ? 1 : -1;
    const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.35, 22), woodMat);
    roofBeam.position.set(dir * 1.1, 4.65, 0);
    const roofSlope = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.28, 23), roofMat);
    roofSlope.position.set(dir * 1.3, 5.2, 0);
    roofSlope.rotation.z = dir * -0.34;
    // Upturned flying eave lip
    const eaveLip = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 23.2), goldMat);
    eaveLip.position.set(dir * -0.82, 4.56, 0);
    eaveLip.rotation.z = dir * 0.24;
    wing.add(roofBeam, roofSlope, eaveLip);

    addLightAtZ.forEach((lz) => {
      const lanternGroup = new THREE.Group();
      lanternGroup.position.set(sideX > 0 ? -0.9 : 0.9, 3.65, lz);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), woodMat);
      cord.position.y = 0.65;
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.7, 8), lanternPaperMat);
      const glowHalo = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.24, depthWrite: false })
      );
      const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 0.1, 8), woodMat);
      topCap.position.y = 0.38;
      const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.1, 8), woodMat);
      botCap.position.y = -0.38;
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.42, 6), goldMat);
      tassel.position.y = -0.62;
      lanternGroup.add(cord, body, glowHalo, topCap, botCap, tassel);

      const pt = new THREE.PointLight(0xf59e0b, 9.5, 16, 1.5);
      pt.position.set(0, 0, 0);
      lanternGroup.add(pt);
      lanternLights.push(pt);

      wing.add(lanternGroup);
    });

    scene.add(wing);
  };

  buildPavilionWing(-15.5, [-8, -1, 6]);
  buildPavilionWing(15.5, [-8, -1, 6]);

  // Sculpted Blossom Trees
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

  // Distant Mountain Ridge Perimeter
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
