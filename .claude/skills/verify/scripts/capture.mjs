// Deterministic captures (reduced motion): every route in ES/EN at 390 and 1440, plus visible text.
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
        await page.waitForTimeout(900);
        const name = `${width}-${(path || 'home').replace(/\//g, '_')}`;
        await page.screenshot({ path: `${out}/${name}.png` });
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
