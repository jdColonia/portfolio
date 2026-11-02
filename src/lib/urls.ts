/**
 * @file URL helpers.
 *
 * Always build internal links with these instead of writing "/..." by hand, because the site is
 * served under a sub-path in production (/portfolio on GitHub Pages) but from the root in
 * development, and English pages live under /en/.
 */

import type { Lang } from '@data/types';

/**
 * Prefixes a site-relative path with the deployment base: `withBase('cv')` gives "/portfolio/cv"
 * in production and "/cv" in development. Pass the path without a leading slash.
 *
 * @param path - Site-relative path, without a leading slash.
 * @returns The path with the deployment base in front, ready to use as an href or src.
 * @example
 * withBase('cv'); // "/portfolio/cv" in production, "/cv" in development
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}${path}`;
}

/**
 * Like `withBase`, but also adds the `en/` prefix for English; Spanish is the default language and
 * has no prefix. With no path it returns the home of that language.
 *
 * @param lang - Language of the page the link points to.
 * @param path - Site-relative path, without a leading slash. Empty for the home of that language.
 * @returns The localized path with the deployment base in front.
 */
export function localizePath(lang: Lang, path = ''): string {
  return withBase(`${lang === 'en' ? 'en/' : ''}${path}`);
}
