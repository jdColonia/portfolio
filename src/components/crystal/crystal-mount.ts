// Decides when to start and stop the 3D crystal, and which version of it the visitor sees.
// Used by the script in DataCrystal.astro, which calls `sync` on every page load.
//
// The crystal itself (three.js, a WebGL library, about 540 KB) lives in @lib/crystal/scene and is
// loaded with a dynamic `import()` only when this file decides it is worth it: a desktop-sized
// screen, a capable device and no preference for less data or motion. In every other case, or if
// anything fails, the page keeps showing a static SVG cube instead (the "fallback").
//
// The element's `data-crystal` attribute is the single source of truth for the CSS:
// 'loading' (placeholder while three.js downloads), 'ready' (canvas visible) or 'fallback'.
// Importing only the types below keeps three.js out of the page's main bundle.
import type { Crystal } from '@lib/crystal/scene';
import type { LayerName } from '@lib/motion';

// True if the browser can create a WebGL2 context. The test context is released right away so it
// does not count against the browser's limit on live contexts.
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

// Validates the layer name read from <html data-layer>; unknown or missing values become 'raw'.
const toLayer = (value: string | undefined): LayerName =>
  value === 'bronze' || value === 'silver' || value === 'gold' || value === 'serve' ? value : 'raw';

// The crystal's root element is kept alive across ClientRouter navigations (Astro's client-side
// navigation: pages are not reloaded) with `transition:persist`. For that reason the WebGL
// instance is stored at module level and is only destroyed when the persisted root disappears
// from the DOM.
// The running crystal and the canvas it draws into.
let instance: Crystal | null = null;
let mountedCanvas: HTMLCanvasElement | null = null;
// The canvas whose mount is scheduled or in progress; prevents starting it twice.
let mounting: HTMLCanvasElement | null = null;
// Set once WebGL fails or runs too slowly: from then on only the static fallback is used for the
// rest of the visit, so we do not retry and fail again after each navigation.
let fallbackForced = false;
// Handles of the scheduled mount (idle callback or timer), so it can be cancelled.
let idleHandle: number | null = null;
let timeoutHandle: number | null = null;

// Cancels a scheduled mount that has not started yet.
const cancelPending = () => {
  if (idleHandle !== null) window.cancelIdleCallback?.(idleHandle);
  if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
  idleHandle = null;
  timeoutHandle = null;
  mounting = null;
};

// Stops the crystal (if any) and forgets it, releasing its WebGL context.
const destroyInstance = () => {
  cancelPending();
  instance?.destroy();
  instance = null;
  mountedCanvas = null;
};

// Writes the state on the root element; DataCrystal.astro's CSS shows or hides the canvas and the
// SVG according to it.
const setState = (canvas: HTMLCanvasElement, state: 'loading' | 'ready' | 'fallback') => {
  const root = canvas.closest<HTMLElement>('#crystal-root');
  if (root) root.dataset.crystal = state;
};

const showFallback = (canvas: HTMLCanvasElement) => setState(canvas, 'fallback');

// Three.js is about 540 KB, which is only worth downloading on desktop-sized screens (1024px and
// up, the same breakpoint the CSS uses to place the crystal beside the content).
export const desktopQuery = window.matchMedia('(min-width: 1024px)');
// True when the visitor turned on the browser's data saver. `navigator.connection` is not in the
// standard TypeScript types, hence the cast.
const wantsLessData = () =>
  !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

