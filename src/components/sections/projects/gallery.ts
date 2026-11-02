/**
 * @file Scroll behaviour of the projects gallery (markup in ProjectsGallery.astro).
 *
 * The cards sit in one long horizontal "track", and there are three ways to move through it:
 *   - reduced motion: the visitor scrolls the row natively and the progress bar just follows it;
 *   - desktop: the section is pinned (held in place by GSAP ScrollTrigger, which ties animations
 *     to the scroll position) while vertical scrolling slides the track sideways;
 *   - phones and tablets: the same sliding, but the holding is done with CSS `position: sticky`
 *     because a JavaScript pin can make touch momentum scrolling jump.
 * `gsap.matchMedia` picks the right one and undoes it when the screen size or the motion
 * preference changes. Lenis is the smooth-scroll library that drives the page scroll.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis, onDestroy } from '@lib/motion';

gsap.registerPlugin(ScrollTrigger);

/** The DOM elements the gallery needs, found once in `initGallery` and shared by the modes. */
interface GalleryParts {
  /** Root element; it receives `data-mode` ("pinned" or "sticky") for the CSS to react to. */
  gallery: HTMLElement;
  /** Element held in place in desktop mode (title plus cards). */
  pin: HTMLElement;
  /** Clipping window around the track; scrolls natively when no mode is active. */
  viewport: HTMLElement;
  /** Row of all the cards; this is what slides sideways. */
  track: HTMLElement;
  /** Tall box that gives the sticky stage room to travel (sticky mode only). */
  scroll: HTMLElement | null | undefined;
  /** The part that sticks while scrolling (sticky mode only). */
  stage: HTMLElement | null | undefined;
  /** Progress bar; its `scaleX` goes from 0 to 1. */
  bar: HTMLElement | null | undefined;
}

// Reduced motion: no scroll-driven animation. The visitor scrolls the row natively and the
// progress bar follows the scroll position.
function setupReducedMotion({ viewport, bar }: GalleryParts) {
  const update = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    if (bar) gsap.set(bar, { scaleX: max > 0 ? viewport.scrollLeft / max : 0 });
  };
  update();
  viewport.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  return () => {
    viewport.removeEventListener('scroll', update);
    window.removeEventListener('resize', update);
  };
}

// Desktop, motion allowed: pin the gallery (hold it in place) and "scrub" the track sideways,
// meaning its position follows the scrollbar.
function setupDesktopPin({ gallery, pin, viewport, track, bar }: GalleryParts) {
  gallery.dataset.mode = 'pinned';
  // The viewport no longer scrolls by itself, so it is not a useful keyboard stop. Keyboard
  // access to the cards is handled by the focusin listener below.
  viewport.removeAttribute('tabindex');

  const padding = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  // How far the track has to move so its last card ends up at the right edge of the pin.
  const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth + padding());

  // quickSetter is a faster way to write the same property on every scroll update.
  const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : null;

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      // Pin for as long as the track needs to travel: one pixel of scroll per pixel of movement.
      end: () => `+=${distance()}`,
      pin: true,
      // A short smoothing delay (in seconds) so the movement lags the scrollbar slightly.
      scrub: 0.3,
      // Recompute the function values above (x and end) whenever ScrollTrigger refreshes.
      invalidateOnRefresh: true,
      // Starts pinning slightly early to avoid a visible jump when the pin kicks in.
      anticipatePin: 1,
      // Pinning inserts a spacer that makes the page taller, which moves every trigger below
      // it. This trigger therefore refreshes first, so the later ones (the layer colour changes
      // and the snap points in src/lib/motion) measure positions that already include the spacer.
      refreshPriority: 1,
      onUpdate: (self) => setBar?.(self.progress),
    },
  });

  // Keyboard users tab through the card links. When the focused card is off screen, scroll the
  // page to the scroll position at which that card is visible; the pin then moves the track.
  const onFocusIn = (event: FocusEvent) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-card]');
    const st = tween.scrollTrigger;
    const total = distance();
    if (!card || !st || total <= 0) return;

    const x = Number(gsap.getProperty(track, 'x'));
    const left = card.offsetLeft + x;
    const fits = left >= 0 && left + card.offsetWidth <= pin.clientWidth;
    if (fits) return;

    // Fraction of the track's travel at which this card's left edge reaches the left edge, mapped
    // onto the scroll range of the pin. Jump there without smoothing so focus does not fight a
    // scroll animation.
    const progress = Math.min(1, Math.max(0, (card.offsetLeft - padding()) / total));
    const y = st.start + progress * (st.end - st.start);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  track.addEventListener('focusin', onFocusIn);

  // Undo callback for gsap.matchMedia. The tween and its ScrollTrigger are reverted by
  // matchMedia itself; this only removes what was added by hand. There is no explicit
  // ScrollTrigger.refresh() here: the engine in src/lib/motion refreshes once after fonts and the
  // load event, which re-measures the triggers that sit after the pin spacer.
  return () => {
    track.removeEventListener('focusin', onFocusIn);
    delete gallery.dataset.mode;
    viewport.setAttribute('tabindex', '0');
  };
}

