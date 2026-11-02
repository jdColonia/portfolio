import type { APIRoute } from 'astro';
import { getIconData, iconToSVG } from '@iconify/utils';
import simpleIcons from '@iconify-json/simple-icons/icons.json';
import deviconPlain from '@iconify-json/devicon-plain/icons.json';
import tabler from '@iconify-json/tabler/icons.json';
import { techIcons } from '@data/techIcons';
import { certifications } from '@data/certifications';

type IconSet = Parameters<typeof getIconData>[0];

const sets: Record<string, IconSet> = {
  'simple-icons': simpleIcons as IconSet,
  'devicon-plain': deviconPlain as IconSet,
  tabler: tabler as IconSet,
};

/** Symbol id of an iconify id (`simple-icons:python` -> `simple-icons--python`). */
export const symbolId = (name: string) => name.replace(':', '--');

/** Every technology and issuer icon used on the site, deduplicated. */
function usedIcons(): string[] {
  const ids = new Set<string>(Object.values(techIcons));
  for (const list of Object.values(certifications)) {
    for (const cert of list) if (cert.icon) ids.add(cert.icon);
  }
  return [...ids].sort();
}

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

export const GET: APIRoute = () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${usedIcons().map(toSymbol).join('')}</svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