// Downloads three.js and starts the crystal on `canvas`. Every `await` can take a while and the
// page may have changed meanwhile, so after each one we check that this canvas is still the one
// being mounted.
const mount = async (canvas: HTMLCanvasElement) => {
  mounting = canvas;
  let slow = false;
  try {
    const { createCrystal } = await import('@lib/crystal/scene');
    if (mounting !== canvas) return;
    const created = await createCrystal(canvas, {
      initialLayer: toLayer(document.documentElement.dataset.layer),
      // The scene reports that its first frames were too slow: give up on the 3D version.
      onSlow: () => {
        slow = true;
        fallbackForced = true;
        destroyInstance();
        showFallback(canvas);
      },
    });
    // The mount was cancelled, or `onSlow` fired before `createCrystal` returned: discard it.
    if (mounting !== canvas || slow) {
      created.destroy();
      return;
    }
    instance = created;
    mountedCanvas = canvas;
    setState(canvas, 'ready');
  } catch {
    // The download or WebGL setup failed (offline, context creation refused, ...).
    fallbackForced = true;
    showFallback(canvas);
  } finally {
    if (mounting === canvas) mounting = null;
  }
};

/**
 * Brings the crystal in line with the current page. Call on every `astro:page-load` and whenever
 * the viewport grows past the desktop breakpoint. Depending on the situation it mounts the 3D
 * crystal, resumes it, destroys it, or switches to the static fallback.
 */
export const sync = () => {
  const root = document.getElementById('crystal-root');
  const canvas = root?.querySelector<HTMLCanvasElement>('#crystal-canvas') ?? null;

  // Navigated to a page without the crystal (such as the CV): the persisted root is gone.
  if (!canvas) {
    destroyInstance();
    return;
  }

  // The persisted root is still in place: resume rendering and catch up with the layer that became
  // active while the crystal was paused (or morph to it if it changed during the navigation).
  if (instance && mountedCanvas === canvas) {
    instance.resume();
    instance.setLayer(toLayer(document.documentElement.dataset.layer));
    setState(canvas, 'ready');
    return;
  }

  // A mount is already scheduled or in progress for this same canvas.
  if (mounting === canvas) return;

  // A different root replaced the one we were rendering into: drop the old instance.
  if (instance || mounting) destroyInstance();

  if (fallbackForced) {
    showFallback(canvas);
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weakDevice =
    window.matchMedia('(pointer: coarse)').matches && (navigator.hardwareConcurrency ?? 8) <= 4;
  // Use the static cube instead of three.js on small viewports, with the data saver on, with reduced
  // motion, on weak devices (touch screens with 4 or fewer CPU cores) and without WebGL2. These
  // checks do not set `fallbackForced`, so a viewport that later grows past 1024px can still mount.
  if (!desktopQuery.matches || wantsLessData() || reduced || weakDevice || !hasWebGL2()) {
    showFallback(canvas);
    return;
  }

  setState(canvas, 'loading');

  // Start the download when the browser is idle so it does not compete with the first paint.
  // Safari lacks requestIdleCallback, which the TypeScript types assume always exists; this type
  // makes it optional so the check below is honest.
  const idleWindow = window as Partial<Pick<Window, 'requestIdleCallback'>> &
    Omit<Window, 'requestIdleCallback'>;
  mounting = canvas;
  if (idleWindow.requestIdleCallback) {
    idleHandle = idleWindow.requestIdleCallback(() => void mount(canvas));
  } else {
    // Fallback for browsers without requestIdleCallback: a short delay lets the page settle first.
    timeoutHandle = window.setTimeout(() => void mount(canvas), 200);
  }
};

/** Stops rendering while the page is being swapped (call on `astro:before-swap`). */
export const pauseCrystal = () => instance?.pause();

/**
 * Call on `astro:after-swap`. If the new page has no crystal, the persisted root was dropped from
 * the DOM, so release the WebGL context now rather than leaving it running unseen.
 */
export const releaseDetachedCrystal = () => {
  if (mountedCanvas && !mountedCanvas.isConnected) destroyInstance();
};

/**
 * Listener for the desktop media query. Growing past the breakpoint (resize or rotation) may
 * allow the crystal to mount. Shrinking does nothing: a running crystal keeps going and the CSS
 * dims it.
 */
export const onDesktopChange = (event: MediaQueryListEvent) => {
  if (event.matches) sync();
};
