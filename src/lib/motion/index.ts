/**
 * @file Scroll engine for the whole site.
 *
 * Runs on every page (started from Layout.astro):
 *  - Lenis (smooth-scroll library) drives the page scroll, unless the visitor prefers reduced
 *    motion, in which case the browser's native scroll is used.
 *  - GSAP ScrollTrigger (scroll-driven animations) switches the active "layer" and "stage" as the
 *    visitor scrolls. A layer is one step of the medallion pipeline (raw, bronze, silver, gold,
 *    serve), the site's visual theme borrowed from data engineering; each layer has its own colour
 *    palette. The stage is where the 3D crystal sits on screen.
 *  - Other modules subscribe to the overall scroll progress through `onScrollProgress`.
 * The site uses ClientRouter (Astro's client-side navigation: pages are not reloaded), so
 * `initMotion` must run after every navigation and `destroyMotion` before each page swap.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Snap from 'lenis/snap';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

/** Medallion layer of the site's visual theme, from rawest to most refined data. */
export type LayerName = 'raw' | 'bronze' | 'silver' | 'gold' | 'serve';

/**
 * Where the 3D crystal sits on desktop while a section is on screen. The section's content is
 * placed on the opposite side. 'none' hides the crystal.
 */
export type StageName = 'center' | 'left' | 'right' | 'none';

/**
 * Called on every scroll update with the overall page progress (0 to 1) and the scroll position
 * in px.
 */
export type ScrollProgressCallback = (progress: number, scroll: number) => void;

let lenis: Lenis | null = null;
let tickerFn: ((time: number) => void) | null = null;
let currentLayer: LayerName = 'raw';
// One ScrollTrigger per section; each one activates that section's layer and stage.
let layerTriggers: ScrollTrigger[] = [];
let snapTeardown: (() => void) | null = null;
// Cleanup callbacks registered by components through `onDestroy`; run once by `destroyMotion`.
const cleanups: Array<() => void> = [];

// Subscribers to the overall page progress. They all share one underlying scroll listener, so
// adding a subscriber never adds another scroll handler.
const progressListeners = new Set<ScrollProgressCallback>();
let progressTeardown: (() => void) | null = null;
// Incremented on every init and destroy. The deferred refresh in `initMotion` compares it to the
// value it captured, so a refresh scheduled by an old page never runs after navigating away.
let initToken = 0;

/** True when the visitor's OS asks for less motion; callers should skip or simplify animations. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The active Lenis instance, or null when reduced motion is on or before `initMotion` has run. */
export function getLenis(): Lenis | null {
  return lenis;
}

/** The medallion layer that is currently active for the scroll position. */
export function getCurrentLayer(): LayerName {
  return currentLayer;
}

/**
 * Registers a cleanup to run once on the next `destroyMotion`, i.e. before ClientRouter swaps the
 * page. Components use it to undo what they set up (revert SplitText, kill their own triggers).
 */
export function onDestroy(fn: () => void): void {
  cleanups.push(fn);
}

/**
 * Subscribes to the page scroll progress. The values come from a single Lenis `scroll` listener
 * or, when Lenis is off (reduced motion), from one passive native scroll listener.
 *
 * @param cb - Called on every scroll update.
 * @returns A function that removes the subscription (an unsubscribe function).
 */
export function onScrollProgress(cb: ScrollProgressCallback): () => void {
  progressListeners.add(cb);
  return () => {
    progressListeners.delete(cb);
  };
}

// Sends the progress (clamped to 0..1) and scroll position to every subscriber.
function emitProgress(progress: number, scroll: number): void {
  const clamped = Math.min(1, Math.max(0, progress));
  progressListeners.forEach((cb) => cb(clamped, scroll));
}

// Cached maximum scroll distance for the native (no Lenis) fallback. Reading scrollHeight forces
// the browser to compute layout, so it is measured only on setup and on resize/refresh, not on
// every scroll event.
let nativeMax = 0;

/**
 * Current overall progress (0 to 1) and scroll position in px. With Lenis this reads values it
 * already has and so never forces a layout.
 */
export function getScrollState(): { progress: number; scroll: number } {
  if (lenis) return { progress: lenis.progress, scroll: lenis.scroll };
  const scroll = window.scrollY;
  return { progress: nativeMax > 0 ? scroll / nativeMax : 0, scroll };
}

function setupScrollProgress(): void {
  progressTeardown?.();
  progressTeardown = null;

  // When the layout changes, ScrollTrigger emits 'refresh' (after it re-measures every trigger).
  // The page length may have changed, so recompute it and tell the subscribers the new progress.
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

  // Native fallback (reduced motion): one passive listener that uses the cached scroll range.
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
 * Switches the page palette by setting `data-layer` on <html>. The colours for each layer are CSS
 * custom properties defined in global.css under `html[data-layer=...]`, so no colour is animated
 * from JavaScript. Also announces the change with a `layerchange` window event, which the header
 * and the crystal listen to.
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

/**
 * Moves the crystal by setting `data-stage` on <html> (CSS reads that attribute). It writes only
 * when the value changes, to avoid needless style recalculations.
 */
function applyStage(stage: StageName): void {
  if (document.documentElement.dataset.stage !== stage) {
    document.documentElement.dataset.stage = stage;
  }
}

// Validates the `data-stage` attribute of a section. Anything unknown or missing falls back to
// 'right'.
const toStage = (value: string | undefined): StageName =>
  value === 'center' || value === 'left' || value === 'right' || value === 'none' ? value : 'right';

function setupLayers(): void {
  const sections = gsap.utils.toArray<HTMLElement>('section[data-layer]');

  // A fresh page starts on the first layer. Pages without layered sections (like the CV page) stay
  // there. On pages with sections, the triggers below pick the right layer for the scroll position.
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
      // A section becomes active when its top crosses 55% of the viewport height (slightly below
      // the middle), so the palette changes when the new section is mostly on screen.
      start: 'top 55%',
      end: 'bottom 55%',
      onEnter: activate,
      onEnterBack: activate,
    });
  });
}

