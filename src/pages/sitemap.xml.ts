// Generates /sitemap.xml at build time (an Astro endpoint: this file becomes a static XML file).
// The sitemap tells search engines which pages exist and when each one last changed.
// To make a new indexable page appear here, add it to `entries` below, together with the source
// files whose history dates it. The build must see the full git history for the dates to be
// right, which is why the deploy workflow checks out with `fetch-depth: 0`.
import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { withBase } from '@lib/urls';

/**
 * One page of the site in both languages. Only canonical, indexable pages belong here: the
 * section routes (/stack, /en/proyectos, ...) render the home page and declare it as their
 * canonical URL (the address search engines should treat as the original), and the 404 page is
 * not meant to be indexed, so none of those are listed.
 * The Spanish and English versions are linked as `hreflang` alternates, the markup that tells
 * search engines which URL to show to speakers of each language.
 */
type Entry = {
  /** Spanish path relative to the site base ('' is the home page). */
  es: string;
  /** English path relative to the site base. */
  en: string;
  /** Files and folders whose last change dates the page, used for `<lastmod>`. */
  sources: string[];
  /** Relative importance among this site's pages, from 0.0 to 1.0 (a hint for crawlers). */
  priority: string;
  /** How often the page tends to change (also only a hint for crawlers). */
  changefreq: 'weekly' | 'monthly' | 'yearly';
};

const entries: Entry[] = [
  // Home page: projects, experience and stack are updated here as they change, so it depends on
  // most of the source tree.
  {
    es: '',
    en: 'en/',
    sources: ['src/components', 'src/data', 'src/i18n', 'src/assets', 'src/pages/index.astro'],
    priority: '1.0',
    changefreq: 'monthly',
  },
  // Resume page: it changes only when its template or one of the CV PDFs is updated.
  {
    // Trailing slash: that is the canonical form, because GitHub Pages redirects /cv to /cv/.
    es: 'cv/',
    en: 'en/cv/',
    sources: [
      'src/components/views/CvPage.astro',
      'public/CV-JUAN-DAVID-COLONIA-ALDANA-ES.pdf',
      'public/CV-JUAN-DAVID-COLONIA-ALDANA-EN.pdf',
    ],
    priority: '0.8',
    changefreq: 'monthly',
  },
];

/** Runs a git command and returns its trimmed output, or '' if git fails or is not installed. */
const git = (args: string[]): string => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

/**
 * Date (YYYY-MM-DD) of the last commit that touched any of the sources. It falls back to today
 * when those files have uncommitted changes or when git history is not available.
 */
const lastmod = (sources: string[]): string => {
  // Local calendar date in the same YYYY-MM-DD shape as git's %cs. The 'sv-SE' locale is used
  // only because it formats dates that way.
  const today = new Date().toLocaleDateString('sv-SE');
  if (git(['status', '--porcelain', '--', ...sources])) return today;
  return git(['log', '-1', '--format=%cs', '--', ...sources]) || today;
};

/** Builds the XML. `site` comes from the Astro config and makes every URL absolute. */
export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(withBase(path), site).href;

  // Each page produces two <url> blocks, one per language, and both list the same alternates.
  // x-default is the version for visitors whose language matches neither (Spanish here).
  const urls = entries.flatMap((entry) => {
    const alternates = [
      `    <xhtml:link rel="alternate" hreflang="es" href="${url(entry.es)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${url(entry.en)}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${url(entry.es)}"/>`,
    ].join('\n');
    const date = lastmod(entry.sources);
    return [entry.es, entry.en].map(
      (path) => `  <url>
    <loc>${url(path)}</loc>
${alternates}
    <lastmod>${date}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    );
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
