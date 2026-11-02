import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  // `site` and `base` are the production address (GitHub Pages serves the project under
  // /portfolio). In development the site is served from the root. Internal links must therefore
  // be built with withBase() from src/lib/urls.ts, never as a hand-written "/..." path.
  site: 'https://jdcolonia.github.io',
  base: process.env.NODE_ENV === 'production' ? '/portfolio' : '/',
  // Partytown runs third-party scripts in a web worker, so Google Analytics (gtag.js) never blocks
  // the main thread. `forward` lists the main-thread functions that are relayed to the worker:
  // calling window.gtag() or dataLayer.push() on the page ends up inside the worker.
  // `sandboxParent: 'html'` puts Partytown's helper iframe outside <body>. ClientRouter (Astro's
  // client-side navigation) replaces the body on every navigation, and moving the iframe would
  // reload it and restart gtag.
  integrations: [
    icon(),
    partytown({ config: { forward: ['dataLayer.push', 'gtag'], sandboxParent: 'html' } }),
  ],
  build: {
    // The whole CSS (about 12 KB gzipped) is inlined in each page's HTML, so the first paint does
    // not wait for a separate stylesheet request.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // Spanish is the default and has no URL prefix; English pages live under /en/.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
