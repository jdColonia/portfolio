// Generates /tech-icons.svg at build time: one static SVG "sprite" (a single file holding many
// icons as <symbol> elements) with every technology and issuer icon the site uses. Components
// show an icon with `<use href="tech-icons.svg#id">` (see TechIcon.astro), so the browser
// downloads and caches the icons once instead of each page inlining them.
// To add an icon, register its Iconify id in data/techIcons.ts (or on a certification) and it is
// picked up here; its icon set must be installed as an @iconify-json/* package and listed in
// `sets`.
import type { APIRoute } from 'astro';
import { getIconData, iconToSVG } from '@iconify/utils';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import deviconPlain from '@iconify-json/devicon-plain/icons.json';
import tabler from '@iconify-json/tabler/icons.json';
import { techIcons } from '@data/techIcons';
import { certifications } from '@data/certifications';

type IconSet = Parameters<typeof getIconData>[0];

// Installed Iconify icon sets, keyed by the prefix of an icon id ("simple-icons:python" uses
// "simple-icons"). An id with any other prefix makes the build fail in toSymbol().
const sets: Record<string, IconSet> = {
  'simple-icons': simpleIcons as IconSet,
  'devicon-plain': deviconPlain as IconSet,
  tabler: tabler as IconSet,
};

/**
 * Turns an Iconify id into a `<symbol>` id without ":", which is awkward in selectors and URL
 * fragments: `simple-icons:python` becomes `simple-icons--python`. TechIcon.astro applies the
 * same rule to build the `#fragment` it points to.
 */
export const symbolId = (name: string) => name.replace(':', '--');

/** Every technology and issuer icon used on the site, deduplicated. */
function usedIcons(): string[] {
  const ids = new Set<string>(Object.values(techIcons));
  for (const list of Object.values(certifications)) {
    for (const cert of list) if (cert.icon) ids.add(cert.icon);
  }
  return [...ids].sort();
}

/** Builds the `<symbol>` for one icon id; throws so a typo or missing set fails the build. */
function toSymbol(name: string): string {
  const [prefix, icon] = name.split(':');
  const set = sets[prefix];
  if (!set) throw new Error(`tech-icons: no icon set installed for "${name}"`);
  const data = getIconData(set, icon);
  if (!data) throw new Error(`tech-icons: icon "${name}" not found`);
  const { attributes, body } = iconToSVG(data);
  const id = symbolId(name);
  return `<symbol id="${id}" viewBox="${attributes.viewBox}">${body}</symbol>`;
}

/** Serves the sprite as one SVG document containing every symbol. */
export const GET: APIRoute = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${usedIcons().map(toSymbol).join('')}</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