// Phones and tablets, motion allowed: the stage with the cards is held by CSS `position: sticky`
// (no JavaScript pin). Scrolling through the tall .gallery-scroll box scrubs the track sideways.
function setupMobileSticky({ gallery, viewport, track, scroll, stage, bar }: GalleryParts) {
  if (!scroll || !stage) return;
  gallery.dataset.mode = 'sticky';
  viewport.removeAttribute('tabindex');

  // How far the track has to move. The track has padding on both sides, so the last card ends
  // one padding away from the right edge instead of touching it.
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : null;

  // Vertical position where the stage sticks: centered in the screen, but never closer to the
  // top than 4.5rem, so it always stays below the fixed header.
  const stickyTop = () => {
    const clear = 4.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Math.round(Math.max(clear, (window.innerHeight - stage.offsetHeight) / 2));
  };

  // A sticky element only stays stuck while its parent is taller than itself. Make the
  // parent exactly as tall as the stage plus the horizontal distance to travel, so the stage
  // is released right when the last card is reached. Also publishes the sticky offset to the CSS
  // (--stage-top in ProjectsGallery.astro). This runs before every ScrollTrigger measurement
  // (`refreshInit`), because the values depend on the window size.
  const setHeight = () => {
    stage.style.setProperty('--stage-top', `${stickyTop()}px`);
    scroll.style.height = `${stage.offsetHeight + distance()}px`;
  };
  ScrollTrigger.addEventListener('refreshInit', setHeight);
  setHeight();

  gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: scroll,
      // Start when the top of the scroll box reaches the position where the stage sticks.
      start: () => `top top+=${stickyTop()}`,
      end: () => `+=${distance()}`,
      scrub: 0.3,
      invalidateOnRefresh: true,
      onUpdate: (self) => setBar?.(self.progress),
    },
  });

  // Undo callback for gsap.matchMedia: reverts what was set by hand. The tween and its
  // ScrollTrigger are reverted by matchMedia itself.
  return () => {
    ScrollTrigger.removeEventListener('refreshInit', setHeight);
    scroll.style.height = '';
    stage.style.removeProperty('--stage-top');
    delete gallery.dataset.mode;
    viewport.setAttribute('tabindex', '0');
  };
}

/**
 * Sets up the gallery for the current screen size and motion preference. Call it on
 * `astro:page-load`, which fires on the first load and after every client-side navigation
 * (ClientRouter). Everything it creates is undone through `onDestroy`, and again by
 * `gsap.matchMedia` whenever a media query below stops matching.
 */
export function initGallery() {
  const gallery = document.querySelector<HTMLElement>('[data-gallery]');
  const pin = gallery?.querySelector<HTMLElement>('[data-gallery-pin]');
  const viewport = gallery?.querySelector<HTMLElement>('[data-gallery-viewport]');
  const track = gallery?.querySelector<HTMLElement>('[data-gallery-track]');
  const scroll = gallery?.querySelector<HTMLElement>('[data-gallery-scroll]');
  const stage = gallery?.querySelector<HTMLElement>('[data-gallery-stage]');
  const bar = gallery?.querySelector<HTMLElement>('[data-gallery-bar]');
  if (!gallery || !pin || !viewport || !track) return;

  const parts: GalleryParts = { gallery, pin, viewport, track, scroll, stage, bar };
  const mm = gsap.matchMedia();

  // Exactly one of these three conditions matches at any time (1024px is the desktop breakpoint,
  // and the mobile query stops just below it).
  mm.add('(prefers-reduced-motion: reduce)', () => setupReducedMotion(parts));
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () =>
    setupDesktopPin(parts)
  );
  mm.add('(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)', () =>
    setupMobileSticky(parts)
  );

  onDestroy(() => mm.revert());
}
