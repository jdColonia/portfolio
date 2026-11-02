// Shared helpers for the verify scripts (capture.mjs and checks.mjs): browser launch, URL
// building and a tiny pass/fail runner. Exit codes used across the scripts: 1 means a check
// failed, 2 means the scripts could not run at all (bad usage or the preview server is down).
import { chromium } from 'playwright-core';

// URL of the site under test. The production build is served under the base path /portfolio and
// `astro preview` serves that build, so the default includes it. Set VERIFY_URL to test another
// port or build. The regex forces exactly one trailing slash, so `new URL(path, BASE)` resolves
// paths inside the base instead of replacing its last segment.
export const BASE = (process.env.VERIFY_URL ?? 'http://localhost:4323/portfolio/').replace(
  /\/?$/,
  '/'
);
export const BASE_PATH = new URL(BASE).pathname;
export const url = (path = '') => new URL(path, BASE).href;
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Launches the Edge that is already installed (VERIFY_BROWSER=chrome selects Chrome instead), so
// there is no browser to download. playwright-core is used because it does not bundle browsers.
export const launch = (options = {}) =>
  chromium.launch({ channel: process.env.VERIFY_BROWSER ?? 'msedge', ...options });

// Stops with a clear message when the preview server is not reachable or does not answer 200,
// instead of letting every check fail with a confusing browser error.
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

// Prints one PASS/FAIL line. A failure sets the exit code (exitCode, not process.exit) so the
// remaining checks still run and the whole report is printed. Returns `ok` so callers can chain.
export function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) {
    failures += 1;
    process.exitCode = 1;
  }
  return ok;
}

// Prints a note that never fails the run (for known noise or optional observations).
export const info = (message) => console.log(`INFO ${message}`);
export const failureCount = () => failures;

// Runs a check body. An exception (a timeout, a missing element...) is reported as a FAIL for
// `name` instead of aborting the whole run.
export async function guard(name, body) {
  try {
    await body();
  } catch (error) {
    check(name, false, String(error.message).split('\n')[0]);
  }
}
