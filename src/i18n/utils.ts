import { ui, defaultLang } from '@i18n/ui';

/** Removes the deployment base (e.g. "/portfolio") from a pathname, leaving a leading slash. */
export function stripBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
}

export function getLangFromUrl(url: URL) {
  const [, lang] = stripBase(url.pathname).split('/');
  if (lang in ui) return lang as keyof typeof ui;
  return defaultLang;
}

export function useTranslations(lang: keyof typeof ui) {
  return function t(key: keyof (typeof ui)[typeof defaultLang]) {
    return ui[lang][key] || ui[defaultLang][key];
  };
}
