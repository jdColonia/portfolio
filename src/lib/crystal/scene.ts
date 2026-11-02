import {
  AmbientLight,
  Color,
  DirectionalLight,
  Euler,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { gsap } from 'gsap';
import type { LayerName } from '@lib/motion';

const GRID = 6;
const COUNT = GRID * GRID * GRID;
const CUBE_SIZE = 0.32;
const CAMERA_Z = 12;
const FOV = 35;

interface LayerState {
  pos: Float32Array; // COUNT * 3
  quat: Float32Array; // COUNT * 4
  scale: Float32Array; // COUNT
  color: Float32Array; // COUNT * 3 (linear)
  glow: Float32Array; // COUNT (emissive amount, multiplies the instance color)
  metalness: number;
  roughness: number;
  float: number; // amplitude of the idle float (0 or 1)
  groupScale: number;
  tiltX: number; // group rotation around x, radians (leans the chart toward the camera)
  sway: number; // 0 = endless spin around y, 1 = gentle sway facing the camera
}

export interface CrystalOptions {
  initialLayer?: LayerName;
  /** Called once when the first rendered frames average above the budget (slow GPU/device). */
  onSlow?: () => void;
}

export interface Crystal {
  destroy: () => void;
  /** Stop rendering (e.g. while the canvas is kept alive but hidden). */
  pause: () => void;
  /** Resume rendering after pause(). */
  resume: () => void;
  /** Morph to the given layer (no-op when already there). */
  setLayer: (layer: LayerName) => void;
}

/** Average frame time (ms) over the first GUARD_FRAMES rendered frames above which we bail out. */
const GUARD_FRAMES = 40;
const GUARD_MAX_AVG_MS = 22;
/** Pixel ratio cap, and how long after the last scroll event the full ratio comes back. */
const MAX_DPR = 1.5;
const SCROLL_IDLE_MS = 200;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createState(): LayerState {
  return {
    pos: new Float32Array(COUNT * 3),
    quat: new Float32Array(COUNT * 4),
    scale: new Float32Array(COUNT).fill(1),
    color: new Float32Array(COUNT * 3),
    glow: new Float32Array(COUNT),
    metalness: 0.5,
    roughness: 0.5,
    float: 0,
    groupScale: 1,
    tiltX: 0,
    sway: 0,
  };
}

function setColor(state: LayerState, i: number, color: Color): void {
  state.color[i * 3] = color.r;
  state.color[i * 3 + 1] = color.g;
  state.color[i * 3 + 2] = color.b;
}

function setIdentityQuat(state: LayerState, i: number): void {
  state.quat[i * 4] = 0;
  state.quat[i * 4 + 1] = 0;
  state.quat[i * 4 + 2] = 0;
  state.quat[i * 4 + 3] = 1;
}

function setQuat(state: LayerState, i: number, q: Quaternion): void {
  state.quat[i * 4] = q.x;
  state.quat[i * 4 + 1] = q.y;
  state.quat[i * 4 + 2] = q.z;
  state.quat[i * 4 + 3] = q.w;
}

function setPos(state: LayerState, i: number, x: number, y: number, z: number): void {
  state.pos[i * 3] = x;
  state.pos[i * 3 + 1] = y;
  state.pos[i * 3 + 2] = z;
}

function buildStates(): Record<LayerName, LayerState> {
  const rng = mulberry32(7);
  const lava = new Color('#FF3621');
  const tmpColor = new Color();
  const tmpQuat = new Quaternion();
  const tmpEuler = new Euler();

  // raw: scattered cloud of dark cubes, a few lava sparks.
  const raw = createState();
  raw.metalness = 0.1;
  raw.roughness = 0.75;
  raw.float = 1;
  raw.groupScale = 1;
  for (let i = 0; i < COUNT; i++) {
    const u = rng();
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const r = 3.2 * Math.cbrt(u);
    setPos(
      raw,
      i,
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    tmpEuler.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    setQuat(raw, i, tmpQuat.setFromEuler(tmpEuler));
    raw.scale[i] = 0.6 + rng() * 0.5;
    if (rng() < 0.1) {
      setColor(raw, i, lava);
    } else {
      tmpColor.set('#2A3A40').offsetHSL(0, 0, (rng() - 0.5) * 0.04);
      setColor(raw, i, tmpColor);
    }
  }

  // bronze: three flat slabs.
  const bronze = createState();
  bronze.metalness = 0.8;
  bronze.roughness = 0.35;
  bronze.groupScale = 1.25;
  const perSlab = COUNT / 3; // 72 => 9 x 8
  for (let i = 0; i < COUNT; i++) {
    const slab = Math.floor(i / perSlab);
    const j = i % perSlab;
    const gx = j % 9;
    const gz = Math.floor(j / 9);
    setPos(
      bronze,
      i,
      (gx - 4) * 0.37 + (rng() - 0.5) * 0.03,
      (slab - 1) * 1 + (rng() - 0.5) * 0.06,
      (gz - 3.5) * 0.37 + (rng() - 0.5) * 0.03
    );
    tmpEuler.set((rng() - 0.5) * 0.08, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.08);
    setQuat(bronze, i, tmpQuat.setFromEuler(tmpEuler));
    tmpColor.set('#B87333').offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    setColor(bronze, i, tmpColor);
  }

  // silver: tight cube lattice.
  const silver = createState();
  silver.metalness = 1;
  silver.roughness = 0.2;
  silver.groupScale = 1.9;
  const silverColor = new Color('#A9B4BC');
  for (let i = 0; i < COUNT; i++) {
    const ix = i % GRID;
    const iy = Math.floor(i / GRID) % GRID;
    const iz = Math.floor(i / (GRID * GRID));
    setPos(silver, i, (ix - 2.5) * 0.36, (iy - 2.5) * 0.36, (iz - 2.5) * 0.36);
    setIdentityQuat(silver, i);
    setColor(silver, i, silverColor);
  }

  // gold: bar chart, 6 columns x 3 rows, heights trending up from left to right.
  const gold = createState();
  gold.metalness = 0.9;
  gold.roughness = 0.25;
  gold.groupScale = 1.4;
  gold.tiltX = 0.35;
  gold.sway = 1;
  const goldColor = new Color('#E3B341');
  const barHeights = [
    [2, 3, 3, 4, 5, 6],
    [1, 2, 4, 4, 5, 5],
    [1, 1, 2, 3, 4, 6],
  ];
  const BAR_SPACING = 0.5;
  const BAR_STEP = 0.36;
  const BAR_BASE_Y = -1.05;
  let next = 0;
  barHeights.forEach((row, rowIndex) => {
    row.forEach((height, column) => {
      for (let level = 0; level < height && next < COUNT; level++) {
        const i = next++;
        setPos(
          gold,
          i,
          (column - (row.length - 1) / 2) * BAR_SPACING,
          BAR_BASE_Y + level * BAR_STEP,
          (rowIndex - (barHeights.length - 1) / 2) * BAR_SPACING
        );
        setIdentityQuat(gold, i);
        gold.scale[i] = 1;
        const isTop = level === height - 1;
        setColor(gold, i, isTop ? lava : goldColor);
        gold.glow[i] = isTop ? 0.6 : 0;
      }
    });
  });
  // Unused instances stay invisible, parked at the base of the chart.
  for (let i = next; i < COUNT; i++) {
    setPos(gold, i, 0, BAR_BASE_Y, 0);
    setIdentityQuat(gold, i);
    gold.scale[i] = 0;
    setColor(gold, i, goldColor);
  }

  // serve: a tilted ring of glowing cubes orbits an empty center, which frames the centered
  // contact text instead of hiding behind it.
  const serve = createState();
  serve.metalness = 0.2;
  serve.roughness = 0.4;
  serve.groupScale = 1;
  serve.tiltX = 0.45;
  const RING_COUNT = 96;
  const RING_RADIUS = 3.1;
  for (let i = 0; i < COUNT; i++) {
    const angle = ((i % RING_COUNT) / RING_COUNT) * Math.PI * 2;
    const radius = RING_RADIUS + (rng() - 0.5) * 0.5;
    setPos(serve, i, radius * Math.cos(angle), (rng() - 0.5) * 0.3, radius * Math.sin(angle));
    tmpEuler.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
    setQuat(serve, i, tmpQuat.setFromEuler(tmpEuler));
    setColor(serve, i, lava);
    // Instances past the ring stay invisible on it.
    serve.scale[i] = i < RING_COUNT ? 0.5 + rng() * 0.45 : 0;
    serve.glow[i] = 0.4 + rng() * 0.6;
  }

  return { raw, bronze, silver, gold, serve };
}

function copyState(target: LayerState, source: LayerState): void {
  target.pos.set(source.pos);
  target.quat.set(source.quat);
  target.scale.set(source.scale);
  target.color.set(source.color);
  target.glow.set(source.glow);
  target.metalness = source.metalness;
  target.roughness = source.roughness;
  target.float = source.float;
  target.groupScale = source.groupScale;
  target.tiltX = source.tiltX;
  target.sway = source.sway;
}

export async function createCrystal(
  canvas: HTMLCanvasElement,
  options: CrystalOptions = {}
): Promise<Crystal> {
  const states = buildStates();
  const initial: LayerName = options.initialLayer ?? 'raw';

  const renderer = new WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
  });
  const baseDpr = Math.min(window.devicePixelRatio, MAX_DPR);
  let dpr = baseDpr;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, CAMERA_Z);

  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.9;

  const key = new DirectionalLight(0xffffff, 1.2);
  key.position.set(3, 5, 4);
  scene.add(key);
  scene.add(new AmbientLight(0xffffff, 0.35));

  const geometry = new RoundedBoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE, 2, 0.04);
  const glowAttribute = new InstancedBufferAttribute(new Float32Array(COUNT), 1);
  geometry.setAttribute('aGlow', glowAttribute);

  const material = new MeshStandardMaterial({
    color: 0xffffff,
    metalness: states[initial].metalness,
    roughness: states[initial].roughness,
  });
  // Per-instance emissive: glow * instance color, so caps and the serve core can shine
  // while the rest of the lattice stays lit by the environment only.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float aGlow;\nvarying float vGlow;'
      )
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * vGlow;'
      );
  };

  const mesh = new InstancedMesh(geometry, material, COUNT);
  mesh.frustumCulled = false;
  mesh.setColorAt(0, new Color());

  const group = new Group();
  group.add(mesh);
  const pivot = new Group();
  pivot.add(group);
  scene.add(pivot);

  // Current (interpolated) state: always the source of truth for the next transition.
  const current = createState();
  copyState(current, states[initial]);

  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scaleVec = new Vector3();
  const color = new Color();

  const applyAppearance = () => {
    for (let i = 0; i < COUNT; i++) {
      color.setRGB(current.color[i * 3], current.color[i * 3 + 1], current.color[i * 3 + 2]);
      mesh.setColorAt(i, color);
      glowAttribute.setX(i, current.glow[i]);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    glowAttribute.needsUpdate = true;
    material.metalness = current.metalness;
    material.roughness = current.roughness;
  };

  const applyMatrices = (time: number) => {
    for (let i = 0; i < COUNT; i++) {
      const bob = current.float > 0 ? Math.sin(time * 0.9 + i) * 0.09 * current.float : 0;
      position.set(current.pos[i * 3], current.pos[i * 3 + 1] + bob, current.pos[i * 3 + 2]);
      quaternion.set(
        current.quat[i * 4],
        current.quat[i * 4 + 1],
        current.quat[i * 4 + 2],
        current.quat[i * 4 + 3]
      );
      const s = current.scale[i];
      scaleVec.set(s, s, s);
      matrix.compose(position, quaternion, scaleVec);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  applyAppearance();
  applyMatrices(0);

  // ---- Layout ---------------------------------------------------------------
  // The renderer follows the canvas box: right 45% of the viewport on desktop, full viewport below.
  let fit = 1;
  const desktopQuery = window.matchMedia('(min-width: 1024px)');

  const layout = () => {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const halfH = Math.tan(MathUtils.degToRad(FOV / 2)) * CAMERA_Z;
    const halfW = halfH * camera.aspect;
    // The canvas already sits where the crystal lives: the pivot stays centered in it.
    pivot.position.set(0, 0, 0);
    if (desktopQuery.matches) {
      fit = Math.min(1, (halfW * 0.88) / 3.4, halfH / 3.4);
    } else {
      fit = Math.min(0.7, halfW / 3.2);
    }
  };
  layout();
  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(canvas);

  // ---- Pointer parallax -----------------------------------------------------
  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  // ---- Layer transitions ----------------------------------------------------
  const from = createState();
  let target: LayerState = states[initial];
  const progress = { t: 1 };
  let tween: gsap.core.Tween | null = null;
  // Instance matrices are only re-uploaded while a transition runs or the state floats.
  let matricesDirty = true;

  const qFrom = new Quaternion();
  const qTo = new Quaternion();

  const onTransitionUpdate = () => {
    const t = progress.t;
    for (let i = 0; i < COUNT * 3; i++) {
      current.pos[i] = from.pos[i] + (target.pos[i] - from.pos[i]) * t;
      current.color[i] = from.color[i] + (target.color[i] - from.color[i]) * t;
    }
    for (let i = 0; i < COUNT; i++) {
      current.scale[i] = from.scale[i] + (target.scale[i] - from.scale[i]) * t;
      current.glow[i] = from.glow[i] + (target.glow[i] - from.glow[i]) * t;
      qFrom.fromArray(from.quat, i * 4).slerp(qTo.fromArray(target.quat, i * 4), t);
      qFrom.toArray(current.quat, i * 4);
    }
    current.metalness = from.metalness + (target.metalness - from.metalness) * t;
    current.roughness = from.roughness + (target.roughness - from.roughness) * t;
    current.float = from.float + (target.float - from.float) * t;
    current.groupScale = from.groupScale + (target.groupScale - from.groupScale) * t;
    current.tiltX = from.tiltX + (target.tiltX - from.tiltX) * t;
    current.sway = from.sway + (target.sway - from.sway) * t;
    matricesDirty = true;
    applyAppearance();
  };

  const goTo = (layer: LayerName) => {
    const next = states[layer];
    if (!next || next === target) return;

    tween?.kill();
    copyState(from, current); // snapshot whatever is on screen right now
    target = next;
    progress.t = 0;
    tween = gsap.to(progress, {
      t: 1,
      duration: 1.6,
      ease: 'power3.inOut',
      onUpdate: onTransitionUpdate,
      onComplete: () => {
        copyState(current, target);
        matricesDirty = true;
        applyAppearance();
      },
    });
  };

  const onLayerChange = (event: Event) => {
    const layer = (event as CustomEvent<{ layer: LayerName }>).detail?.layer;
    if (layer) goTo(layer);
  };
  window.addEventListener('layerchange', onLayerChange);

  // ---- Scroll-aware pixel ratio ----------------------------------------------
  // Full resolution while idle, 1x while the page scrolls (changes only on state flips).
  let lastScrollAt = -Infinity;
  const onScroll = () => {
    lastScrollAt = performance.now();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Render loop (shares gsap's ticker with Lenis) ---------------------------
  let lastTime = 0;
  let spin = 0;
  let paused = false;
  let destroyed = false;

  // Perf guard: average frame time over the first rendered frames.
  let guardDone = false;
  let guardFrames = 0;
  let guardSum = 0;
  let guardLast = 0;

  const tick = (time: number) => {
    if (document.hidden || paused) {
      lastTime = time;
      guardLast = 0;
      return;
    }
    const dt = Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;

    const nowMs = performance.now();
    if (!guardDone) {
      if (guardLast > 0) {
        guardSum += nowMs - guardLast;
        guardFrames++;
        if (guardFrames >= GUARD_FRAMES) {
          guardDone = true;
          if (guardSum / guardFrames > GUARD_MAX_AVG_MS) {
            options.onSlow?.();
            return;
          }
        }
      }
      guardLast = nowMs;
    }

    const wantedDpr = nowMs - lastScrollAt < SCROLL_IDLE_MS ? 1 : baseDpr;
    if (wantedDpr !== dpr) {
      dpr = wantedDpr;
      renderer.setPixelRatio(dpr);
    }

    // Spin endlessly, or (gold) ease toward a gentle sway so the bars face the camera.
    spin = (spin + dt * 0.15) % (Math.PI * 2);
    const swayAngle = -0.45 + Math.sin(time * 0.35) * 0.3;
    const delta = MathUtils.euclideanModulo(swayAngle - spin + Math.PI, Math.PI * 2) - Math.PI;
    group.rotation.y = spin + delta * current.sway;
    group.rotation.x = current.tiltX;
    pivot.rotation.x += (pointer.y * 0.15 - pivot.rotation.x) * 0.05;
    pivot.rotation.y += (pointer.x * 0.15 - pivot.rotation.y) * 0.05;
    group.scale.setScalar(fit * current.groupScale);

    if (current.float > 0 || matricesDirty) {
      applyMatrices(time);
      matricesDirty = false;
    }
    renderer.render(scene, camera);
  };

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    gsap.ticker.remove(tick);
    tween?.kill();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('layerchange', onLayerChange);
    window.removeEventListener('scroll', onScroll);
    geometry.dispose();
    material.dispose();
    mesh.dispose();
    room.dispose();
    envTarget.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };

  const api: Crystal = {
    destroy,
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
      guardLast = 0;
    },
    setLayer: goTo,
  };

  // Compile the shaders off the main thread before the first frame.
  await renderer.compileAsync(scene, camera);
  if (destroyed) return api;
  gsap.ticker.add(tick);
  return api;
}