// Proximity snapping (Lenis snap plugin): when the visitor stops scrolling near the start of a
// section, the page glides to it. Desktop only (>= 1024px) and never with reduced motion. The
// pinned project gallery and the zoom section are excluded: snapping is paused over their whole
// scroll range, so it cannot fight the pin (a ScrollTrigger "pin" holds an element in place while
// the page keeps scrolling).
const SNAP_QUERY = '(min-width: 1024px)';

// Enables snapping while the viewport matches SNAP_QUERY and disables it when it stops matching,
// e.g. after rotating a tablet or resizing the window.
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

  // Recomputes the snap points as absolute page positions in px. It runs after every ScrollTrigger
  // refresh, because by then the pin spacers (the empty space ScrollTrigger inserts to make room
  // for a pinned element) already exist and the section positions are final.
  const computePoints = () => {
    const current = snap;
    if (!current) return;
    clearPoints();
    const scrollY = window.scrollY;
    const sections = gsap.utils.toArray<HTMLElement>('section[data-layer]:not([data-zoom])');
    sections.forEach((section, index) => {
      const isLast = index === sections.length - 1;
      // The last screen holds the final section plus the footer, so snap to the very bottom of
      // the page to keep both visible.
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
      // Cubic easing: fast start, gentle landing.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
    });

    // Pause snapping over the pinned gallery and the zoom, i.e. from the start of the projects
    // section to the end of the zoom section. The start is offset by 2px so the pause does not
    // switch on while the page rests exactly on the section boundary.
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

/**
 * Starts the scroll engine: Lenis (if motion is allowed), the progress broadcaster, the
 * layer/stage triggers and the section snapping. Call on every `astro:page-load`; it is safe to
 * call again because it tears down its own previous state first.
 */
export function initMotion(): void {
  // If this runs twice without a `destroyMotion` in between, drop the previous Lenis, ticker and
  // triggers. The component cleanups registered with `onDestroy` are deliberately not run here.
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
    // `autoRaf: false`: Lenis does not run its own animation loop; GSAP's ticker calls `raf`
    // below, so Lenis and ScrollTrigger always update in the same frame. `lerp` is the easing
    // factor per frame (higher is snappier, lower is floatier).
    lenis = new Lenis({ autoRaf: false, lerp: 0.2, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    // GSAP's ticker passes seconds; Lenis expects milliseconds.
    tickerFn = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tickerFn);
    // Turn off GSAP's lag smoothing (it would stretch time after a slow frame) so Lenis always gets real elapsed time.
    gsap.ticker.lagSmoothing(0);
  }

  setupScrollProgress();
  setupLayers();
  if (lenis) setupSnap(lenis);

  // Trigger positions depend on layout, which is only final once web fonts and the window `load`
  // event are done. Re-measure all triggers once at that point.
  const token = ++initToken;
  const loaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener('load', () => resolve(), { once: true })
        );
  void Promise.all([document.fonts?.ready ?? Promise.resolve(), loaded]).then(() =>
    // Wait one more frame so every component's own `astro:page-load` handler has had the chance to
    // create its triggers before the single refresh measures all of them.
    requestAnimationFrame(() => {
      if (token === initToken) ScrollTrigger.refresh();
    })
  );

  // ScrollTrigger refreshes by itself on window resize, but a resize flips the CSS media queries
  // before the `--vw` custom property (written by a ResizeObserver in Layout.astro) has caught up,
  // so that automatic refresh can measure a stale layout. This observer waits until the body width
  // stops changing (200 ms without a new change) and then refreshes once more. Height changes
  // (late fonts, pin spacers) are ignored on purpose; the load refresh above covers them.
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

/**
 * Undoes everything `initMotion` set up and runs the cleanups registered with `onDestroy`. Call on
 * `astro:before-swap`, before ClientRouter replaces the page, so no listener, trigger or ticker
 * callback leaks into the next page.
 */
export function destroyMotion(): void {
  // Invalidate any refresh that `initMotion` scheduled and has not run yet.
  initToken++;
  cleanups.splice(0).forEach((fn) => fn());

  progressTeardown?.();
  progressTeardown = null;
  progressListeners.clear();

  layerTriggers.forEach((trigger) => trigger.kill());
  layerTriggers = [];
  snapTeardown?.();
  snapTeardown = null;
  // Also kill triggers created by components that did not register a cleanup of their own.
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
