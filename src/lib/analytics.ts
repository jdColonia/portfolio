/**
 * @file Thin wrapper around Google Analytics (GA) for custom events.
 *
 * Used by the header, the layout and any element that declares `data-track` in its markup.
 *
 * GA's gtag.js runs inside Partytown (a library that runs third-party scripts in a web worker, off
 * the main thread). On the main thread `window.gtag` is only a forwarding stub that relays calls to
 * the worker (see the `forward` option in astro.config.mjs). It can also be missing entirely when
 * an ad blocker stops the script, so every call here must tolerate that.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let listening = false;
let loaded = false;
const seenSections = new Set<string>();

/**
 * Sends a GA event. Never throws: analytics must not break the page.
 *
 * @param name - GA event name, e.g. `cv_download` or `contact_click`.
 * @param params - Event parameters. Do not use `language` as a key: GA reads it as the user's
 *   language.
 */
export function track(name: string, params: Record<string, string> = {}): void {
  try {
    window.gtag?.('event', name, params);
  } catch {
    // The stub is blocked or the worker is not ready yet. Losing one event is fine.
  }
}

// Converts a dataset key into a GA parameter name. For example the attribute `data-track-link-type`
// appears in `dataset` as `trackLinkType`, and is sent as `link_type`.
function paramKey(datasetKey: string): string {
  const key = datasetKey.slice('track'.length);
  return (key.charAt(0).toLowerCase() + key.slice(1)).replace(
    /[A-Z]/g,
    (c) => `_${c.toLowerCase()}`
  );
}

// Single delegated click listener on the document. Any element (or ancestor of the click target)
// with `data-track="event_name"` sends that event, and each `data-track-*` attribute is added as a
// parameter. Delegation means markup can be tracked without wiring a listener per element, and it
// keeps working after ClientRouter swaps the page body.
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

/**
 * Starts tracking for the current page. Call on every `astro:page-load` (ClientRouter, Astro's
 * client-side navigation, fires it after each navigation as well as the first load).
 */
export function initAnalytics(): void {
  seenSections.clear();
  if (!listening) {
    document.addEventListener('click', onClick);
    listening = true;
  }
  // The very first page view is already sent by `gtag('config')` in the layout. Any later call to
  // this function is a client-side navigation, which GA cannot see on its own, so send it here.
  if (loaded) {
    track('page_view', { page_location: location.href, page_title: document.title });
  }
  loaded = true;
}

/** Sends `section_view` for a home-page section, at most once per section per page load. */
export function trackSectionView(section: string): void {
  if (seenSections.has(section)) return;
  seenSections.add(section);
  track('section_view', { section });
}
