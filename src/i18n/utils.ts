// Helpers to find the language of the current page and to look up interface text for it.
// The strings themselves live in i18n/ui.ts.
import { ui, defaultLang } from '@i18n/ui';

/** Removes the deployment base (e.g. "/portfolio") from a pathname, leaving a leading slash. */
export function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
}

/**
 * Language of a page, read from the first path segment after the base: "/en/..." is English and
 * anything else (including unknown segments) is the default language, Spanish.
 */
export function getLangFromUrl(url: URL) {
  const [, lang] = stripBase(url.pathname).split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

/**
 * Returns a `t(key)` function for the given language. The keys are typed from the Spanish
 * dictionary, and a missing or empty English string falls back to the Spanish one.
 * Despite the name it is not a React hook; it can be called anywhere.
 */
export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
