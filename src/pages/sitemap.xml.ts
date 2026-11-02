import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { withBase } from '@lib/urls';

/**
 * Canonical, indexable pages only. The section routes (/stack, /en/proyectos, ...) render the home
 * and declare it as canonical, and 404 is not a page to index, so none of them are listed.
 * Each entry pairs the Spanish and English versions (hreflang alternates).
 */
type Entry = {
  es: string;
  en: string;
  /** Sources whose last change dates the page (lastmod). */
  sources: string[];
  priority: string;
  changefreq: 'weekly' | 'monthly' | 'yearly';
};

const entries: Entry[] = [
  // Primary page: projects, experience and stack land here as they change.
  {
    es: '',
    en: 'en/',
    sources: ['src/components', 'src/data', 'src/i18n', 'src/assets', 'src/pages/index.astro'],
    priority: '1.0',
    changefreq: 'monthly',
  },
  // Section-level page: changes only when the CV PDF is reissued.
  {
    // Trailing slash: the canonical form (GitHub Pages redirects /cv to /cv/).
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

/** Last commit touching the sources; today if they have uncommitted changes or git is missing. */
const lastmod = (sources: string[]): string => {
  // Local calendar date, like git's %cs.
  const today = new Date().toLocaleDateString('sv-SE');
  if (git(['status', '--porcelain', '--', ...sources])) return today;
  return git(['log', '-1', '--format=%cs', '--', ...sources]) || today;
};

export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(withBase(path), site).href;

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
