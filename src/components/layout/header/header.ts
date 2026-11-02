/**
 * @file Behaviour of the site header, bundled into Header.astro.
 *
 * Runs on every page.
 *
 * Header.astro calls `initHeader` on each `astro:page-load`. The site uses ClientRouter (Astro's
 * client-side navigation: pages are not reloaded), so everything bound here is released through
 * one AbortController when `astro:before-swap` fires, and bound again on the next page.
 *
 * It handles: the compact header and scroll progress bar, the layer chip, the mobile menu, section
 * navigation with clean URLs (no #hash), and highlighting the nav link of the section in view.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  getLenis,
  getScrollState,
  onScrollProgress,
  prefersReducedMotion,
  type LayerName,
} from '@lib/motion';
import { trackSectionView } from '@lib/analytics';

// DOM elements the mobile menu needs. Any of them can be null on pages that lack the markup.
interface MobileMenuRefs {
  button: HTMLElement | null;
  nav: HTMLElement | null;
  links: NodeListOf<HTMLElement>;
  lines: NodeListOf<Element>;
}

// What the mobile menu exposes to the navigation code, which must close it on link clicks.
interface MobileMenuControls {
  isOpen: () => boolean;
  setMenu: (open: boolean) => void;
}

// ids of the home page sections, which are also the last segment of their routes
// (/stack, /en/proyectos, ...). The ids are in Spanish even on the English pages.
const SECTION_IDS = ['sobre-mi', 'stack', 'experiencia', 'proyectos', 'contacto'];
// Returns the section id for a URL path such as "/portfolio/en/stack/", or null if it is not one.
const getSectionFromPath = (pathname: string) => {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return SECTION_IDS.includes(last) ? last : null;
};

// Scrolls to the top of a section: through Lenis (the smooth-scroll library) when it is running,
// otherwise with the browser's own scrolling (instant if the visitor prefers reduced motion).
const scrollToTarget = (section: HTMLElement) => {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(section, { offset: 0 });
  } else {
    section.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
  }
};

const scrollToTop = () => {
  const lenis = getLenis();
  if (lenis) {
    lenis.scrollTo(0);
  } else {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
};

// ---- Compact header + scroll progress -----------------------------------
// Shrinks the header once the page is scrolled and fills the thin progress bar at the top.
// It reads scroll values from lib/motion, which has a single shared scroll listener, and only
// touches the DOM when a threshold is crossed, to keep scrolling cheap. Returns a function that
// re-reads the scroll position (used after jumps that may not fire a scroll event).
function initCompactHeader(
  signal: AbortSignal,
  header: HTMLElement | null,
  progressBar: HTMLElement | null
) {
  // quickSetter is GSAP's fast path for writing the same property many times per second.
  const setProgress = progressBar ? gsap.quickSetter(progressBar, 'scaleX') : null;
  let compact = false;
  let scrolled = false;

  const onProgress = (progress: number, y: number) => {
    setProgress?.(progress);
    // Past 80px the logo and nav get smaller; past 8px the mobile glass bar fades in.
    const nextCompact = y > 80;
    if (nextCompact !== compact) {
      compact = nextCompact;
      header?.classList.toggle('is-compact', compact);
    }
    const nextScrolled = y > 8;
    if (nextScrolled !== scrolled) {
      scrolled = nextScrolled;
      header?.classList.toggle('is-scrolled', scrolled);
    }
  };
  const syncScroll = () => {
    const state = getScrollState();
    onProgress(state.progress, state.scroll);
  };
  syncScroll();
  const stopProgress = onScrollProgress(onProgress);
  signal.addEventListener('abort', stopProgress);

  return syncScroll;
}

// ---- Layer chip -----------------------------------------------------------
// The small label in the header that names the current medallion layer (raw, bronze, silver, gold
// or serve: the site's visual theme from data engineering). lib/motion fires a `layerchange`
// window event whenever the layer changes as the visitor scrolls.
function initLayerChip(signal: AbortSignal) {
  const chip = document.getElementById('layer-chip');
  const chipText = chip?.querySelector<HTMLElement>('.layer-chip-text');
  if (chip && chipText) {
    // Only pages with layered sections (the home) show it.
    if (document.querySelector('section[data-layer]')) chip.setAttribute('data-show', '');
    else chip.removeAttribute('data-show');

    const setChip = (layer: string | undefined) => {
      chipText.textContent = layer ?? 'raw';
    };
    setChip(document.documentElement.dataset.layer);
    window.addEventListener(
      'layerchange',
      (event) => setChip((event as CustomEvent<{ layer: LayerName }>).detail?.layer),
      { signal }
    );
  }
}

// ---- Mobile menu -------------------------------------------------------
// Full-screen menu opened from the hamburger button. While open it pauses Lenis so the page behind
// does not scroll, and it can be closed with Escape.
function initMobileMenu(signal: AbortSignal, refs: MobileMenuRefs): MobileMenuControls {
  const { button, nav, links, lines } = refs;
  let isOpen = false;

  const setMenu = (open: boolean) => {
    isOpen = open;
    nav?.classList.toggle('is-open', open);
    // `inert` keeps the closed menu out of the tab order and away from screen readers.
    nav?.toggleAttribute('inert', !open);
    button?.setAttribute('aria-expanded', String(open));
    button?.classList.toggle('menu-open', open);
    // Turn the three hamburger lines into an X.
    lines[0]?.classList.toggle('rotate-45', open);
    lines[0]?.classList.toggle('translate-y-2', open);
    lines[1]?.classList.toggle('opacity-0', open);
    lines[2]?.classList.toggle('-rotate-45', open);
    lines[2]?.classList.toggle('-translate-y-2', open);

    const lenis = getLenis();
    if (open) {
      // Pause smooth scrolling so the page behind the menu stays put.
      lenis?.stop();
      if (!prefersReducedMotion()) {
        gsap.fromTo(
          links,
          { y: 28, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, delay: 0.08 }
        );
      }
    } else {
      lenis?.start();
      // Remove the inline styles left by the entrance animation.
      gsap.set(links, { clearProps: 'all' });
    }
  };

  button?.addEventListener('click', () => setMenu(!isOpen), { signal });
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && isOpen) {
        setMenu(false);
        button?.focus();
      }
    },
    { signal }
  );
  // If the page is swapped while the menu is open, do not leave scrolling paused.
  signal.addEventListener('abort', () => {
    if (isOpen) getLenis()?.start();
  });

  return { isOpen: () => isOpen, setMenu };
}

// ---- Navigation with clean URLs (no hash) ------------------------------
// Nav links point at real routes (/stack, /en/contacto, ...). On the home page a click scrolls to
// the section and updates the URL with pushState instead of reloading. On other pages (the CV) the
// link is left alone, so ClientRouter loads the route. Also scrolls to the right section when
// the page is opened directly on one of those routes.
function initNavigation(
  signal: AbortSignal,
  menu: MobileMenuControls,
  logo: HTMLAnchorElement | null,
  isOnCvPage: boolean,
  syncScroll: () => void
) {
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');

  navLinks.forEach((link) => {
    link.addEventListener(
      'click',
      (e) => {
        if (menu.isOpen()) menu.setMenu(false);

        const sectionId = link.getAttribute('data-section');
        if (!sectionId) return;

        // On the CV page, or if the section is not in this page, do nothing and let the router
        // load the section route. That route is a static page that renders the home and
        // scrolls to the section once it loads (see the direct navigation code below).
        const section = document.getElementById(sectionId);
        if (isOnCvPage || !section) return;

        e.preventDefault();
        window.history.pushState({}, '', link.href);
        scrollToTarget(section);
      },
      { signal }
    );
  });

  // Logo: on a page with the home sections it scrolls back to the hero, like the section links do;
  // elsewhere (CV, 404) it follows its href to the language home.
  // Modified clicks (middle button, ctrl/cmd/shift/alt) keep their normal browser behaviour.
  logo?.addEventListener(
    'click',
    (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (menu.isOpen()) menu.setMenu(false);
      if (isOnCvPage || !document.querySelector('section[data-layer]')) return;

      e.preventDefault();
      if (window.location.href !== logo.href) window.history.pushState({}, '', logo.href);
      scrollToTop();
    },
    { signal }
  );

  // Direct navigation (a reload or shared link on /stack, /en/proyectos, ...): jump to the section.
  // The target is read now, before anything else runs, because the section observer further down
  // rewrites the URL as soon as it fires and the path would no longer name the requested section.
  const directSection = isOnCvPage ? null : getSectionFromPath(window.location.pathname);
  if (directSection) {
    // Once the visitor scrolls on their own, stop forcing the position.
    let userMoved = false;
    const markMoved = () => {
      userMoved = true;
    };
    (['wheel', 'touchstart', 'keydown'] as const).forEach((type) =>
      window.addEventListener(type, markMoved, { passive: true, once: true, signal })
    );

    const jump = () => {
      const target = document.getElementById(directSection);
      if (!target || userMoved) return;
      const lenis = getLenis();
      if (lenis) {
        lenis.scrollTo(target, { offset: 0, immediate: true, force: true });
      } else {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
      // An instant jump may not emit a scroll event, so update the header state by hand.
      syncScroll();
    };

    // The layout keeps changing for a moment after load: the scroll engine starts, ScrollTrigger
    // adds pin spacers (empty space that makes room for pinned elements), and web fonts change
    // text sizes. A single jump would land on a position that later shifts, so jump once early
    // (100 ms), again when things have settled (700 ms), and again once fonts are ready.
    const early = window.setTimeout(jump, 100);
    const late = window.setTimeout(jump, 700);
    void document.fonts?.ready.then(() => window.setTimeout(jump, 50));
    // Late layout changes (images, ScrollTrigger refreshes) can push the section out of place
    // again, so also jump after every refresh, but only for a short window (2.5 s). Later
    // refreshes are caused by the visitor and must not move the page.
    ScrollTrigger.addEventListener('refresh', jump);
    window.addEventListener('load', jump, { once: true, signal });
    const stopFollowing = () => ScrollTrigger.removeEventListener('refresh', jump);
    const settle = window.setTimeout(stopFollowing, 2500);
    signal.addEventListener('abort', () => {
      window.clearTimeout(early);
      window.clearTimeout(late);
      window.clearTimeout(settle);
      stopFollowing();
    });
  }
}

// ---- Active link + glass drop -------------------------------------------
// Marks the nav link of the section in view with aria-current, slides the "glass drop" (the
// pill-shaped highlight behind the active link in the desktop pill) to it, and keeps the URL and the
// `section_view` analytics event in sync with the section being read.
function initActiveLink(
  signal: AbortSignal,
  desktopNav: HTMLElement | null,
  drop: HTMLElement | null,
  logo: HTMLAnchorElement | null,
  isOnCvPage: boolean
) {
  const desktopLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.desktop-link'));
  // Every nav element that can be current: pill links, the CV button and the mobile menu.
  const navTargets = Array.from(
    document.querySelectorAll<HTMLElement>('#desktop-bar [data-nav], #mobile-nav [data-nav]')
  );
  let activeLink: HTMLAnchorElement | null = null;
  // False until the drop has been placed once, so the first placement appears in position
  // instead of sliding in from the left edge.
  let dropShown = false;

  // Moves the drop behind `link` (or hides it when null), animating unless told not to.
  const placeDrop = (link: HTMLElement | null, animate: boolean) => {
    if (!drop) return;
    if (!link) {
      gsap.to(drop, { opacity: 0, duration: animate ? 0.3 : 0 });
      dropShown = false;
      return;
    }
    const target = { x: link.offsetLeft, width: link.offsetWidth };
    if (!dropShown || !animate || prefersReducedMotion()) {
      gsap.set(drop, { ...target, opacity: 1 });
      dropShown = true;
    } else {
      gsap.to(drop, {
        ...target,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
        overwrite: true,
      });
    }
  };

  // Marks `id` as the current nav item. The desktop pill only has the section links, so for the
  // CV button there is no match and the drop hides.
  const setActive = (id: string | null) => {
    const match = id ? (desktopLinks.find((l) => l.dataset.nav === id) ?? null) : null;
    navTargets.forEach((l) => {
      if (id && l.dataset.nav === id) {
        l.setAttribute('aria-current', id === 'cv' ? 'page' : 'true');
      } else {
        l.removeAttribute('aria-current');
      }
    });
    activeLink = match;
    placeDrop(match, true);
  };

  // CV page: the CV button is the current one (no match in the pill, so the drop hides).
  if (isOnCvPage) {
    setActive('cv');
  }

  // The pill changes size (compact mode, fonts, resize), which moves the links: keep the drop
  // on the active one without animating.
  if (desktopNav && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => placeDrop(activeLink, false));
    resizeObserver.observe(desktopNav, { box: 'border-box' });
    signal.addEventListener('abort', () => resizeObserver.disconnect());
  }

  // The section crossing the middle of the viewport is the current one. The -45% margins narrow
  // the observed area to a thin horizontal band in the centre of the screen.
  const sections = document.querySelectorAll<HTMLElement>('section');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;

        if (!target.id) {
          // Sections without an id are visual extras that belong to the previous section (they have
          // no nav link), except the hero, which is the first screen and has no link either.
          if (target.dataset.layer === 'raw') {
            setActive(null);
            // Back at the hero: the URL is the language home again.
            if (!isOnCvPage && logo) window.history.replaceState({}, '', logo.href);
          }
          return;
        }

        setActive(target.id);
        if (!isOnCvPage) trackSectionView(target.id);

        // Keep the URL equal to the section being read. replaceState rewrites the current history
        // entry instead of adding one, so the back button is not filled with every section.
        // Not done on the CV page, which has no sections.
        if (!isOnCvPage) {
          const linkUrl = desktopLinks
            .find((l) => l.dataset.nav === target.id)
            ?.getAttribute('href');
          if (linkUrl) {
            window.history.replaceState({}, '', linkUrl);
          }
        }
      });
    },
    { root: null, rootMargin: '-45% 0px -45% 0px', threshold: 0 }
  );
  sections.forEach((section) => observer.observe(section));
  signal.addEventListener('abort', () => observer.disconnect());
}

/**
 * Wires up the whole header. Call on every `astro:page-load`; everything it binds is released
 * automatically on the next `astro:before-swap`.
 */
