import type { Crystal } from '@lib/crystal/scene';
import type { LayerName } from '@lib/motion';

function hasWebGL2(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

const toLayer = (value: string | undefined): LayerName =>
  value === 'bronze' || value === 'silver' || value === 'gold' || value === 'serve' ? value : 'raw';

// The root is persisted across router navigations (transition:persist), so the WebGL instance
// lives at module level: it is only destroyed when the persisted root disappears from the DOM.
let instance: Crystal | null = null;
let mountedCanvas: HTMLCanvasElement | null = null;
let mounting: HTMLCanvasElement | null = null;
let fallbackForced = false;
let idleHandle: number | null = null;
let timeoutHandle: number | null = null;

const cancelPending = () => {
  if (idleHandle !== null) window.cancelIdleCallback?.(idleHandle);
  if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
  idleHandle = null;
  timeoutHandle = null;
  mounting = null;
};

const destroyInstance = () => {
  cancelPending();
  instance?.destroy();
  instance = null;
  mountedCanvas = null;
};

// Single source of truth for what the user sees; the CSS reacts to this attribute.
const setState = (canvas: HTMLCanvasElement, state: 'loading' | 'ready' | 'fallback') => {
  const root = canvas.closest<HTMLElement>('#crystal-root');
  if (root) root.dataset.crystal = state;
};

const showFallback = (canvas: HTMLCanvasElement) => setState(canvas, 'fallback');

// Three.js is ~540 KB: only worth it on desktop-sized viewports.
export const desktopQuery = window.matchMedia('(min-width: 1024px)');
const wantsLessData = () =>
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

const mount = async (canvas: HTMLCanvasElement) => {
  mounting = canvas;
  let slow = false;
  try {
    const { createCrystal } = await import('@lib/crystal/scene');
    if (mounting !== canvas) return;
    const created = await createCrystal(canvas, {
      initialLayer: toLayer(document.documentElement.dataset.layer),
      onSlow: () => {
        slow = true;
        fallbackForced = true;
        destroyInstance();
        showFallback(canvas);
      },
    });
    if (mounting !== canvas || slow) {
      created.destroy();
      return;
    }
    instance = created;
    mountedCanvas = canvas;
    setState(canvas, 'ready');
  } catch {
    fallbackForced = true;
    showFallback(canvas);
  } finally {
    if (mounting === canvas) mounting = null;
  }
};

export const sync = () => {
  const root = document.getElementById('crystal-root');
  const canvas = root?.querySelector<HTMLCanvasElement>('#crystal-canvas') ?? null;

  // Navigated to a page without the crystal (cv): the persisted root is gone.
  if (!canvas) {
    destroyInstance();
    return;
  }

  // Persisted root still in place: just resume and catch up with the current layer.
  if (instance && mountedCanvas === canvas) {
    instance.resume();
    instance.setLayer(toLayer(document.documentElement.dataset.layer));
    setState(canvas, 'ready');
    return;
  }

  // Mount already scheduled/in flight for this same canvas.
  if (mounting === canvas) return;

  // A different root replaced the one we were rendering into.
  if (instance || mounting) destroyInstance();

  if (fallbackForced) {
    showFallback(canvas);
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weakDevice =
    window.matchMedia('(pointer: coarse)').matches && (navigator.hardwareConcurrency ?? 8) <= 4;
  // Static cube instead of three.js: small viewports, data saver, reduced motion, weak devices.
  // None of these set fallbackForced, so a viewport that later grows past 1024px can still mount.
  if (!desktopQuery.matches || wantsLessData() || reduced || weakDevice || !hasWebGL2()) {
    showFallback(canvas);
    return;
  }

  setState(canvas, 'loading');

  // Safari lacks requestIdleCallback; the types assume it always exists.
  const idleWindow = window as Partial<Pick<Window, 'requestIdleCallback'>> &
    Omit<Window, 'requestIdleCallback'>;
  mounting = canvas;
  if (idleWindow.requestIdleCallback) {
    idleHandle = idleWindow.requestIdleCallback(() => void mount(canvas));
  } else {
    timeoutHandle = window.setTimeout(() => void mount(canvas), 200);
  }
};

export const pauseCrystal = () => instance?.pause();

export const releaseDetachedCrystal = () => {
  // The persisted root was dropped (next page has no crystal): release the WebGL context.
  if (mountedCanvas && !mountedCanvas.isConnected) destroyInstance();
};

// Resized or rotated past the desktop breakpoint: the crystal may mount now. Shrinking does
// nothing: a running instance keeps going and the CSS dims it.
export const onDesktopChange = (event: MediaQueryListEvent) => {
  if (event.matches) sync();
};
