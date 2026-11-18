import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { wuxiaAudio } from './audio';
import {
  type ArticulatedCharacterRig,
  buildCourtyardEnvironment,
  buildEnemyModel,
  buildHeroModel,
  createProceduralTextures,
  type ProceduralTextures,
} from './models';
import {
  addResonance,
  applyHealingAndCleanse,
  applySquadDamage,
  calculateFinalScore,
  clampCourtyardPosition,
  computeEnemyDesiredVelocity,
  computeSynergyRetaliation,
  getWaveConfiguration,
  HERO_ORDER,
  HERO_ROSTER,
} from './rules';
import type { CombatSnapshot, EnemyPolicy, GamePhase, HeroId } from './types';

// Pre-allocated scratch math objects (Zero GC inside render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _euler = new THREE.Euler();

interface EnemyEntity {
  id: number;
  policy: EnemyPolicy;
  rig: ArticulatedCharacterRig;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  speed: number;
  strafeSign: number;
  state: 'approach' | 'windup' | 'attack' | 'recover' | 'ko';
  stateTimer: number;
  hitFlashTimer: number;
  stunTimer: number;
  poisonTimer: number;
  poisonTickTimer: number;
  exposedTimer: number;
  armorBrokenTimer: number;
  koTimer: number;
  walkPhase: number;
  telegraphRing: THREE.Mesh;
}

interface ProjectileEntity {
  active: boolean;
  fromPlayer: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  damage: number;
  aoeRadius: number;
  poisonBoss: boolean;
  exposeOnHit: boolean;
  isPoison: boolean;
  life: number;
  mesh: THREE.Mesh;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface PetalParticle {
  x: number;
  y: number;
  z: number;
  vy: number;
  swayPhase: number;
  rotSpeed: number;
  size: number;
}

export class WuxiaCourtyardEngine {
  private container: HTMLElement;
  private onSnapshot: (snap: CombatSnapshot) => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private textures: ProceduralTextures;
  private isSoftwareGl: boolean;

  private frameId = 0;
  private destroyed = false;
  private lastTimeMs = performance.now();
  private hudSyncTimer = 0;

  // Game State
  private phase: GamePhase = 'title';
  private activeHero: HeroId = 'jinka';
  private squadHp = 200;
  private squadMaxHp = 200;
  private barrier = 0;
  private miasmaStacks = 0;
  private miasmaTickTimer = 0;
  private resonance = 0;
  private fightIqStacks = 0;
  private retaliationsTriggered = 0;
  private wave = 1;
  private maxWaves = 3;
  private score = 0;
  private combo = 0;
  private comboResetTimer = 0;
  private damageTaken = 0;
  private enemiesDefeated = 0;
  private elapsedSeconds = 0;
  private bannerText = 'Three heroes stand united to guard Axia’s Elixir of Immunity.';

  private cooldowns = { strike: 0, ultimate: 0 };
  private heroCooldowns: Record<HeroId, { skillQ: number; skillE: number }> = {
    maomi: { skillQ: 0, skillE: 0 },
    jinka: { skillQ: 0, skillE: 0 },
    laulan: { skillQ: 0, skillE: 0 },
  };
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private waveAdvanceTimer = 0;

  // Input State
  private heldKeys = new Set<string>();
  private justPressed = new Set<string>();
  private bufferedAction: 'strike' | 'skillQ' | 'skillE' | 'ultimate' | null = null;
  private bufferTimer = 0;

  // Entities
  private heroRigs: Record<HeroId, ArticulatedCharacterRig>;
  private heroPositions: Record<HeroId, { x: number; z: number; yaw: number; walkPhase: number; swingTimer: number }>;
  private enemies: EnemyEntity[] = [];
  private nextEnemyId = 1;
  private projectiles: ProjectileEntity[] = [];

  // Environment Animated Props
  private elixirOrb: THREE.Object3D;
  private altarCrystals: THREE.Object3D[];
  private lanternLights: THREE.PointLight[];

  // Pooled Instanced Particle Systems
  private sparkMesh: THREE.InstancedMesh;
  private sparks: SparkParticle[] = [];
  private sparkCursor = 0;
  private petalMesh: THREE.InstancedMesh;
  private petals: PetalParticle[] = [];

  // Camera smoothing
  private camPos = new THREE.Vector3(0, 10, 19);
  private camLook = new THREE.Vector3(0, 1.5, -2);
  private titleOrbitAngle = 0;

  // Bound event listeners for clean teardown
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onVisibilityBound: () => void;

  constructor(container: HTMLElement, onSnapshot: (snap: CombatSnapshot) => void) {
    this.container = container;
    this.onSnapshot = onSnapshot;

    // Detect software WebGL cleanly from renderer string
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // Scene & Twilight Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1426);
    this.scene.fog = new THREE.FogExp2(0x0f1426, 0.022);

    this.camera = new THREE.PerspectiveCamera(
      48,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      140
    );
    this.camera.position.copy(this.camPos);

    // Mandatory RoomEnvironment IBL
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // Warm/Cool Contrast Lighting Rig
    const hemi = new THREE.HemisphereLight(0x7c8cff, 0x101726, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffcf8b, 1.55);
    keyLight.position.set(12, 22, 14);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 55;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const altarRim = new THREE.DirectionalLight(0x67e8f9, 0.95);
    altarRim.position.set(-8, 12, -20);
    this.scene.add(altarRim);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    // Build Courtyard Environment
    const envRefs = buildCourtyardEnvironment(this.scene, this.textures, this.isSoftwareGl);
    this.elixirOrb = envRefs.elixirOrb;
    this.altarCrystals = envRefs.altarCrystals;
    this.lanternLights = envRefs.lanternLights;

    // Build Hero Trio
    this.heroRigs = {
      maomi: buildHeroModel('maomi', this.textures, this.isSoftwareGl),
      jinka: buildHeroModel('jinka', this.textures, this.isSoftwareGl),
      laulan: buildHeroModel('laulan', this.textures, this.isSoftwareGl),
    };
    this.heroPositions = {
      maomi: { x: -2.4, z: 5.2, yaw: Math.PI, walkPhase: 0, swingTimer: 0 },
      jinka: { x: 0, z: 6.4, yaw: Math.PI, walkPhase: 0, swingTimer: 0 },
      laulan: { x: 2.4, z: 5.2, yaw: Math.PI, walkPhase: 0, swingTimer: 0 },
    };
    HERO_ORDER.forEach((id) => {
      const rig = this.heroRigs[id];
      rig.root.position.set(this.heroPositions[id].x, 0, this.heroPositions[id].z);
      this.scene.add(rig.root);
    });

    // Pooled Projectiles (24 slots)
    const projGeo = new THREE.SphereGeometry(0.22, 10, 8);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectiles.push({
        active: false,
        fromPlayer: true,
        x: 0,
        y: 1.0,
        z: 0,
        vx: 0,
        vz: 0,
        radius: 0.35,
        damage: 20,
        aoeRadius: 0,
        poisonBoss: false,
        exposeOnHit: false,
        isPoison: false,
        life: 0,
        mesh,
      });
    }

