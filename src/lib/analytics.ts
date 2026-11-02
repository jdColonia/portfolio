// Google Analytics events. gtag runs in a Partytown worker: window.gtag on the main thread is a
// forwarding stub (see `forward` in astro.config.mjs), and it may be missing when blocked.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let listening = false;
let loaded = false;
const seenSections = new Set<string>();

/** Sends a GA event. Never throws: analytics must not break the page. */
export function track(name: string, params: Record<string, string> = {}): void {
  try {
    window.gtag?.('event', name, params);
  } catch {
    // Blocked or not ready: ignore.
  }
}

// data-track-link-type -> dataset.trackLinkType -> link_type
function paramKey(datasetKey: string): string {
  const key = datasetKey.slice('track'.length);
  return (key.charAt(0).toLowerCase() + key.slice(1)).replace(
    /[A-Z]/g,
    (c) => `_${c.toLowerCase()}`
  );
}

// One delegated listener: any element with data-track="event_name" (plus data-track-* params).
function onClick(event: MouseEvent): void {
  const element = (event.target as Element | null)?.closest<HTMLElement>('[data-track]');
  if (!element?.dataset.track) return;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(element.dataset)) {
    if (key !== 'track' && key.startsWith('track') && value !== undefined) {
      params[paramKey(key)] = value;
    }
  }
  track(element.dataset.track, params);
}

/** Call on every `astro:page-load`. */
export function initAnalytics(): void {
  seenSections.clear();
  if (!listening) {
    document.addEventListener('click', onClick);
    listening = true;
  }
  // The first load is counted by gtag('config'); later page loads are ClientRouter navigations.
  if (loaded) {
    track('page_view', { page_location: location.href, page_title: document.title });
  }
  loaded = true;
}

/** `section_view` at most once per section per page load. */
export function trackSectionView(section: string): void {
  if (seenSections.has(section)) return;
  seenSections.add(section);
  track('section_view', { section });
}