export function initHeader() {
  const header = document.getElementById('site-header');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const desktopNav = document.getElementById('desktop-nav');
  const drop = document.getElementById('nav-drop');
  const progressBar = document.getElementById('scroll-progress');
  // Big section links plus the CV button: they share the entrance animation of the mobile menu.
  const mobileNavLinks = document.querySelectorAll<HTMLElement>('.mobile-nav-link, .mobile-cv');
  const menuLines = document.querySelectorAll('.menu-line');
  const logo = document.querySelector<HTMLAnchorElement>('.site-logo');

  // One AbortController owns every listener and observer created by the functions above. Aborting
  // it on `astro:before-swap` removes them all, so nothing is duplicated after a navigation.
  const abort = new AbortController();
  const { signal } = abort;
  document.addEventListener('astro:before-swap', () => abort.abort(), { once: true });

  const isOnCvPage = /\/cv\/?$/.test(window.location.pathname);

  const syncScroll = initCompactHeader(signal, header, progressBar);
  initLayerChip(signal);
  const menu = initMobileMenu(signal, {
    button: mobileMenuBtn,
    nav: mobileNav,
    links: mobileNavLinks,
    lines: menuLines,
  });
  initNavigation(signal, menu, logo, isOnCvPage, syncScroll);
  initActiveLink(signal, desktopNav, drop, logo, isOnCvPage);
}
