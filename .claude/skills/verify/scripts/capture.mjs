// Takes screenshots of every route of the built site, in Spanish and English, at a phone width
// (390 px) and a desktop width (1440 px), and saves the visible text of each page at 1440 px in
// texts.json. compare.mjs then diffs two such folders (before and after a change).
// Reduced motion is requested so animations are skipped and two captures of the same build are
// identical.
// Usage: node capture.mjs <outDir>
import fs from 'node:fs';
import { launch, requireServer, url } from './lib.mjs';

const out = process.argv[2];
if (!out) {
  console.error('Usage: node capture.mjs <outDir>');
  process.exit(2);
}
fs.mkdirSync(out, { recursive: true });
await requireServer();

// Routes are relative to the site base. 'no-existe' ("does not exist") is deliberately a missing
// page, to capture the 404.
const routes = ['', 'sobre-mi', 'stack', 'experiencia', 'proyectos', 'contacto', 'cv', 'no-existe'];
const browser = await launch();
const texts = {};
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 664 : 900 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    for (const lang of ['', 'en/']) {
      for (const route of routes) {
        const path = `${lang}${route}`;
        await page.goto(url(path), { waitUntil: 'load' });
        // Let fonts, images and the scroll-to-section jump settle before the screenshot.
        await page.waitForTimeout(900);
        const name = `${width}-${(path || 'home').replace(/\//g, '_')}`;
        await page.screenshot({ path: `${out}/${name}.png` });
        // Text is saved only at desktop width, which is enough to catch changed copy.
        if (width === 1440) {
          texts[path || 'home'] = await page.evaluate(() =>
            document.body.innerText.replace(/\s+/g, ' ').trim()
          );
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
fs.writeFileSync(`${out}/texts.json`, JSON.stringify(texts, null, 1));
console.log('captured', fs.readdirSync(out).length, 'files in', out);
