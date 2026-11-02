import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

export type LayerName = 'raw' | 'bronze' | 'silver' | 'gold' | 'serve';

/**
 * Where the crystal sits on desktop for a section: the content goes to the opposite side.
 * 'none' hides the crystal.
 */
export type StageName = 'center' | 'left' | 'right' | 'none';

/** Called on every scroll update with the overall progress (0..1) and the scroll position (px). */
export type ScrollProgressCallback = (progress: number, scroll: number) => void;

let lenis: Lenis | null = null;
let tickerFn: ((time: number) => void) | null = null;
let currentLayer: LayerName = 'raw';
let layerTriggers: ScrollTrigger[] = [];
let snapTeardown: (() => void) | null = null;
const cleanups: Array<() => void> = [];

// One scroll source for everything that follows the overall page progress.
const progressListeners = new Set<ScrollProgressCallback>();
let progressTeardown: (() => void) | null = null;
let initToken = 0;

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function getCurrentLayer(): LayerName {
  return currentLayer;
}

/** Register a callback that runs on destroyMotion (e.g. revert SplitText, kill local triggers). */
export function onDestroy(fn: () => void): void {
  cleanups.push(fn);
}

/**
 * Subscribe to the page scroll progress. Fed by a single Lenis `scroll` listener (or, without
 * Lenis, one passive native listener with a cached scroll range). Returns the unsubscribe function.
 */
export function onScrollProgress(cb: ScrollProgressCallback): () => void {
  progressListeners.add(cb);
  return () => {
    progressListeners.delete(cb);
  };
}

function emitProgress(progress: number, scroll: number): void {
  const clamped = Math.min(1, Math.max(0, progress));
  progressListeners.forEach((cb) => cb(clamped, scroll));
}

let nativeMax = 0;

/** Current overall progress and scroll position (no layout read when Lenis drives the page). */
export function getScrollState(): { progress: number; scroll: number } {
  if (lenis) return { progress: lenis.progress, scroll: lenis.scroll };
  const scroll = window.scrollY;
  return { progress: nativeMax > 0 ? scroll / nativeMax : 0, scroll };
}

function setupScrollProgress(): void {
  progressTeardown?.();
  progressTeardown = null;

  // Layout changes (ScrollTrigger refresh) re-broadcast the current state to the subscribers.
  const onRefresh = () => {
    if (!lenis) nativeMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const state = getScrollState();
    emitProgress(state.progress, state.scroll);
  };
  ScrollTrigger.addEventListener('refresh', onRefresh);

  if (lenis) {
    const instance = lenis;
    const onLenisScroll = (event: Lenis) => emitProgress(event.progress, event.scroll);
    instance.on('scroll', onLenisScroll);
    progressTeardown = () => {
      instance.off('scroll', onLenisScroll);
      ScrollTrigger.removeEventListener('refresh', onRefresh);
    };
    return;
  }

  // Native fallback (reduced motion): one passive listener with a cached scroll range.
  nativeMax = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  const onNativeScroll = () => {
    const state = getScrollState();
    emitProgress(state.progress, state.scroll);
  };
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  window.addEventListener('resize', onRefresh, { passive: true });
  progressTeardown = () => {
    window.removeEventListener('scroll', onNativeScroll);
    window.removeEventListener('resize', onRefresh);
    ScrollTrigger.removeEventListener('refresh', onRefresh);
  };
}

/**
 * Switches the page palette. The per-layer custom properties live in global.css under
 * html[data-layer=...]; nothing is tweened per frame here.
 */
function applyLayer(layer: LayerName): void {
  const changed = layer !== currentLayer;
  currentLayer = layer;
  if (document.documentElement.dataset.layer !== layer) {
    document.documentElement.dataset.layer = layer;
  }

  if (changed) {
    window.dispatchEvent(new CustomEvent('layerchange', { detail: { layer } }));
  }
}

/** Moves the crystal stage (CSS reads html[data-stage]); only writes when it changes. */
function applyStage(stage: StageName): void {
  if (document.documentElement.dataset.stage !== stage) {
    document.documentElement.dataset.stage = stage;
  }
}

const toStage = (value: string | undefined): StageName =>
  value === 'center' || value === 'left' || value === 'right' || value === 'none' ? value : 'right';

function setupLayers(): void {
  const sections = gsap.utils.toArray<HTMLElement>('section[data-layer]');

  // A fresh page starts on the first layer (pages without layers, like cv, stay there);
  // ScrollTrigger activates the right one for the scroll position.
  applyLayer('raw');
  applyStage(toStage(sections[0]?.dataset.stage));
  if (sections.length === 0) return;

  layerTriggers = sections.map((section) => {
    const layer = (section.dataset.layer ?? 'raw') as LayerName;
    const stage = toStage(section.dataset.stage);
    const activate = () => {
      applyLayer(layer);
      applyStage(stage);
    };
    return ScrollTrigger.create({
      trigger: section,
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter: activate,
      onEnterBack: activate,
    });
  });
}