    // Pooled Magic Sparks (InstancedMesh, 96 instances)
    const sparkGeo = new THREE.OctahedronGeometry(0.11, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, 96);
    this.sparkMesh.frustumCulled = false;
    this.scene.add(this.sparkMesh);
    for (let i = 0; i < 96; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        size: 1,
        color: new THREE.Color(0x34d399),
      });
      _mat4.makeScale(0, 0, 0);
      this.sparkMesh.setMatrixAt(i, _mat4);
      this.sparkMesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;

    // Pooled Drifting Cherry Blossom Petals (InstancedMesh, 80 instances)
    const petalGeo = new THREE.PlaneGeometry(0.22, 0.14);
    const petalMat = new THREE.MeshBasicMaterial({
      color: 0xf9a8d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.petalMesh = new THREE.InstancedMesh(petalGeo, petalMat, 80);
    this.petalMesh.frustumCulled = false;
    this.scene.add(this.petalMesh);
    for (let i = 0; i < 80; i++) {
      this.petals.push({
        x: (Math.random() - 0.5) * 32,
        y: Math.random() * 10 + 0.5,
        z: (Math.random() - 0.5) * 30,
        vy: 0.65 + Math.random() * 0.6,
        swayPhase: Math.random() * Math.PI * 2,
        rotSpeed: 1 + Math.random() * 2,
        size: 0.7 + Math.random() * 0.6,
      });
    }

    // Spawn dramatic preview White Lady + assassins on the Title showcase
    this.setupTitleShowcase();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind Listeners
    this.onResizeBound = () => this.handleResize();
    this.onKeyDownBound = (e) => this.handleKeyDown(e);
    this.onKeyUpBound = (e) => this.handleKeyUp(e);
    this.onBlurBound = () => this.clearInputs();
    this.onVisibilityBound = () => {
      if (document.hidden) this.clearInputs();
    };

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onVisibilityBound);

    this.syncBodyState();
    this.emitSnapshot();
    this.camera.position.set(0, 3.85, 12.4);
    this.camera.lookAt(0, 1.55, -1.6);
    this.camPos.copy(this.camera.position);
    this.camLook.set(0, 1.55, -1.6);
    this.renderer.render(this.scene, this.camera);
    this.startLoop();
  }

  private syncBodyState(): void {
    const mapped =
      this.phase === 'victory' || this.phase === 'defeat' ? 'gameover' : this.phase;
    document.body.dataset.state = mapped;
  }

  private setupTitleShowcase(): void {
    this.clearEnemies();
    this.spawnEnemy('whitelady', 0, -9.2);
    this.spawnEnemy('stalker', -5.4, -1.6);
    this.spawnEnemy('kunai', 5.4, -1.6);
    // Face heroes forward/three-quarter like the concept poster so real anime-human faces & robes shine
    if (this.enemies[0]) this.enemies[0].rig.root.rotation.y = 0;
    if (this.enemies[1]) this.enemies[1].rig.root.rotation.y = Math.atan2(5.4, 6.4);
    if (this.enemies[2]) this.enemies[2].rig.root.rotation.y = Math.atan2(-5.4, 6.4);

    this.heroPositions.maomi = { x: -2.5, z: 4.8, yaw: 0.36, walkPhase: 0, swingTimer: 0 };
    this.heroPositions.jinka = { x: 0, z: 5.8, yaw: 0.05, walkPhase: 0, swingTimer: 0 };
    this.heroPositions.laulan = { x: 2.5, z: 4.8, yaw: -0.36, walkPhase: 0, swingTimer: 0 };
    this.updateHeroVisuals(0.016);
  }

  public startGame(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    this.clearInputs();
    this.phase = 'playing';
    this.activeHero = 'jinka';
    this.squadHp = 200;
    this.squadMaxHp = 200;
    this.barrier = 0;
    this.miasmaStacks = 0;
    this.resonance = 25;
    this.fightIqStacks = 0;
    this.retaliationsTriggered = 0;
    this.wave = 1;
    this.score = 0;
    this.combo = 0;
    this.damageTaken = 0;
    this.enemiesDefeated = 0;
    this.elapsedSeconds = 0;
    this.cooldowns = { strike: 0, ultimate: 0 };
    this.heroCooldowns = {
      maomi: { skillQ: 0, skillE: 0 },
      jinka: { skillQ: 0, skillE: 0 },
      laulan: { skillQ: 0, skillE: 0 },
    };
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.waveAdvanceTimer = 0;

    this.heroPositions.maomi = { x: -2.2, z: 6.2, yaw: Math.PI, walkPhase: 0, swingTimer: 0 };
    this.heroPositions.jinka = { x: 0, z: 5.2, yaw: Math.PI, walkPhase: 0, swingTimer: 0 };
    this.heroPositions.laulan = { x: 2.2, z: 6.2, yaw: Math.PI, walkPhase: 0, swingTimer: 0 };

    this.clearProjectiles();
    this.spawnWave(1);
    if (navigator.userActivation?.hasBeenActive) {
      wuxiaAudio.startAmbience();
    }
    this.syncBodyState();
    this.emitSnapshot();
  }

