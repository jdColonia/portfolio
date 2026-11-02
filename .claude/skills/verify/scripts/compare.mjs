// Pixel and text diff of two capture folders.
// Usage: node compare.mjs <baselineDir> <currentDir>
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [baseline, current] = process.argv.slice(2);
if (!baseline || !current) {
  console.error('Usage: node compare.mjs <baselineDir> <currentDir>');
  process.exit(2);
}

const SAVE_DIFF_ABOVE = 0.5; // % changed: save a diff image
const FAIL_ABOVE = 1; // % changed: regression
// Known noise: the browser's embedded PDF viewer toolbar changes the CV page at 1440.
const NOISY = new Set(['1440-cv.png', '1440-en_cv.png']);
const NOISE_NOTE = 'known noise (embedded PDF viewer toolbar), not a regression';

const read = (dir, name) => PNG.sync.read(fs.readFileSync(path.join(dir, name)));
const pngs = (dir) =>
  fs.readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('diff-'));

let failed = false;
const results = [];
for (const name of pngs(baseline).sort()) {
  if (!fs.existsSync(path.join(current, name))) {
    results.push({ name, pct: 100, note: 'missing in current' });
    continue;
  }
  const a = read(baseline, name);
  const b = read(current, name);
  if (a.width !== b.width || a.height !== b.height) {
    results.push({ name, pct: 100, note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}` });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  // threshold 0.1 ~ 24/255 luma delta, antialiasing counted like a plain pixel diff
  const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
    threshold: 0.1,
    includeAA: true,
    diffMask: true,
  });
  const pct = (100 * changed) / (a.width * a.height);
  if (pct > SAVE_DIFF_ABOVE)
    fs.writeFileSync(path.join(current, `diff-${name}`), PNG.sync.write(diff));
  results.push({ name, pct, note: '' });
}
for (const name of pngs(current)) {
  if (!fs.existsSync(path.join(baseline, name))) console.log(`INFO extra in current: ${name}`);
}

results.sort((x, y) => y.pct - x.pct);
console.log(
  'max diff %:',
  results
    .slice(0, 8)
    .map((r) => `${r.name} ${r.pct.toFixed(2)}`)
    .join(' | ')
);
for (const r of results) {
  if (r.pct <= SAVE_DIFF_ABOVE && !r.note) continue;
  const noisy = NOISY.has(r.name);
  const bad = r.pct > FAIL_ABOVE && !noisy;
  if (bad) failed = true;
  const detail = [`${r.pct.toFixed(2)}% changed`, r.note, noisy ? NOISE_NOTE : ''].filter(Boolean);
  console.log(`${bad ? 'FAIL' : noisy ? 'NOTE' : 'WARN'} ${r.name} — ${detail.join(', ')}`);
}

const load = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'texts.json'), 'utf-8'));
const ta = load(baseline);
const tb = load(current);
const bad = Object.keys(ta).filter((k) => ta[k] !== tb[k]);
console.log('text mismatches:', bad.length ? bad.join(', ') : 'none');
for (const key of bad) {
  failed = true;
  const x = ta[key];
  const y = tb[key] ?? '';
  let i = 0;
  while (i < Math.min(x.length, y.length) && x[i] === y[i]) i += 1;
  const excerpt = (s) => s.slice(Math.max(0, i - 60), i + 80);
  console.log(`FAIL text ${key}\n  baseline: ${excerpt(x)}\n  current:  ${excerpt(y)}`);
}

console.log(failed ? 'RESULT FAIL' : 'RESULT PASS');
if (failed) process.exitCode = 1;
