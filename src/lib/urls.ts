import type { Lang } from '@data/types';

/** Prefixes a site-relative path with the deployment base (e.g. "/portfolio/"). */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path}`;
}

/** Like `withBase`, adding the `en/` prefix for English (Spanish is the unprefixed default). */
export function localizePath(lang: Lang, path = ''): string {
  return withBase(`${lang === 'en' ? 'en/' : ''}${path}`);
}