  public togglePause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.clearInputs();
      wuxiaAudio.stopAmbience();
      this.syncBodyState();
      this.emitSnapshot();
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.clearInputs();
      wuxiaAudio.startAmbience();
      this.syncBodyState();
      this.emitSnapshot();
    }
  }

  public returnToTitle(): void {
    this.phase = 'title';
    this.clearInputs();
    this.clearProjectiles();
    wuxiaAudio.stopAmbience();
    this.setupTitleShowcase();
    this.syncBodyState();
    this.emitSnapshot();
  }

  public switchHero(hero: HeroId): void {
    if (this.activeHero === hero) return;
    this.activeHero = hero;
    const pos = this.heroPositions[hero];
    this.spawnBurst(pos.x, 0.8, pos.z, HERO_ROSTER[hero].accentHex, 14);
    wuxiaAudio.playHeroSwitch(hero);
    this.bannerText = `${HERO_ROSTER[hero].name} takes point · ${HERO_ROSTER[hero].quote}`;
    this.emitSnapshot();
  }

  public triggerAction(action: 'strike' | 'skillQ' | 'skillE' | 'ultimate'): void {
    if (this.phase !== 'playing') return;
    this.bufferedAction = action;
    this.bufferTimer = 0.14;
  }

  public toggleMute(): boolean {
    const muted = wuxiaAudio.toggleMute();
    if (!muted && this.phase === 'playing') {
      wuxiaAudio.startAmbience();
    }
    this.emitSnapshot();
    return muted;
  }

  private clearInputs(): void {
    this.heldKeys.clear();
    this.justPressed.clear();
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.render(this.scene, this.camera);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
      return;
    }

    const code = e.code;
    if (!this.heldKeys.has(code)) {
      this.justPressed.add(code);
    }
    this.heldKeys.add(code);

    if (this.phase === 'title') {
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.phase === 'playing' || this.phase === 'paused') {
        e.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (this.phase !== 'playing') return;
    wuxiaAudio.startAmbience();

    if (code === 'Digit1') this.switchHero('maomi');
    else if (code === 'Digit2') this.switchHero('jinka');
    else if (code === 'Digit3') this.switchHero('laulan');
    else if (code === 'Space' || code === 'KeyJ') {
      e.preventDefault();
      this.triggerAction('strike');
    } else if (code === 'KeyQ') {
      this.triggerAction('skillQ');
    } else if (code === 'KeyE') {
      this.triggerAction('skillE');
    } else if (code === 'KeyR') {
      this.triggerAction('ultimate');
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  private clearEnemies(): void {
    for (const en of this.enemies) {
      this.scene.remove(en.rig.root);
      this.scene.remove(en.telegraphRing);
    }
    this.enemies = [];
  }

  private clearProjectiles(): void {
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  private spawnWave(waveNum: number): void {
    this.clearEnemies();
    const cfg = getWaveConfiguration(waveNum);
    this.bannerText = cfg.banner;

    const spawnPoints: Array<[number, number]> = [
      [-10, -8],
      [10, -8],
      [-7, -10],
      [7, -10],
      [-11, 2],
      [11, 2],
      [0, -10.5],
    ];
    let idx = 0;

    for (let i = 0; i < cfg.stalkers; i++) {
      const [sx, sz] = spawnPoints[idx++ % spawnPoints.length];
      this.spawnEnemy('stalker', sx, sz);
    }
    for (let i = 0; i < cfg.kunai; i++) {
      const [sx, sz] = spawnPoints[idx++ % spawnPoints.length];
      this.spawnEnemy('kunai', sx, sz);
    }
    for (let i = 0; i < cfg.sentinels; i++) {
      const [sx, sz] = spawnPoints[idx++ % spawnPoints.length];
      this.spawnEnemy('sentinel', sx, sz);
    }
    if (cfg.spawnBoss) {
      this.spawnEnemy('whitelady', 0, -10.8);
    }
  }

  private spawnEnemy(policy: EnemyPolicy, x: number, z: number): void {
    const rig = buildEnemyModel(policy, this.textures, this.isSoftwareGl);
    rig.root.position.set(x, 0, z);
    this.scene.add(rig.root);

    const teleGeo = new THREE.RingGeometry(0.85, 1.15, 24);
    teleGeo.rotateX(-Math.PI / 2);
    const teleMat = new THREE.MeshBasicMaterial({
      color: policy === 'whitelady' || policy === 'sentinel' ? 0x38bdf8 : 0xef4444,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const telegraphRing = new THREE.Mesh(teleGeo, teleMat);
    telegraphRing.position.set(x, 0.04, z);
    telegraphRing.visible = false;
    this.scene.add(telegraphRing);

    const maxHp =
      policy === 'whitelady' ? 380 : policy === 'sentinel' ? 120 : policy === 'kunai' ? 64 : 78;
    const speed =
      policy === 'whitelady' ? 2.6 : policy === 'sentinel' ? 2.5 : policy === 'kunai' ? 3.8 : 4.6;

    this.enemies.push({
      id: this.nextEnemyId++,
      policy,
      rig,
      x,
      z,
      vx: 0,
      vz: 0,
      hp: maxHp,
      maxHp,
      speed,
      strafeSign: this.nextEnemyId % 2 === 0 ? 1 : -1,
      state: 'approach',
      stateTimer: 0.6 + Math.random() * 0.8,
      hitFlashTimer: 0,
      stunTimer: 0,
      poisonTimer: 0,
      poisonTickTimer: 0,
      exposedTimer: 0,
      armorBrokenTimer: 0,
      koTimer: 0,
      walkPhase: Math.random() * Math.PI * 2,
      telegraphRing,
    });
  }

  private spawnProjectile(params: {
    fromPlayer: boolean;
    x: number;
    y: number;
    z: number;
    vx: number;
    vz: number;
    color: number;
    radius: number;
    damage: number;
    aoeRadius?: number;
    poisonBoss?: boolean;
    exposeOnHit?: boolean;
    isPoison?: boolean;
    life?: number;
  }): void {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.fromPlayer = params.fromPlayer;
    slot.x = params.x;
    slot.y = params.y;
    slot.z = params.z;
    slot.vx = params.vx;
    slot.vz = params.vz;
    slot.radius = params.radius;
    slot.damage = params.damage;
    slot.aoeRadius = params.aoeRadius ?? 0;
    slot.poisonBoss = params.poisonBoss ?? false;
    slot.exposeOnHit = params.exposeOnHit ?? false;
    slot.isPoison = params.isPoison ?? false;
    slot.life = params.life ?? 2.2;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(params.color);
    slot.mesh.scale.setScalar(params.radius * 2.2);
    slot.mesh.position.set(params.x, params.y, params.z);
    slot.mesh.visible = true;
  }

  private spawnBurst(x: number, y: number, z: number, hexColor: string | number, count: number): void {
    const col = new THREE.Color(hexColor);
    for (let i = 0; i < count; i++) {
      const s = this.sparks[this.sparkCursor];
      this.sparkCursor = (this.sparkCursor + 1) % this.sparks.length;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      s.active = true;
      s.x = x;
      s.y = y;
      s.z = z;
      s.vx = Math.cos(angle) * speed;
      s.vy = 2.0 + Math.random() * 4.0;
      s.vz = Math.sin(angle) * speed;
      s.maxLife = 0.35 + Math.random() * 0.3;
      s.life = s.maxLife;
      s.size = 0.7 + Math.random() * 1.1;
      s.color.copy(col);
    }
  }

  private startLoop(): void {
    const tick = () => {
      if (this.destroyed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTimeMs) / 1000;
      this.lastTimeMs = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt, now * 0.001);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, elapsed: number): void {
    // Always animate ambient world elements (petals, altar elixir, lanterns, sparks)
    this.updateAmbientWorld(dt, elapsed);
    this.updateSparks(dt);

    if (this.phase === 'title') {
      this.titleOrbitAngle += dt * 0.2;
      const desiredX = Math.sin(this.titleOrbitAngle) * 4.4;
      const desiredZ = 11.6 + Math.cos(this.titleOrbitAngle) * 1.1;
      _v1.set(desiredX, 3.85, desiredZ);
      _v2.set(0, 1.55, -1.6);
      const alpha = 1 - Math.exp(-3.5 * dt);
      this.camPos.lerp(_v1, alpha);
      this.camLook.lerp(_v2, alpha);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      this.updateHeroVisuals(dt);
      this.updateEnemyVisualsOnly(dt, elapsed);
      return;
    }

    if (this.phase !== 'playing') {
      return;
    }

    // Real-time trauma decay and hit flashes even during hitstop
    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.6);
    for (const en of this.enemies) {
      if (en.hitFlashTimer > 0) {
        en.hitFlashTimer -= dt;
        const flashIntensity = en.hitFlashTimer > 0 ? 0.9 : 0;
        for (const m of en.rig.hitFlashMaterials) {
          m.emissive.setHex(flashIntensity > 0 ? 0xffffff : 0x000000);
          m.emissiveIntensity = flashIntensity > 0 ? 0.7 : 0;
        }
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.updateCamera(dt);
      return;
    }

    this.elapsedSeconds += dt;

    // Cooldowns & Combo decay (per-hero Q/E cooldowns allow fluid squad switching)
    this.cooldowns.strike = Math.max(0, this.cooldowns.strike - dt);
    this.cooldowns.ultimate = Math.max(0, this.cooldowns.ultimate - dt);
    for (const id of HERO_ORDER) {
      this.heroCooldowns[id].skillQ = Math.max(0, this.heroCooldowns[id].skillQ - dt);
      this.heroCooldowns[id].skillE = Math.max(0, this.heroCooldowns[id].skillE - dt);
    }
    if (this.comboResetTimer > 0) {
      this.comboResetTimer -= dt;
      if (this.comboResetTimer <= 0) this.combo = 0;
    }

    // Miasma DOT tick (mitigated by Maomi's natural tolerance)
    if (this.miasmaStacks > 0) {
      this.miasmaTickTimer += dt;
      if (this.miasmaTickTimer >= 2.2) {
        this.miasmaTickTimer = 0;
        this.applyDamageToSquad(this.miasmaStacks * 2, true);
      }
    }

    // Player movement + companion formation
    this.updatePlayerMovement(dt);

    // Buffered Action Execution
    if (this.bufferedAction) {
      this.bufferTimer -= dt;
      if (this.executeBufferedAction(this.bufferedAction)) {
        this.bufferedAction = null;
      } else if (this.bufferTimer <= 0) {
        this.bufferedAction = null;
      }
    }

    // Enemies AI & Projectiles
    this.updateEnemies(dt, elapsed);
    this.updateProjectiles(dt);
    this.updateHeroVisuals(dt);
    this.updateCamera(dt);

    // Wave Check
    const aliveEnemies = this.enemies.filter((e) => e.state !== 'ko');
    if (aliveEnemies.length === 0 && this.enemies.length === 0) {
      if (this.wave < this.maxWaves) {
        this.waveAdvanceTimer += dt;
        if (this.waveAdvanceTimer >= 1.1) {
          this.waveAdvanceTimer = 0;
          this.wave++;
          this.spawnWave(this.wave);
          wuxiaAudio.playPickup();
          this.emitSnapshot();
        }
      } else {
        this.finishRun(true);
      }
    }

    this.justPressed.clear();

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.1) {
      this.hudSyncTimer = 0;
      this.emitSnapshot();
    }
  }

  private updateAmbientWorld(dt: number, elapsed: number): void {
    this.elixirOrb.rotation.y += dt * 1.4;
    this.elixirOrb.position.y = 1.38 + Math.sin(elapsed * 2.5) * 0.1;

    this.altarCrystals.forEach((c, idx) => {
      c.scale.y = 1 + Math.sin(elapsed * 2 + idx) * 0.06;
    });

    this.lanternLights.forEach((lt, idx) => {
      lt.intensity = 7.2 + Math.sin(elapsed * 3.5 + idx * 1.3) * 0.8;
    });

    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.y -= p.vy * dt;
      p.x += Math.sin(elapsed * 1.4 + p.swayPhase) * 0.65 * dt;
      p.z += Math.cos(elapsed * 1.1 + p.swayPhase) * 0.45 * dt;
      if (p.y < 0.08) {
        p.y = 9.5 + Math.random() * 2;
        p.x = (Math.random() - 0.5) * 30;
        p.z = (Math.random() - 0.5) * 28;
      }
      _euler.set(elapsed * p.rotSpeed, elapsed * p.rotSpeed * 0.7, p.swayPhase);
      _quat.setFromEuler(_euler);
      _v1.set(p.x, p.y, p.z);
      _scaleVec.setScalar(p.size);
      _mat4.compose(_v1, _quat, _scaleVec);
      this.petalMesh.setMatrixAt(i, _mat4);
    }
    this.petalMesh.instanceMatrix.needsUpdate = true;
  }

  private updateSparks(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.sparks.length; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      dirty = true;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        _mat4.makeScale(0, 0, 0);
        this.sparkMesh.setMatrixAt(i, _mat4);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.vy -= 9.0 * dt;
      const ratio = s.life / s.maxLife;
      _v1.set(s.x, Math.max(0.05, s.y), s.z);
      _quat.identity();
      _scaleVec.setScalar(s.size * ratio);
      _mat4.compose(_v1, _quat, _scaleVec);
      this.sparkMesh.setMatrixAt(i, _mat4);
      this.sparkMesh.setColorAt(i, s.color);
    }
    if (dirty) {
      this.sparkMesh.instanceMatrix.needsUpdate = true;
      if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  private updatePlayerMovement(dt: number): void {
    let moveX = 0;
    let moveZ = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveZ -= 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveZ += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;

    const leader = this.heroPositions[this.activeHero];
    const speed = HERO_ROSTER[this.activeHero].moveSpeed;
    const len = Math.hypot(moveX, moveZ);
    if (len > 0.01) {
      moveX /= len;
      moveZ /= len;
      const clamped = clampCourtyardPosition(leader.x + moveX * speed * dt, leader.z + moveZ * speed * dt);
      leader.x = clamped.x;
      leader.z = clamped.z;
      leader.yaw = Math.atan2(moveX, moveZ);
      leader.walkPhase += speed * dt * 2.1;
    } else {
      // Face nearest enemy smoothly when idle
      const nearest = this.findNearestEnemy(leader.x, leader.z);
      if (nearest) {
        leader.yaw = Math.atan2(nearest.x - leader.x, nearest.z - leader.z);
      }
    }

    // Companion heroes follow leader in triangular wuxia formation
    const otherIds = HERO_ORDER.filter((id) => id !== this.activeHero);
    const offsets: Array<[number, number]> = [
      [-2.1, 1.8],
      [2.1, 1.8],
    ];
    otherIds.forEach((cid, idx) => {
      const comp = this.heroPositions[cid];
      const target = clampCourtyardPosition(leader.x + offsets[idx][0], leader.z + offsets[idx][1]);
      const dx = target.x - comp.x;
      const dz = target.z - comp.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.25) {
        const step = Math.min(dist, HERO_ROSTER[cid].moveSpeed * 0.92 * dt);
        comp.x += (dx / dist) * step;
        comp.z += (dz / dist) * step;
        comp.yaw = Math.atan2(dx, dz);
        comp.walkPhase += step * 2.1;
      }
    });
  }

  private updateHeroVisuals(dt: number): void {
    const t = performance.now() * 0.001;
    HERO_ORDER.forEach((id, idx) => {
      const rig = this.heroRigs[id];
      const pos = this.heroPositions[id];
      rig.root.position.set(pos.x, 0, pos.z);
      rig.root.rotation.y = pos.yaw;
      rig.auraRing.rotation.z += dt * (id === this.activeHero ? 2.2 : 0.8);
      (rig.auraRing.material as THREE.MeshBasicMaterial).opacity =
        id === this.activeHero ? 0.85 : 0.25;
      rig.auraRing.scale.setScalar(id === this.activeHero ? 1.15 : 0.85);

      const bob = Math.sin(t * 2.6 + idx * 1.4) * 0.035;
      rig.bodyGroup.position.y = bob;

      const stride = Math.sin(pos.walkPhase) * 0.45;
      rig.leftLeg.rotation.x = stride;
      rig.rightLeg.rotation.x = -stride;

      const baseRightX = rig.idleRightArmX ?? -0.15;
      const baseRightZ = rig.idleRightArmZ ?? 0.08;
      const baseLeftX = rig.idleLeftArmX ?? -0.15;
      const baseLeftZ = rig.idleLeftArmZ ?? -0.08;

      if (pos.swingTimer > 0) {
        pos.swingTimer = Math.max(0, pos.swingTimer - dt);
        rig.rightArm.rotation.x = -Math.sin((pos.swingTimer / 0.24) * Math.PI) * 1.5;
        rig.rightArm.rotation.z = baseRightZ;
      } else {
        rig.rightArm.rotation.x = baseRightX - stride * 0.35;
        rig.rightArm.rotation.z = baseRightZ + Math.sin(t * 2.1 + idx) * 0.04;
      }
      rig.leftArm.rotation.x = baseLeftX + stride * 0.35;
      rig.leftArm.rotation.z = baseLeftZ - Math.sin(t * 2.1 + idx) * 0.04;

      // Sway hair strands, silk waist ribbons & Qi aura spirals
      rig.flowParts?.forEach((fp, fIdx) => {
        fp.rotation.z = Math.sin(t * 2.8 + fIdx * 0.9 + idx) * 0.06;
        fp.rotation.x = Math.cos(t * 2.2 + fIdx * 0.7) * 0.04;
      });

      // Orbit Jinka's floating scrolls
      rig.orbiters.forEach((orb, oIdx) => {
        const ang = t * 1.8 + (oIdx / rig.orbiters.length) * Math.PI * 2;
        orb.position.set(Math.cos(ang) * 0.76, 1.12 + Math.sin(t * 2.5 + oIdx) * 0.14, Math.sin(ang) * 0.76);
        orb.rotation.y = -ang + Math.PI / 2;
      });
    });
  }

  private executeBufferedAction(action: 'strike' | 'skillQ' | 'skillE' | 'ultimate'): boolean {
    const hero = HERO_ROSTER[this.activeHero];
    const pos = this.heroPositions[this.activeHero];
    const target = this.findNearestEnemy(pos.x, pos.z);
    const aimYaw = target ? Math.atan2(target.x - pos.x, target.z - pos.z) : pos.yaw;
    pos.yaw = aimYaw;
    const dirX = Math.sin(aimYaw);
    const dirZ = Math.cos(aimYaw);

    if (action === 'strike') {
      if (this.cooldowns.strike > 0) return false;
      this.cooldowns.strike = 0.28;
      pos.swingTimer = 0.24;
      wuxiaAudio.playStrike(this.activeHero);

      if (this.activeHero === 'laulan') {
        // Fan melee crescent arc + short shockwave
        this.damageEnemiesInArc(pos.x, pos.z, dirX, dirZ, hero.basicRange, 1.35, hero.basicDamage, 2.2);
        this.spawnBurst(pos.x + dirX * 1.4, 1.0, pos.z + dirZ * 1.4, '#f472b6', 10);
      } else {
        this.spawnProjectile({
          fromPlayer: true,
          x: pos.x + dirX * 0.6,
          y: 1.05,
          z: pos.z + dirZ * 0.6,
          vx: dirX * 17,
          vz: dirZ * 17,
          color: this.activeHero === 'maomi' ? 0x34d399 : 0x38bdf8,
          radius: 0.26,
          damage: hero.basicDamage,
        });
      }
      return true;
    }

    if (action === 'skillQ') {
      const activeCd = this.heroCooldowns[this.activeHero];
      if (activeCd.skillQ > 0) return false;
      activeCd.skillQ = hero.primarySkill.cooldown;
      pos.swingTimer = 0.24;
      wuxiaAudio.playSkillCast(this.activeHero);

      if (this.activeHero === 'maomi') {
        // Venom-Fang Stun: emerald vial splash that stuns & poisons enemies
        this.spawnProjectile({
          fromPlayer: true,
          x: pos.x + dirX * 0.6,
          y: 1.2,
          z: pos.z + dirZ * 0.6,
          vx: dirX * 14,
          vz: dirZ * 14,
          color: 0x10b981,
          radius: 0.36,
          damage: 36,
          aoeRadius: 3.4,
          poisonBoss: true,
        });
        this.bannerText = 'Maomi hurls Venom-Fang Stun: enemies stunned & poisoned!';
      } else if (this.activeHero === 'jinka') {
        // Tactical Insight: 3-Scroll Spread Volley exposing enemy weak spots (+35% DMG)
        [-0.24, 0, 0.24].forEach((spread) => {
          const a = aimYaw + spread;
          this.spawnProjectile({
            fromPlayer: true,
            x: pos.x + Math.sin(a) * 0.6,
            y: 1.1,
            z: pos.z + Math.cos(a) * 0.6,
            vx: Math.sin(a) * 18,
            vz: Math.cos(a) * 18,
            color: 0x60a5fa,
            radius: 0.28,
            damage: 22,
            exposeOnHit: true,
          });
        });
        this.bannerText = 'Jinka’s Tactical Insight exposes enemy weak spots (+35% Fight IQ DMG)!';
      } else {
        // Laulan Acupoint Piercer: pinpoint strike that interrupts enemy windups & breaks armor
        let interrupted = 0;
        for (const en of this.enemies) {
          if (en.state === 'ko') continue;
          const dx = en.x - pos.x;
          const dz = en.z - pos.z;
          const dist = Math.hypot(dx, dz) || 0.001;
          if (dist <= 5.2) {
            const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
            if (dot >= -0.25 || dist <= 2.4) {
              if (en.state === 'windup') {
                en.state = 'recover';
                en.stateTimer = 1.4;
                en.telegraphRing.visible = false;
                en.stunTimer = Math.max(en.stunTimer, 1.3);
                interrupted++;
              }
              en.armorBrokenTimer = 4.5;
              this.damageEnemy(en, 46, (dx / dist) * 3.6, (dz / dist) * 3.6, true);
            }
          }
        }
        this.spawnBurst(pos.x + dirX * 2.0, 1.0, pos.z + dirZ * 2.0, '#f472b6', 20);
        wuxiaAudio.playHeavyImpact();
        this.bannerText =
          interrupted > 0
            ? `Laulan’s Acupoint Piercer interrupts ${interrupted} telegraph(s) & shatters armor!`
            : 'Laulan strikes enemy meridians with pinpoint Acupoint Piercer!';
      }
      this.resonance = addResonance(this.resonance, 18);
      this.emitSnapshot();
      return true;
    }

    if (action === 'skillE') {
      const activeCd = this.heroCooldowns[this.activeHero];
      if (activeCd.skillE > 0) return false;
      activeCd.skillE = hero.secondarySkill.cooldown;
      wuxiaAudio.playSkillCast(this.activeHero);

      if (this.activeHero === 'maomi') {
        const healed = applyHealingAndCleanse(this.squadHp, this.squadMaxHp, 38, true, this.miasmaStacks);
        this.squadHp = healed.nextHp;
        this.miasmaStacks = healed.nextMiasma;
        this.spawnBurst(pos.x, 1.0, pos.z, '#34d399', 24);
        if (healed.cleansedStacks > 0) {
          // Qi Yang's overdose flaw: purified toxins erupt outward as poison on nearby foes
          const surgeDmg = 18 + healed.cleansedStacks * 10;
          for (const en of this.enemies) {
            if (en.state !== 'ko' && Math.hypot(en.x - pos.x, en.z - pos.z) <= 5.8) {
              en.poisonTimer = 4.5;
              this.damageEnemy(en, surgeDmg, 0, 0, true);
            }
          }
          this.bannerText = `Maomi purges ${healed.cleansedStacks} Miasma into a lethal Qi Yang poison surge!`;
        } else {
          this.bannerText = 'Maomi’s Tolerance Purge restores +38 Squad HP & fortifies the squad!';
        }
      } else if (this.activeHero === 'jinka') {
        // Grand Plan Seal: accelerates all squad cooldowns by 35%, exposes & slows/breaks nearby enemies
        for (const id of HERO_ORDER) {
          this.heroCooldowns[id].skillQ = Number((this.heroCooldowns[id].skillQ * 0.65).toFixed(2));
          if (id !== 'jinka') {
            this.heroCooldowns[id].skillE = Number((this.heroCooldowns[id].skillE * 0.65).toFixed(2));
          }
        }
        let sealed = 0;
        for (const en of this.enemies) {
          if (en.state === 'ko') continue;
          const d = Math.hypot(en.x - pos.x, en.z - pos.z);
          if (d <= 6.8) {
            en.stunTimer = Math.max(en.stunTimer, 1.8);
            en.exposedTimer = 5.5;
            en.armorBrokenTimer = 5.0;
            this.damageEnemy(en, 24, 0, 0, false);
            sealed++;
          }
        }
        this.spawnBurst(pos.x, 0.8, pos.z, '#38bdf8', 24);
        this.bannerText =
          sealed > 0
            ? `Jinka’s Grand Plan Seal breaks ${sealed} foes & accelerates squad cooldowns (-35%)!`
            : 'Jinka inscribes Grand Plan Seal (-35% squad cooldowns)!';
      } else {
        // Laulan Meridian Counter: dash +35 Ward, build Fight IQ & trigger counter-strike
        const dashed = clampCourtyardPosition(pos.x + dirX * 4.5, pos.z + dirZ * 4.5);
        pos.x = dashed.x;
        pos.z = dashed.z;
        this.barrier += 35;
        this.fightIqStacks = Math.min(5, this.fightIqStacks + 2);
        this.damageEnemiesInArc(pos.x, pos.z, dirX, dirZ, 3.8, 3.4, 28, 2.5);
        this.spawnBurst(pos.x, 1.0, pos.z, '#fbcfe8', 22);
        this.bannerText = 'Laulan’s Meridian Counter grants +35 Ward & primes Squad Retaliation!';
      }
      this.resonance = addResonance(this.resonance, 18);
      this.emitSnapshot();
      return true;
    }

    if (action === 'ultimate') {
      if (this.resonance < 100) return false;
      this.resonance = 0;
      this.cooldowns.ultimate = 1.5;
      wuxiaAudio.playSkillCast(this.activeHero, true);
      wuxiaAudio.playHeavyImpact();
      this.hitstopTimer = 0.065;
      this.cameraTrauma = Math.min(1.0, this.cameraTrauma + 0.72);

      // Tri-Qi Resonance: Squad burst damages all courtyard enemies & breaks White Lady ward
      for (const en of this.enemies) {
        if (en.state === 'ko') continue;
        en.armorBrokenTimer = 4.0;
        this.damageEnemy(en, 88, 0, 0, true);
      }
      const healed = applyHealingAndCleanse(this.squadHp, this.squadMaxHp, 25, true, this.miasmaStacks);
      this.squadHp = healed.nextHp;
      this.miasmaStacks = healed.nextMiasma;
      this.spawnBurst(pos.x, 1.3, pos.z, '#fbbf24', 36);
      this.bannerText = 'TRI-QI RESONANCE! Maomi, Jinka & Laulan unleash pure medicinal light!';
      this.emitSnapshot();
      return true;
    }

    return false;
  }

  private findNearestEnemy(x: number, z: number): EnemyEntity | null {
    let best: EnemyEntity | null = null;
    let bestDist = Infinity;
    for (const en of this.enemies) {
      if (en.state === 'ko') continue;
      const d = Math.hypot(en.x - x, en.z - z);
      if (d < bestDist) {
        bestDist = d;
        best = en;
      }
    }
    return best;
  }

  private damageEnemiesInArc(
    ox: number,
    oz: number,
    dirX: number,
    dirZ: number,
    range: number,
    minDotOrRadius: number,
    dmg: number,
    knockback: number
  ): void {
    let hitAny = false;
    for (const en of this.enemies) {
      if (en.state === 'ko') continue;
      const dx = en.x - ox;
      const dz = en.z - oz;
      const dist = Math.hypot(dx, dz) || 0.001;
      if (dist <= range) {
        const dot = (dx / dist) * dirX + (dz / dist) * dirZ;
        if (dot >= -0.25 || dist <= minDotOrRadius) {
          this.damageEnemy(en, dmg, (dx / dist) * knockback, (dz / dist) * knockback, dmg >= 35);
          hitAny = true;
        }
      }
    }
    if (hitAny) {
      wuxiaAudio.playHeavyImpact();
    }
  }

  private damageEnemy(
    en: EnemyEntity,
    rawDmg: number,
    kbX: number,
    kbZ: number,
    heavy: boolean
  ): void {
    const escortAlive = this.enemies.some((other) => other.state !== 'ko' && other.policy !== 'whitelady');
    const shieldMult = en.policy === 'whitelady' && escortAlive ? 0.5 : 1.0;
    const armorMult = en.armorBrokenTimer > 0 ? 1.35 : 1.0;

    const synergy = computeSynergyRetaliation({
      baseDamage: rawDmg,
      targetPoisoned: en.poisonTimer > 0,
      targetExposed: en.exposedTimer > 0,
      fightIqStacks: this.fightIqStacks,
    });
    this.fightIqStacks = synergy.nextFightIqStacks;

    const finalDmg = Math.max(4, Math.round(synergy.finalDamage * shieldMult * armorMult));

    en.hp -= finalDmg;
    en.hitFlashTimer = 0.08;
    const clamped = clampCourtyardPosition(en.x + kbX * 0.35, en.z + kbZ * 0.35);
    en.x = clamped.x;
    en.z = clamped.z;

    this.combo++;
    this.comboResetTimer = 3.2;
    this.resonance = addResonance(this.resonance, heavy || synergy.triggeredRetaliation ? 13 : 8);
    this.score += finalDmg * 2;
    this.spawnBurst(en.x, 1.1, en.z, en.policy === 'whitelady' ? '#67e8f9' : '#f43f5e', heavy ? 16 : 8);

    if (synergy.triggeredRetaliation) {
      this.retaliationsTriggered++;
      this.spawnBurst(en.x, 1.45, en.z, '#fbbf24', 22);
      wuxiaAudio.playHeavyImpact();
      this.bannerText = 'SQUAD RETALIATION! Fight IQ teamwork strikes the enemy’s poisoned/exposed flaw!';
    }

    if (heavy || synergy.triggeredRetaliation) {
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.04);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.28);
    }

    if (en.hp <= 0 && en.state !== 'ko') {
      en.hp = 0;
      en.state = 'ko';
      en.koTimer = 0.38;
      en.telegraphRing.visible = false;
      this.enemiesDefeated++;
      this.score += en.policy === 'whitelady' ? 1000 : 120;
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.4);
      this.spawnBurst(en.x, 1.2, en.z, '#fbbf24', 22);
    }
  }

  private applyDamageToSquad(dmg: number, isPoisonOrMiasma = false): void {
    const res = applySquadDamage(this.squadHp, this.barrier, dmg, isPoisonOrMiasma, this.activeHero);
    this.squadHp = res.nextHp;
    this.barrier = res.nextBarrier;
    this.damageTaken += res.hpDamageTaken;
    if (res.mitigatedByResistance > 0 && isPoisonOrMiasma) {
      const pos = this.heroPositions[this.activeHero];
      this.spawnBurst(pos.x, 1.15, pos.z, '#10b981', 8);
    }
    if (res.hpDamageTaken > 0) {
      this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.45);
      wuxiaAudio.playPlayerHit();
      const pos = this.heroPositions[this.activeHero];
      this.spawnBurst(pos.x, 1.0, pos.z, '#ef4444', 12);
    }
    if (res.defeated) {
      this.finishRun(false);
    }
  }

  private updateEnemyVisualsOnly(dt: number, elapsed: number): void {
    for (const en of this.enemies) {
      en.rig.root.position.set(en.x, 0, en.z);
      en.rig.flowParts?.forEach((fp, fIdx) => {
        fp.rotation.z = Math.sin(elapsed * 3.1 + fIdx * 0.8) * 0.07;
      });
      if (en.policy === 'whitelady') {
        en.rig.bodyGroup.position.y = 0.45 + Math.sin(elapsed * 2.2) * 0.2;
        en.rig.orbiters.forEach((c, idx) => {
          const a = elapsed * 1.4 + (idx / en.rig.orbiters.length) * Math.PI * 2;
          c.position.set(Math.cos(a) * 1.3, 1.7 + Math.sin(elapsed * 2.5 + idx) * 0.25, Math.sin(a) * 1.3);
          c.rotation.y += dt * 1.8;
        });
      }
    }
  }

  private updateEnemies(dt: number, elapsed: number): void {
    const leader = this.heroPositions[this.activeHero];
    // Attack token pool: cap simultaneous enemy attacks/windups at 3 for fair, readable combat
    let activeTokens = this.enemies.filter((e) => e.state === 'windup' || e.state === 'attack').length;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];

      if (en.state === 'ko') {
        en.koTimer -= dt;
        const frac = Math.max(0, en.koTimer / 0.38);
        en.rig.root.scale.setScalar(frac);
        en.rig.root.rotation.x = (1 - frac) * 1.2;
        if (en.koTimer <= 0) {
          this.scene.remove(en.rig.root);
          this.scene.remove(en.telegraphRing);
          this.enemies.splice(i, 1);
        }
        continue;
      }

      if (en.armorBrokenTimer > 0) en.armorBrokenTimer -= dt;
      if (en.exposedTimer > 0) en.exposedTimer -= dt;
      if (en.poisonTimer > 0) {
        en.poisonTimer -= dt;
        en.poisonTickTimer += dt;
        if (en.poisonTickTimer >= 1.0) {
          en.poisonTickTimer = 0;
          en.hp -= 6;
          en.hitFlashTimer = 0.05;
          this.spawnBurst(en.x, 1.05, en.z, '#10b981', 6);
          if (en.hp <= 0) {
            en.hp = 0;
            en.state = 'ko';
            en.koTimer = 0.38;
            en.telegraphRing.visible = false;
            this.enemiesDefeated++;
            this.score += en.policy === 'whitelady' ? 1000 : 120;
            continue;
          }
        }
      }

      if (en.stunTimer > 0) {
        en.stunTimer -= dt;
        en.telegraphRing.visible = false;
        en.rig.root.position.set(en.x, 0, en.z);
        continue;
      }

      const steer = computeEnemyDesiredVelocity({
        policy: en.policy,
        ex: en.x,
        ez: en.z,
        px: leader.x,
        pz: leader.z,
        speed: en.speed,
        dt,
        strafeSign: en.strafeSign,
        state: en.state,
      });

      // Face player
      en.rig.root.rotation.y = Math.atan2(leader.x - en.x, leader.z - en.z);

      if (en.state === 'approach') {
        const clamped = clampCourtyardPosition(en.x + steer.vx * dt, en.z + steer.vz * dt);
        en.x = clamped.x;
        en.z = clamped.z;
        en.walkPhase += Math.hypot(steer.vx, steer.vz) * dt * 1.8;
        en.stateTimer -= dt;

        const readyToStrike =
          (en.policy === 'stalker' && steer.dist <= 2.35) ||
          (en.policy === 'sentinel' && steer.dist <= 3.1) ||
          (en.policy === 'kunai' && steer.dist <= 11.5 && en.stateTimer <= 0) ||
          (en.policy === 'whitelady' && en.stateTimer <= 0);

        if (readyToStrike && activeTokens < 3) {
          en.state = 'windup';
          activeTokens++;
          en.stateTimer = en.policy === 'sentinel' || en.policy === 'whitelady' ? 0.72 : 0.48;
          en.telegraphRing.visible = true;
          en.telegraphRing.position.set(en.x, 0.04, en.z);
          if (en.policy === 'whitelady') {
            wuxiaAudio.playBossTelegraph();
          }
        }
      } else if (en.state === 'windup') {
        en.stateTimer -= dt;
        const pulse = 1.0 + Math.sin(elapsed * 22) * 0.22;
        en.telegraphRing.scale.setScalar(en.policy === 'whitelady' ? pulse * 1.8 : pulse);
        en.telegraphRing.position.set(en.x, 0.04, en.z);

        if (en.stateTimer <= 0) {
          en.state = 'recover';
          en.stateTimer = en.policy === 'whitelady' ? 1.55 : 1.15;
          en.telegraphRing.visible = false;

          if (en.policy === 'stalker') {
            if (steer.dist <= 2.65) {
              this.applyDamageToSquad(14);
            }
          } else if (en.policy === 'sentinel') {
            this.spawnBurst(en.x, 0.35, en.z, '#38bdf8', 18);
            if (steer.dist <= 3.55) {
              this.applyDamageToSquad(22);
            }
          } else if (en.policy === 'kunai') {
            const dx = leader.x - en.x;
            const dz = leader.z - en.z;
            const d = Math.hypot(dx, dz) || 1;
            this.spawnProjectile({
              fromPlayer: false,
              x: en.x,
              y: 1.1,
              z: en.z,
              vx: (dx / d) * 11.5,
              vz: (dz / d) * 11.5,
              color: 0xc084fc,
              radius: 0.22,
              damage: 13,
            });
          } else if (en.policy === 'whitelady') {
            // 5-orb Frost Spiral fan toward player
            const baseYaw = Math.atan2(leader.x - en.x, leader.z - en.z);
            [-0.4, -0.2, 0, 0.2, 0.4].forEach((offset) => {
              const a = baseYaw + offset;
              this.spawnProjectile({
                fromPlayer: false,
                x: en.x,
                y: 1.5,
                z: en.z,
                vx: Math.sin(a) * 10.5,
                vz: Math.cos(a) * 10.5,
                color: 0x67e8f9,
                radius: 0.28,
                damage: 16,
                isPoison: true,
              });
            });
            this.miasmaStacks = Math.min(4, this.miasmaStacks + 1);
          }
        }
      } else if (en.state === 'recover') {
        en.stateTimer -= dt;
        if (en.stateTimer <= 0) {
          en.state = 'approach';
          en.stateTimer = en.policy === 'whitelady' ? 1.4 : 1.1;
        }
      }

      // Apply rig position & limb motion
      en.rig.root.position.set(en.x, 0, en.z);
      en.rig.flowParts?.forEach((fp, fIdx) => {
        fp.rotation.z = Math.sin(elapsed * 3.2 + fIdx * 0.85) * 0.07;
      });
      if (en.policy === 'whitelady') {
        en.rig.bodyGroup.position.y = 0.45 + Math.sin(elapsed * 2.2) * 0.2;
        en.rig.orbiters.forEach((c, idx) => {
          const a = elapsed * 1.4 + (idx / en.rig.orbiters.length) * Math.PI * 2;
          c.position.set(Math.cos(a) * 1.3, 1.7 + Math.sin(elapsed * 2.5 + idx) * 0.25, Math.sin(a) * 1.3);
          c.rotation.y += dt * 1.8;
        });
      } else {
        const stride = Math.sin(en.walkPhase) * 0.45;
        en.rig.leftLeg.rotation.x = stride;
        en.rig.rightLeg.rotation.x = -stride;
        en.rig.rightArm.rotation.x = en.state === 'windup' ? -1.4 : -stride * 0.4;
      }
    }
  }

  private updateProjectiles(dt: number): void {
    const leader = this.heroPositions[this.activeHero];
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      if (p.life <= 0 || Math.abs(p.x) > 17 || Math.abs(p.z) > 17) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      if (p.fromPlayer) {
        for (const en of this.enemies) {
          if (en.state === 'ko') continue;
          const hitDist = en.policy === 'whitelady' ? 1.35 : 0.95;
          if (Math.hypot(en.x - p.x, en.z - p.z) <= hitDist + p.radius) {
            if (p.aoeRadius > 0) {
              for (const other of this.enemies) {
                if (other.state !== 'ko' && Math.hypot(other.x - p.x, other.z - p.z) <= p.aoeRadius) {
                  if (p.poisonBoss) {
                    other.stunTimer = Math.max(other.stunTimer, 2.4);
                    other.poisonTimer = 5.0;
                  }
                  this.damageEnemy(other, p.damage, 0, 0, true);
                }
              }
              this.spawnBurst(p.x, 1.0, p.z, '#10b981', 20);
              wuxiaAudio.playHeavyImpact();
            } else {
              if (p.exposeOnHit) {
                en.exposedTimer = 5.5;
              }
              this.damageEnemy(en, p.damage, p.vx * 0.12, p.vz * 0.12, false);
            }
            p.active = false;
            p.mesh.visible = false;
            break;
          }
        }
      } else {
        if (Math.hypot(leader.x - p.x, leader.z - p.z) <= 0.72 + p.radius) {
          this.applyDamageToSquad(p.damage, p.isPoison);
          p.active = false;
          p.mesh.visible = false;
        }
      }
    }
  }

  private updateCamera(dt: number): void {
    const leader = this.heroPositions[this.activeHero];
    const shakeMag = this.cameraTrauma * this.cameraTrauma * 0.45;
    const shakeX = (Math.random() - 0.5) * shakeMag;
    const shakeY = (Math.random() - 0.5) * shakeMag;

    _v1.set(leader.x * 0.65, 11.4, leader.z + 11.8);
    _v2.set(leader.x * 0.75, 1.2, leader.z - 2.6);

    const alpha = 1 - Math.exp(-6.5 * dt);
    this.camPos.lerp(_v1, alpha);
    this.camLook.lerp(_v2, alpha);

    this.camera.position.set(this.camPos.x + shakeX, this.camPos.y + shakeY, this.camPos.z);
    this.camera.lookAt(this.camLook);
  }

  private finishRun(victory: boolean): void {
    if (this.phase === 'victory' || this.phase === 'defeat') return;
    this.phase = victory ? 'victory' : 'defeat';
    this.clearInputs();
    wuxiaAudio.stopAmbience();
    if (victory) {
      wuxiaAudio.playVictoryFanfare();
      this.bannerText = 'The White Lady yields! The forbidden Elixir of Immunity is safe!';
    } else {
      wuxiaAudio.playDefeatSting();
      this.bannerText = 'Overcome by frost and shadow. Regroup and cleanse the courtyard!';
    }
    this.score = calculateFinalScore({
      squadHp: this.squadHp,
      elapsedSeconds: this.elapsedSeconds,
      damageTaken: this.damageTaken,
      enemiesDefeated: this.enemiesDefeated,
      retaliationsTriggered: this.retaliationsTriggered,
      victory,
    });
    this.syncBodyState();
    this.emitSnapshot();
  }

  private emitSnapshot(): void {
    const boss = this.enemies.find((e) => e.policy === 'whitelady' && e.state !== 'ko');
    const escortCount = this.enemies.filter((e) => e.state !== 'ko' && e.policy !== 'whitelady').length;
    this.onSnapshot({
      phase: this.phase,
      activeHero: this.activeHero,
      squadHp: Math.round(this.squadHp),
      squadMaxHp: this.squadMaxHp,
      barrier: Math.round(this.barrier),
      miasmaStacks: this.miasmaStacks,
      resonance: Math.round(this.resonance),
      fightIqStacks: this.fightIqStacks,
      retaliationsTriggered: this.retaliationsTriggered,
      wave: this.wave,
      maxWaves: this.maxWaves,
      enemiesRemaining: this.enemies.filter((e) => e.state !== 'ko').length,
      bossHp: boss ? Math.round(boss.hp) : 0,
      bossMaxHp: boss ? boss.maxHp : 380,
      bossActive: Boolean(boss),
      bossShielded: Boolean(boss && escortCount > 0),
      bossTelegraph: boss && boss.state === 'windup' ? 'Cursed Serpent Frost Spiral!' : '',
      score: Math.round(this.score),
      combo: this.combo,
      damageTaken: Math.round(this.damageTaken),
      elapsedSeconds: Math.round(this.elapsedSeconds),
      cooldowns: {
        strike: Number(this.cooldowns.strike.toFixed(1)),
        skillQ: Number(this.heroCooldowns[this.activeHero].skillQ.toFixed(1)),
        skillE: Number(this.heroCooldowns[this.activeHero].skillE.toFixed(1)),
        ultimate: Number(this.cooldowns.ultimate.toFixed(1)),
      },
      bannerText: this.bannerText,
      muted: wuxiaAudio.isMuted(),
    });
  }

  public destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    wuxiaAudio.stopAmbience();

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('visibilitychange', this.onVisibilityBound);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          m.dispose();
        });
      }
    });
    this.textures.stoneColor.dispose();
    this.textures.stoneBump.dispose();
    this.textures.woodColor.dispose();
    this.textures.scrollRune.dispose();
    this.textures.serpentScale.dispose();
    this.textures.contactShadow.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