/**
 * Proximity snapping (Lenis snap plugin) to the start of each top-level section. Desktop only
 * (>= 1024px) and never with reduced motion. The pinned gallery and the zoom are left out: the
 * snap is paused over their whole scroll range, so it cannot fight the pin.
 */
const SNAP_QUERY = '(min-width: 1024px)';

function setupSnap(instance: Lenis): void {
  snapTeardown?.();
  snapTeardown = null;

  const media = window.matchMedia(SNAP_QUERY);
  let snap: Snap | null = null;
  let removers: Array<() => void> = [];
  let pauseTrigger: ScrollTrigger | null = null;

  const clearPoints = () => {
    removers.forEach((remove) => remove());
    removers = [];
  };

  // Section starts in page pixels. Called on every ScrollTrigger refresh, after pin spacers exist.
  const computePoints = () => {
    const current = snap;
    if (!current) return;
    clearPoints();
    const scrollY = window.scrollY;
    const sections = gsap.utils.toArray<HTMLElement>('section[data-layer]:not([data-zoom])');
    sections.forEach((section, index) => {
      const isLast = index === sections.length - 1;
      // The last screen is section + footer: snap to the very bottom so both stay visible.
      const value = isLast
        ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        : Math.round(section.getBoundingClientRect().top + scrollY);
      removers.push(current.add(value));
    });
  };

  const enable = () => {
    if (snap) return;
    snap = new Snap(instance, {
      type: 'proximity',
      duration: 0.6,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });

    // Pause over the pinned gallery and the zoom: from the projects section start to the end of
    // the zoom section.
    const projects = document.getElementById('proyectos');
    const zoom = document.querySelector<HTMLElement>('[data-zoom]');
    if (projects && zoom) {
      pauseTrigger = ScrollTrigger.create({
        trigger: projects,
        start: 'top+=2 top',
        endTrigger: zoom,
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) snap?.stop();
          else snap?.start();
        },
      });
    }
    computePoints();
  };

  const disable = () => {
    pauseTrigger?.kill();
    pauseTrigger = null;
    clearPoints();
    snap?.destroy();
    snap = null;
  };

  const sync = () => {
    if (media.matches) enable();
    else disable();
  };

  ScrollTrigger.addEventListener('refresh', computePoints);
  media.addEventListener('change', sync);
  sync();

  snapTeardown = () => {
    ScrollTrigger.removeEventListener('refresh', computePoints);
    media.removeEventListener('change', sync);
    disable();
  };
}

export function initMotion(): void {
  // Guard against double init without running component cleanups.
  snapTeardown?.();
  snapTeardown = null;
  if (lenis) {
    if (tickerFn) gsap.ticker.remove(tickerFn);
    lenis.destroy();
    lenis = null;
    tickerFn = null;
  }
  layerTriggers.forEach((trigger) => trigger.kill());
  layerTriggers = [];
  const reduced = prefersReducedMotion();

  if (!reduced) {
    lenis = new Lenis({ autoRaf: false, lerp: 0.2, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    tickerFn = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    gsap.ticker.lagSmoothing(0);
  }

  setupScrollProgress();
  setupLayers();
  if (lenis) setupSnap(lenis);

  // Layout settles once fonts and the load event are done: refresh the trigger positions once.
  const token = ++initToken;
  const loaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener('load', () => resolve(), { once: true })
        );
  void Promise.all([document.fonts?.ready ?? Promise.resolve(), loaded]).then(() =>
    // After the page-load handlers of every component had the chance to create their triggers.
    requestAnimationFrame(() => {
      if (token === initToken) ScrollTrigger.refresh();
    })
  );

  // A resize flips the media queries before --vw (written by a ResizeObserver) settles, so the
  // automatic resize refresh can measure a stale layout: re-measure once the width settles.
  // Height changes (fonts, pin spacers) are left to the load refresh above.
  let resizeTimer = 0;
  let lastWidth = document.body.clientWidth;
  const pageObserver = new ResizeObserver(([entry]) => {
    const width = Math.round(entry.contentRect.width);
    if (width === lastWidth) return;
    lastWidth = width;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  });
  pageObserver.observe(document.body);
  onDestroy(() => {
    window.clearTimeout(resizeTimer);
    pageObserver.disconnect();
  });
}

export function destroyMotion(): void {
  initToken++;
  cleanups.splice(0).forEach((fn) => fn());

  progressTeardown?.();
  progressTeardown = null;
  progressListeners.clear();

  layerTriggers.forEach((trigger) => trigger.kill());
  layerTriggers = [];
  snapTeardown?.();
  snapTeardown = null;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());

  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }

  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}
