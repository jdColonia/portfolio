/**
 * @file Client-side logic of the 404 page (NotFound.astro).
 *
 * GitHub Pages serves this single static page for every unknown URL, so neither the requested path
 * nor the language is known at build time. This script shows the requested path in the fake error
 * message and, on /en/ URLs, swaps the Spanish text for English.
 */

// Spanish is the default, already present in the server-rendered HTML. The keys match the
// `data-i18n` attributes in NotFound.astro, so only the English strings are kept here.
const EN = {
  title: "This page doesn't exist in the lakehouse",
  text: 'The link may be broken or the page was moved. Go back home or check my resume.',
  home: 'Back to home',
  cv: 'See resume',
} as const;

/**
 * Fills the 404 page with the requested path and translates it when the URL is under `/en/`.
 * Runs on every `astro:page-load` and does nothing on pages that are not the 404.
 */
export function initNotFound() {
  const root = document.querySelector<HTMLElement>('[data-notfound]');
  if (!root) return;

  // Deployment base ("/portfolio/" in production, "/" in dev), passed in by NotFound.astro.
  const base = root.dataset.base ?? '/';
  const { pathname } = window.location;

  // Use textContent, never innerHTML: the pathname comes from the address bar, so it could
  // contain markup.
  root.querySelectorAll<HTMLElement>('[data-path]').forEach((el) => {
    el.textContent = pathname;
  });

  // English URLs live under "<base>en". Anything else keeps the Spanish default.
  const isEnglish = pathname === `${base}en` || pathname.startsWith(`${base}en/`);
  if (!isEnglish) return;

  document.documentElement.lang = 'en';
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n as keyof typeof EN;
    el.textContent = EN[key];
  });
  root.querySelector<HTMLAnchorElement>('[data-link="home"]')?.setAttribute('href', `${base}en/`);
  root.querySelector<HTMLAnchorElement>('[data-link="cv"]')?.setAttribute('href', `${base}en/cv`);
}
