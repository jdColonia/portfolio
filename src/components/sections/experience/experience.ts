import { onDestroy, prefersReducedMotion } from '@lib/motion';

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

  // The indicator is a 1px bar scaled and translated to the active tab: transforms only.
  const placeIndicator = () => {
    const tab = tabs[current];
    if (desktop.matches) {
      indicator.style.transform = `translateY(${tab.offsetTop}px) scaleY(${tab.offsetHeight})`;
    } else {
      indicator.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth})`;
    }
  };

  const syncOrientation = () => {
    list.setAttribute('aria-orientation', desktop.matches ? 'vertical' : 'horizontal');
    placeIndicator();
  };

  const select = (index: number, focus = false) => {
    if (index < 0 || index >= tabs.length) return;
    current = index;

    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      const panel = panels[i];
      if (panel) panel.hidden = !active;
    });

    if (focus) tabs[index].focus();
    placeIndicator();

    // Mobile row: keep the active tab in view without scrolling the page.
    if (!desktop.matches) {
      const tab = tabs[index];
      list.scrollTo({
        left: tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2,
        behavior: reduced ? 'auto' : 'smooth',
      });
    }

    // The fade-in runs in CSS when the panel stops being hidden.
    panels[index]?.querySelector<HTMLElement>('[data-body]')?.scrollTo({ top: 0 });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index));
  });

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

  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(placeIndicator);
  });
  observer.observe(list);
  void document.fonts?.ready.then(placeIndicator);

  // Show the bar only after its first placement, so it never slides in from the origin.
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
