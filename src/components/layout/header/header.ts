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

interface MobileMenuRefs {
  button: HTMLElement | null;
  nav: HTMLElement | null;
  links: NodeListOf<HTMLElement>;
  lines: NodeListOf<Element>;
}

interface MobileMenuControls {
  isOpen: () => boolean;
  setMenu: (open: boolean) => void;
}

const SECTION_IDS = ['sobre-mi', 'stack', 'experiencia', 'proyectos', 'contacto'];
const getSectionFromPath = (pathname: string) => {
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return SECTION_IDS.includes(last) ? last : null;
};

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
// Fed by the single scroll source in motion.ts; classes only change when the boolean flips.
function initCompactHeader(
  signal: AbortSignal,
  header: HTMLElement | null,
  progressBar: HTMLElement | null
) {
  const setProgress = progressBar ? gsap.quickSetter(progressBar, 'scaleX') : null;
  let compact = false;
  let scrolled = false;

  const onProgress = (progress: number, y: number) => {
    setProgress?.(progress);
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
function initMobileMenu(signal: AbortSignal, refs: MobileMenuRefs): MobileMenuControls {
  const { button, nav, links, lines } = refs;
  let isOpen = false;

  const setMenu = (open: boolean) => {
    isOpen = open;
    nav?.classList.toggle('is-open', open);
    nav?.toggleAttribute('inert', !open);
    button?.setAttribute('aria-expanded', String(open));
    button?.classList.toggle('menu-open', open);
    lines[0]?.classList.toggle('rotate-45', open);
    lines[0]?.classList.toggle('translate-y-2', open);
    lines[1]?.classList.toggle('opacity-0', open);
    lines[2]?.classList.toggle('-rotate-45', open);
    lines[2]?.classList.toggle('-translate-y-2', open);

    const lenis = getLenis();
    if (open) {
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
  signal.addEventListener('abort', () => {
    if (isOpen) getLenis()?.start();
  });

  return { isOpen: () => isOpen, setMenu };
}

// ---- Navigation with clean URLs (no hash) ------------------------------
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

        // CV page or a section that is not here: let the router load the section route
        // (a static page that renders the home and scrolls to the section on load).
        const section = document.getElementById(sectionId);
        if (isOnCvPage || !section) return;

        e.preventDefault();
        window.history.pushState({}, '', link.href);
        scrollToTarget(section);
      },
      { signal }
    );
  });

  // Logo: on a page with the home sections it scrolls back to the hero like the section links
  // do; elsewhere (CV, 404) it navigates to the language home.
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

  // Direct navigation (reload or shared link on /stack, /en/proyectos, ...): jump to the section.
  // The target is read now: the section observer below rewrites the URL as soon as it fires.
  const directSection = isOnCvPage ? null : getSectionFromPath(window.location.pathname);
  if (directSection) {
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
      // An immediate jump may not emit a scroll event: sync the header bar state.
      syncScroll();
    };

    // Motion init and pin spacers settle after the first frames, and fonts shift the layout:
    // jump once early and once more when everything has loaded.
    const early = window.setTimeout(jump, 100);
    const late = window.setTimeout(jump, 700);
    void document.fonts?.ready.then(() => window.setTimeout(jump, 50));
    // Late layout changes (images, ScrollTrigger refreshes) can push the section down again,
    // so keep re-jumping on each refresh for a short window.
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
function initActiveLink(
  signal: AbortSignal,
  desktopNav: HTMLElement | null,
  drop: HTMLElement | null,
  logo: HTMLAnchorElement | null,
  isOnCvPage: boolean
) {
  const desktopLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.desktop-link'));
  // Every nav element that can be current: pill links, the CV button and the mobile sheet.
  const navTargets = Array.from(
    document.querySelectorAll<HTMLElement>('#desktop-bar [data-nav], #mobile-nav [data-nav]')
  );
  let activeLink: HTMLAnchorElement | null = null;
  let dropShown = false;

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

  // Pill size changes (compact mode, fonts, resize): follow without animating.
  if (desktopNav && typeof ResizeObserver !== 'undefined') {
    const resizeObserver = new ResizeObserver(() => placeDrop(activeLink, false));
    resizeObserver.observe(desktopNav, { box: 'border-box' });
    signal.addEventListener('abort', () => resizeObserver.disconnect());
  }

  // Section crossing the middle of the viewport drives the active link.
  const sections = document.querySelectorAll<HTMLElement>('section');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = entry.target as HTMLElement;

        if (!target.id) {
          // Sections without id belong to the previous one, except the hero.
          if (target.dataset.layer === 'raw') {
            setActive(null);
            // Back at the hero: the URL is the language home again.
            if (!isOnCvPage && logo) window.history.replaceState({}, '', logo.href);
          }
          return;
        }

        setActive(target.id);
        if (!isOnCvPage) trackSectionView(target.id);

        // Update URL when scrolling through sections (only on main page, not on CV page)
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

export function initHeader() {
  const header = document.getElementById('site-header');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const desktopNav = document.getElementById('desktop-nav');
  const drop = document.getElementById('nav-drop');
  const progressBar = document.getElementById('scroll-progress');
  // Big section links plus the CV button: they share the open/close entrance.
  const mobileNavLinks = document.querySelectorAll<HTMLElement>('.mobile-nav-link, .mobile-cv');
  const menuLines = document.querySelectorAll('.menu-line');
  const logo = document.querySelector<HTMLAnchorElement>('.site-logo');

  // Everything bound to window/observers is released before the next swap.
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
