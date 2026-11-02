// Spanish is the server-rendered default; only the English strings are swapped in.
const EN = {
  title: "This page doesn't exist in the lakehouse",
  text: 'The link may be broken or the page was moved. Go back home or check my resume.',
  home: 'Back to home',
  cv: 'See resume',
} as const;

export function initNotFound() {
  const root = document.querySelector<HTMLElement>('[data-notfound]');
  if (!root) return;

  const base = root.dataset.base ?? '/';
  const { pathname } = window.location;

  // textContent only: the pathname is user-controlled.
  root.querySelectorAll<HTMLElement>('[data-path]').forEach((el) => {
    el.textContent = pathname;
  });

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
