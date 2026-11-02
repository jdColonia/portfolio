/**
 * @file Compares two folders produced by capture.mjs (a baseline taken before a change and the
 * current state) and reports what differs: screenshots pixel by pixel and the saved page text.
 *
 * Exits with 1 when an image changes by more than 1% (except known noise) or any text differs.
 * Usage: node compare.mjs <baselineDir> <currentDir>
 */

import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [baseline, current] = process.argv.slice(2);
if (!baseline || !current) {
  console.error('Usage: node compare.mjs <baselineDir> <currentDir>');
  process.exit(2);
}

// Thresholds are the percentage of pixels that differ in one screenshot. Below 0.5% is treated as
// harmless rendering jitter; between 0.5% and 1% a diff image is saved for a human to look at;
// above 1% is treated as a regression.
const SAVE_DIFF_ABOVE = 0.5; // above this, write a diff-<name>.png next to the current captures
const FAIL_ABOVE = 1; // above this, the comparison fails
// Known noise: the toolbar of the browser's built-in PDF viewer changes the CV page at 1440, so
// these two images are reported as a NOTE and never fail the run.
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
  // Different dimensions cannot be diffed pixel by pixel (the page got taller or shorter), so
  // count them as fully different.
  if (a.width !== b.width || a.height !== b.height) {
    results.push({ name, pct: 100, note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}` });
    continue;
  }
  const diff = new PNG({ width: a.width, height: a.height });
  // `threshold` is pixelmatch's color-distance tolerance (0 to 1); 0.1 ignores differences below
  // about 24 out of 255 in brightness. includeAA counts anti-aliased edge pixels as differences
  // too, instead of ignoring them. diffMask draws only the differing pixels on a transparent
  // background (not on top of the original image).
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
// Screenshots that exist only in the current folder (for example a new route) are not a failure.
for (const name of pngs(current)) {
  if (!fs.existsSync(path.join(baseline, name))) console.log(`INFO extra in current: ${name}`);
}

// Summary line with the worst offenders first, then one line per image that needs attention:
// FAIL (regression, including missing or resized images), NOTE (known noise) or WARN (between
// 0.5% and 1%).
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

// Text comparison: any difference in the visible text of a page fails, and the output shows the
// first point where the two versions diverge (about 60 characters before it and 80 after).
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
