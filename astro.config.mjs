import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import partytown from '@astrojs/partytown';

// https://astro.build/config
export default defineConfig({
  site: 'https://jdcolonia.github.io',
  base: process.env.NODE_ENV === 'production' ? '/portfolio' : '/',
  // Google Analytics runs in a web worker: gtag.js never touches the main thread. The sandbox
  // iframe lives outside <body> (sandboxParent): the ClientRouter swaps the body on every
  // navigation, and moving the iframe would reload it and restart gtag.
  integrations: [
    icon(),
    partytown({ config: { forward: ['dataLayer.push', 'gtag'], sandboxParent: 'html' } }),
  ],
  build: {
    // The CSS (~12 KB gzip) ships inside the HTML: the first paint waits on no extra request.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
