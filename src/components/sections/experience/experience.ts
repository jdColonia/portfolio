/**
 * Behaviour of the experience tabs (see Experience.astro): selecting a company shows its panel,
 * arrow keys move between tabs, and a bar slides to mark the active tab. The tabs are a row on
 * small screens and a column from 1024px up, so the bar and the arrow keys follow that layout.
 */
import { onDestroy, prefersReducedMotion } from '@lib/motion';

/**
 * Wires up the experience tabs. Call it on `astro:page-load`, which fires on the first load and
 * after every client-side navigation (ClientRouter); the cleanup is registered with `onDestroy`.
 */
export function initExperience() {
  const root = document.querySelector<HTMLElement>('[data-experience]');
  const list = root?.querySelector<HTMLElement>('[data-tablist]');
  const indicator = root?.querySelector<HTMLElement>('[data-indicator]');
  if (!root || !list || !indicator) return;

  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = tabs.map((tab) =>
    document.getElementById(tab.getAttribute('aria-controls') ?? '')
  );
  if (tabs.length === 0) return;

  const desktop = window.matchMedia('(min-width: 1024px)');
  const reduced = prefersReducedMotion();
  let current = 0;

  // The indicator is a 1px bar that is moved and stretched over the active tab. Only transforms
  // are used (no top/left/width changes), so moving it does not trigger a layout recalculation.
  const placeIndicator = () => {
    const tab = tabs[current];
    if (desktop.matches) {
      indicator.style.transform = `translateY(${tab.offsetTop}px) scaleY(${tab.offsetHeight})`;
    } else {
      indicator.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
    }
  };

  // The tab list is a column on desktop and a row on mobile; screen readers need to know which.
  const syncOrientation = () => {
    list.setAttribute('aria-orientation', desktop.matches ? 'vertical' : 'horizontal');
    placeIndicator();
  };

  const select = (index: number, focus = false) => {
    if (index < 0 || index >= tabs.length) return;
    current = index;

    // Roving tabindex: only the active tab is reachable with the Tab key; the arrow keys (see
    // the keydown handler below) move between tabs.
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = !active;
    });

    if (focus) tabs[index].focus();
    placeIndicator();

    // On the mobile row, scroll the tab list sideways to center the active tab. Scrolling the
    // list itself (rather than calling scrollIntoView) leaves the page scroll position alone.
    if (!desktop.matches) {
      const tab = tabs[index];
      list.scrollTo({
        left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
        behavior: reduced ? 'auto' : 'smooth',
      });
    }

    // Start the newly shown panel from the top. Its fade-in is pure CSS and plays on its own as
    // soon as the panel is no longer hidden.
    panels[index]?.querySelector<HTMLElement>('[data-body]')?.scrollTo({ top: 0 });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
  });

  // Keyboard support following the WAI-ARIA tabs pattern: arrows wrap around, Home and End jump
  // to the first and last tab. The arrow axis depends on the tab list's orientation.
  list.addEventListener('keydown', (event) => {
    const horizontal = !desktop.matches;
    const prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown';
    let next = -1;

    if (event.key === nextKey) next = (current + 1) % tabs.length;
    else if (event.key === prevKey) next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    select(next, true);
  });

  syncOrientation();
  desktop.addEventListener('change', syncOrientation);

  // The tab sizes change when the list is resized or when the web fonts finish loading, so the
  // bar is re-measured then. The ResizeObserver callback is throttled to one run per frame.
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeIndicator);
  });
  observer.observe(list);
  void document.fonts?.ready.then(placeIndicator);

  // Reveal the bar only after its first placement so it never slides in from the origin. The
  // second frame is what turns its transition on (see the `data-ready` and `data-animated`
  // rules in ExperienceTabs.astro).
  requestAnimationFrame(() => {
    root.setAttribute('data-ready', '');
    requestAnimationFrame(() => root.setAttribute('data-animated', ''));
  });

  onDestroy(() => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    desktop.removeEventListener('change', syncOrientation);
  });
}
