import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis, onDestroy } from '@lib/motion';

gsap.registerPlugin(ScrollTrigger);

interface GalleryParts {
  gallery: HTMLElement;
  pin: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  scroll: HTMLElement | null | undefined;
  stage: HTMLElement | null | undefined;
  bar: HTMLElement | null | undefined;
}

// Reduced motion: native horizontal scroll, the bar follows it.
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

// Desktop, motion allowed: pin the gallery and scrub the track sideways.
function setupDesktopPin({ gallery, pin, viewport, track, bar }: GalleryParts) {
  gallery.dataset.mode = 'pinned';
  viewport.removeAttribute('tabindex');

  const padding = () => parseFloat(getComputedStyle(track).paddingLeft) || 0;
  const distance = () => Math.max(0, track.scrollWidth - pin.clientWidth + padding());

  const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : null;

  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 0.3,
      invalidateOnRefresh: true,
      anticipatePin: 1,
      // Measure before the triggers placed after the pin spacer (layers, snap range).
      refreshPriority: 1,
      onUpdate: (self) => setBar?.(self.progress),
    },
  });

  // Keyboard: bring a focused card into view by scrolling the page to its progress.
  const onFocusIn = (event: FocusEvent) => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('[data-card]');
    const st = tween.scrollTrigger;
    const total = distance();
    if (!card || !st || total <= 0) return;

    const x = Number(gsap.getProperty(track, 'x'));
    const left = card.offsetLeft + x;
    const fits = left >= 0 && left + card.offsetWidth <= pin.clientWidth;
    if (fits) return;

    const progress = Math.min(1, Math.max(0, (card.offsetLeft - padding()) / total));
    const y = st.start + progress * (st.end - st.start);
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  };
  track.addEventListener('focusin', onFocusIn);

  // The single ScrollTrigger.refresh() in motion.ts (after fonts + load) re-measures the
  // triggers placed after the pin spacer.
  return () => {
    track.removeEventListener('focusin', onFocusIn);
    delete gallery.dataset.mode;
    viewport.setAttribute('tabindex', '0');
  };
}

// Phones and tablets, motion allowed: CSS sticky stage for the cards (no pin); the page
// scroll through the tall scroll box scrubs the track sideways.
function setupMobileSticky({ gallery, viewport, track, scroll, stage, bar }: GalleryParts) {
  if (!scroll || !stage) return;
  gallery.dataset.mode = 'sticky';
  viewport.removeAttribute('tabindex');

  // The track has padding on both sides, so the last card ends one padding from the edge.
  const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
  const setBar = bar ? gsap.quickSetter(bar, 'scaleX') : null;

  // Center the stage in the screen below the header, never under it.
  const stickyTop = () => {
    const clear = 4.5 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Math.round(Math.max(clear, (window.innerHeight - stage.offsetHeight) / 2));
  };

  // Sticky needs room to travel: stage height plus the horizontal distance.
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
      start: () => `top top+=${stickyTop()}`,
      end: () => `+=${distance()}`,
      scrub: 0.3,
      invalidateOnRefresh: true,
      onUpdate: (self) => setBar?.(self.progress),
    },
  });

  return () => {
    ScrollTrigger.removeEventListener('refreshInit', setHeight);
    scroll.style.height = '';
    stage.style.removeProperty('--stage-top');
    delete gallery.dataset.mode;
    viewport.setAttribute('tabindex', '0');
  };
}

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

  mm.add('(prefers-reduced-motion: reduce)', () => setupReducedMotion(parts));
  mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () =>
    setupDesktopPin(parts)
  );
  mm.add('(max-width: 1023.98px) and (prefers-reduced-motion: no-preference)', () =>
    setupMobileSticky(parts)
  );

  onDestroy(() => mm.revert());
}
