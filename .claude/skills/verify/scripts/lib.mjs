// Shared helpers for the verify scripts: browser launch, URLs and a tiny check runner.
import { chromium } from 'playwright-core';

// Production base is /portfolio; `astro preview` serves the production build.
export const BASE = (process.env.VERIFY_URL ?? 'http://localhost:4323/portfolio/').replace(
  /\/?$/,
  '/'
);
export const BASE_PATH = new URL(BASE).pathname;
export const url = (path = '') => new URL(path, BASE).href;
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Installed Edge by default; VERIFY_BROWSER=chrome also works. No browser download needed.
export const launch = (options = {}) =>
  chromium.launch({ channel: process.env.VERIFY_BROWSER ?? 'msedge', ...options });

// Exit early with a clear message when the preview server is not reachable.
export async function requireServer() {
  try {
    const res = await fetch(BASE);
    if (res.ok) return;
    console.error(`FAIL server — ${BASE} answered ${res.status}`);
  } catch (error) {
    console.error(`FAIL server — ${BASE} unreachable (${error.cause?.code ?? error.message})`);
  }
  console.error('Run `npm run build` and `npx astro preview --port 4323` first.');
  process.exit(2);
}

let failures = 0;

// Print PASS/FAIL and flag the process as failed.
export function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) {
    failures += 1;
    process.exitCode = 1;
  }
  return ok;
}

export const info = (message) => console.log(`INFO ${message}`);
export const failureCount = () => failures;

// Run a check body; an exception becomes a FAIL instead of aborting the whole run.
export async function guard(name, body) {
  try {
    await body();
  } catch (error) {
    check(name, false, String(error.message).split('\n')[0]);
  }
}
