// Behavioural regression checks. Usage: node checks.mjs [name...]  (no args = all)
import { BASE, BASE_PATH, check, guard, info, launch, requireServer, url } from './lib.mjs';

const trimSlash = (p) => p.replace(/\/$/, '');

// Each check gets its own browser so a failure never leaks state into the next one.
async function withBrowser(options, body) {
  const browser = await launch(options);
  try {
    await body(browser);
  } finally {
    await browser.close();
  }
}

// Desktop gallery: pinned mode, pin spacer, track reaches the end and the pin holds until then.
// Covers both a direct 1280 load and a 390 -> 1280 resize without reload.
async function galleryPin() {
  await withBrowser({}, async (browser) => {
    for (const [label, width, height] of [
      ['load 1280', 1280, 720],
      ['resize 390->1280', 390, 664],
    ]) {
      const name = `gallery-pin (${label})`;
      await guard(name, async () => {
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.goto(url(), { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(1200);
        const r = await page.evaluate(async () => {
          const q = (s) => document.querySelector(s);
          const spacer = q('.pin-spacer');
          const top = spacer.getBoundingClientRect().top + scrollY;
          const res = {
            mode: q('[data-gallery]').dataset.mode,
            scrollH: q('[data-gallery-scroll]').style.height,
            spacerH: spacer.offsetHeight,
          };
          window.scrollTo(0, top + spacer.offsetHeight - 720 - 2);
          await new Promise((done) => setTimeout(done, 1200));
          const tr = getComputedStyle(q('[data-gallery-track]')).transform;
          res.endX = Math.round(new DOMMatrix(tr).m41);
          res.pinTop = Math.round(q('[data-gallery-pin]').getBoundingClientRect().top);
          return res;
        });
        const ok =
          r.mode === 'pinned' &&
          r.scrollH === '' &&
          r.spacerH > 720 &&
          r.endX < 0 &&
          Math.abs(r.pinTop) <= 2;
        check(name, ok, JSON.stringify(r));
        await context.close();
      });
    }
  });
}

// Mouse-wheel through the gallery, reading page state after every step.
async function wheelSteps(page, count, delta, read) {
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(500);
    frames.push(await page.evaluate(read));
  }
  return frames;
}

// Mobile gallery: sticky stage, horizontal track advances monotonically, nothing pinned.
// Covers a direct 390 load and a 1280 -> 390 resize without reload.
async function galleryWheel() {
  await withBrowser({}, async (browser) => {
    for (const startWidth of [390, 1280]) {
      const name = `gallery-wheel (start ${startWidth}->390)`;
      await guard(name, async () => {
        const context = await browser.newContext({
          viewport: { width: startWidth, height: startWidth === 390 ? 664 : 720 },
          hasTouch: true,
        });
        const page = await context.newPage();
        await page.goto(url(), { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        if (startWidth !== 390) {
          await page.setViewportSize({ width: 390, height: 664 });
          await page.waitForTimeout(1200);
        }
        await page.evaluate(() => {
          const s = document.getElementById('certificaciones');
          window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 200);
        });
        await page.waitForTimeout(800);
        await page.mouse.move(195, 400);
        const frames = await wheelSteps(page, 16, 220, () => {
          const q = (s) => document.querySelector(s);
          const tr = getComputedStyle(q('[data-gallery-track]')).transform;
          return {
            mode: q('[data-gallery]')?.dataset.mode,
            spacers: document.querySelectorAll('.pin-spacer').length,
            stageTop: Math.round(q('[data-gallery-stage]').getBoundingClientRect().top),
            x: Math.round(new DOMMatrix(tr).m41),
          };
        });
        const sticky = frames.every((f) => f.mode === 'sticky' && f.spacers === 0);
        const monotonic = frames.every((f, i) => i === 0 || f.x <= frames[i - 1].x);
        const advanced = frames.at(-1).x < 0;
        // stage held in place (same top) for 3 consecutive frames while the track moved
        const held = frames.some(
          (f, i) =>
            i >= 2 &&
            f.stageTop === frames[i - 1].stageTop &&
            f.stageTop === frames[i - 2].stageTop &&
            f.x < frames[i - 2].x
        );
        const ok = sticky && monotonic && advanced && held;
        const detail = `sticky=${sticky} monotonic=${monotonic} advanced=${advanced} held=${held}`;
        check(name, ok, `${detail} endX=${frames.at(-1).x}`);
        await context.close();
      });
    }
  });
}

// Mobile: gap between the "Proyectos" lead and the cards, and the stage sticking at its offset.
async function galleryGap() {
  await withBrowser({}, async (browser) => {
    const name = 'gallery-gap (mobile 390)';
    await guard(name, async () => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 664 },
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(url(), { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        const s = document.querySelector('.projects-intro');
        window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 150);
      });
      await page.waitForTimeout(800);
      await page.mouse.move(195, 332);
      const read = () => {
        const r = (sel) => document.querySelector(sel).getBoundingClientRect();
        const stage = document.querySelector('[data-gallery-stage]');
        const tr = getComputedStyle(document.querySelector('[data-gallery-track]')).transform;
        return {
          leadBottom: Math.round(r('.projects-lead').bottom),
          stageTop: Math.round(r('[data-gallery-stage]').top),
          cardTop: Math.round(r('[data-card]').top),
          stickyTop: parseFloat(getComputedStyle(stage).top),
          x: Math.round(new DOMMatrix(tr).m41),
        };
      };
      const first = await page.evaluate(read);
      const frames = await wheelSteps(page, 6, 200, read);
      const gap = first.cardTop - first.leadBottom;
      const clear = first.stageTop >= first.leadBottom;
      // while the track moves, the stage sits at its sticky offset (it only leaves upwards at the end)
      const moving = frames.filter((f) => f.x < 0);
      const atOffset = moving.filter((f) => f.stageTop === f.stickyTop).length;
      const stuck = atOffset >= 2 && moving.every((f) => f.stageTop <= f.stickyTop);
      check(
        name,
        gap >= 20 && gap <= 100 && clear && stuck,
        `gap=${gap}px (20-100) clear=${clear} stuck=${stuck}`
      );
      await context.close();
    });
  });
}

// External SVG sprite (tech-icons.svg) loads and icons turn orange on hover.
async function icons() {
  await withBrowser({}, async (browser) => {
    await guard('icons', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const sprites = [];
      page.on('response', (res) => {
        if (res.url().includes('tech-icons')) sprites.push(res.status());
      });
      await page.goto(url('stack'), { waitUntil: 'load' });
      await page.waitForTimeout(2500);
      const svg = page.locator('#stack svg').first();
      const box = await svg.boundingBox();
      const before = await svg.evaluate((e) => getComputedStyle(e).color);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);
      const after = await svg.evaluate((e) => getComputedStyle(e).color);
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll('svg use[href*="tech-icons"]')].slice(0, 3).map((u) => {
          const b = u.getBBox();
          return [Math.round(b.width), Math.round(b.height)];
        })
      );
      const uses = await page.locator('use[href*="tech-icons"]').count();
      const [r, g, b] = after.match(/\d+/g).map(Number);
      const orange = r > 200 && g < 130 && b < 90;
      const loaded = sprites.length >= 1 && sprites.every((s) => s === 200);
      const sized = uses > 0 && sizes.length > 0 && sizes.every(([w, h]) => w > 0 && h > 0);
      check('icons: sprite loaded', loaded, `requests=${sprites.length} status=${sprites}`);
      check('icons: sprite icons rendered', sized, `uses=${uses} sizes=${JSON.stringify(sizes)}`);
      check('icons: orange hover', before !== after && orange, `${before} -> ${after}`);
      await context.close();
    });
  });
}

// GA4 collect hits of a browser context, one entry per event. A hit carries either one event in
// the query string or a batch (one body line per event); the common params (dl, tt...) travel in
// the query. `auto` marks events GA itself generated (ae=a), such as its history page views.
function collectEvents(context) {
  const events = [];
  context.on('request', (r) => {
    if (!/g\/collect/.test(r.url())) return;
    const query = new URL(r.url()).searchParams;
    const lines = (r.postData() || '').split(/\r?\n/).filter(Boolean);
    for (const line of lines.length ? lines : ['']) {
      const params = new URLSearchParams(query);
      for (const [key, value] of new URLSearchParams(line)) params.set(key, value);
      const dl = params.get('dl');
      events.push({
        name: params.get('en'),
        path: dl ? new URL(dl).pathname : null,
        auto: params.get('ae') === 'a',
        params,
      });
    }
  });
  return events;
}

// Google Analytics through Partytown across ClientRouter navigations.
async function analytics() {
  await withBrowser({}, async (browser) => {
    await guard('analytics', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      let sandboxLoads = 0;
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
      context.on('request', (r) => /partytown-sandbox/.test(r.url()) && (sandboxLoads += 1));
      const events = collectEvents(context);
      await page.goto(url(), { waitUntil: 'load' });
      await page.waitForTimeout(4000);
      await page.locator('.cv-pill').click();
      await page.waitForTimeout(6000);
      await page.locator('header a.site-logo').first().click();
      // hits are batched by Partytown; give them time to flush
      await page.waitForTimeout(8000);
      const pageViews = events.filter((e) => e.name === 'page_view').map((e) => e.path);
      const home = trimSlash(BASE_PATH);
      check('analytics: sandbox loaded once', sandboxLoads === 1, `loads=${sandboxLoads}`);
      check('analytics: no console errors', errors.length === 0, errors.join(' | '));
      check('analytics: page_view on first load', pageViews.includes(home), `hits=${pageViews}`);
      check(
        'analytics: page_view after ClientRouter nav',
        pageViews.includes(`${home}/cv`),
        `hits=${pageViews}`
      );
      // localhost is not the production host: every hit must carry tt=internal (traffic_type)
      const untagged = events.filter((e) => e.params.get('tt') !== 'internal').length;
      check(
        'analytics: localhost hits flagged internal (tt=internal)',
        events.length > 0 && untagged === 0,
        `events=${events.length} untagged=${untagged}`
      );
      // the page_view of the last navigation may not be flushed before the script ends
      info(
        `analytics: back-home page_view sent=${pageViews.filter((p) => p === home).length > 1} (optional)`
      );
      await context.close();
    });
  });
}

// Custom events (data-track) and page_view accounting. Hits go to the real GA property but are
// flagged tt=internal, so the Internal Traffic filter drops them.
async function analyticsEvents() {
  await withBrowser({}, async (browser) => {
    await guard('analytics-events', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      // External links and the PDF open in a new tab: close it, the click is all that matters.
      context.on('page', (popup) => popup.close().catch(() => {}));
      const events = collectEvents(context);

      await page.goto(url(), { waitUntil: 'load' });
      await page.waitForTimeout(3500);
      // Scroll through sections: section_view yes, page_view no.
      await page.evaluate(() => {
        const s = document.getElementById('proyectos');
        window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 100);
      });
      await page.waitForTimeout(2000);
      await page.locator('[data-card] .card-links a').first().click({ timeout: 8000 });
      await page.waitForTimeout(500);
      await page.locator('.dock-link').first().click(); // GitHub in the side dock
      await page.waitForTimeout(500);
      await page.locator('.cv-pill').click(); // ClientRouter: home -> cv
      await page.waitForTimeout(3500);
      const download = page.waitForEvent('download', { timeout: 8000 });
      await page.locator('.cv-actions-top a[download]').click();
      await (await download).cancel().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('.cv-actions-top a[target="_blank"]').click();
      // hits are batched by Partytown; give them time to flush
      await page.waitForTimeout(9000);

      const find = (name, expected) =>
        events.find(
          (e) =>
            e.name === name &&
            Object.entries(expected).every(([key, value]) => e.params.get(`ep.${key}`) === value)
        );
      const seen = (name, expected) => {
        const e = find(name, expected);
        return check(
          `analytics-events: ${name} ${JSON.stringify(expected)}`,
          Boolean(e),
          e ? '' : `events=${[...new Set(events.map((x) => x.name))]}`
        );
      };
      seen('section_view', { section: 'proyectos' });
      seen('project_click', { link_type: 'repo' });
      check(
        'analytics-events: project_click carries project_id',
        Boolean(find('project_click', {})?.params.get('ep.project_id'))
      );
      seen('contact_click', { method: 'github', location: 'dock' });
      seen('cv_open', { cv_language: 'es', location: 'nav' });
      seen('cv_download', { cv_language: 'es', location: 'cv_page' });
      seen('cv_open', { cv_language: 'es', location: 'cv_page' });

      // page_view: one per real page (home load + ClientRouter nav to cv); sections add none.
      const home = trimSlash(BASE_PATH);
      const mine = events.filter((e) => e.name === 'page_view' && !e.auto).map((e) => e.path);
      const count = (p) => mine.filter((x) => x === p).length;
      check(
        'analytics-events: one page_view per page, none per section',
        mine.length === 2 && count(home) === 1 && count(`${home}/cv`) === 1,
        `site page_views=${mine}`
      );
      const auto = events.filter((e) => e.name === 'page_view' && e.auto).map((e) => e.path);
      info(
        auto.length
          ? `analytics-events: GA still sends history page_views (ae=a) ${auto}: disable "Page changes based on browser history events" in GA Enhanced measurement`
          : 'analytics-events: GA sent no history page_views'
      );
      await context.close();
    });
  });
}

// ?interno=1 stores the ga_internal flag (read by the Partytown worker), ?interno=0 clears it.
// localhost is rewritten into the "production" host so only the flag can mark traffic internal;
// the hits are aborted, so these loads never reach GA.
async function analyticsInternal() {
  await withBrowser({}, async (browser) => {
    await guard('analytics-internal', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const { hostname } = new URL(BASE);
      const escaped = trimSlash(BASE).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      await context.route(new RegExp(`${escaped}/?(\\?.*)?$`), async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace("'jdcolonia.github.io'", `'${hostname}'`);
        await route.fulfill({ response: res, body });
      });
      const tags = [];
      await context.route(/g\/collect/, (route) => {
        tags.push(new URL(route.request().url()).searchParams.get('tt'));
        return route.abort();
      });
      const visit = async (query) => {
        tags.length = 0;
        const page = await context.newPage();
        await page.goto(url(query), { waitUntil: 'load' });
        for (let i = 0; i < 40 && !tags.length; i += 1) await page.waitForTimeout(500);
        await page.waitForTimeout(1000);
        const stored = await page.evaluate(() => localStorage.getItem('ga_internal'));
        await page.close();
        return `${tags.length ? String(tags[0]) : 'no-hit'}${stored ? '+stored' : ''}`;
      };
      const steps = [
        ['', 'null'],
        ['?interno=1', 'internal+stored'],
        ['', 'internal+stored'],
        ['?interno=0', 'null'],
        ['', 'null'],
      ];
      const got = [];
      for (const [query] of steps) got.push(await visit(query));
      check(
        'analytics-internal: ?interno=1 flags, ?interno=0 clears (localStorage read in Partytown)',
        steps.every(([, want], i) => got[i] === want),
        steps.map(([q, want], i) => `${q || '(none)'} -> ${got[i]} (want ${want})`).join(' | ')
      );
      await context.close();
    });
  });
}

// 404 pages in ES and EN: status, language and content.
async function notFound() {
  await withBrowser({}, async (browser) => {
    await guard('not-found', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      for (const [path, lang] of [
        ['no-existe', 'es'],
        ['en/does-not-exist', 'en'],
      ]) {
        const res = await page.goto(url(path), { waitUntil: 'load' });
        await page.waitForTimeout(800);
        const htmlLang = await page.evaluate(() => document.documentElement.lang);
        const text = await page.innerText('main');
        const ok = res.status() === 404 && htmlLang === lang && text.includes('404');
        check(
          `not-found: ${path}`,
          ok,
          `status=${res.status()} lang=${htmlLang} text=${JSON.stringify(text.slice(0, 60))}`
        );
      }
      await context.close();
    });
  });
}

// Interactions with motion enabled: hero, tabs, nav, ClientRouter, mobile menu, EN 404, console.
async function live() {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  await withBrowser({ args }, async (browser) => {
    await guard('live', async () => {
      const errors = [];
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)));
      const crystalState = () =>
        page.evaluate(() => document.getElementById('crystal-root')?.dataset.crystal);
      const pinSpacers = () => page.evaluate(() => document.querySelectorAll('.pin-spacer').length);

      await page.goto(url(), { waitUntil: 'load' });
      await page.waitForTimeout(3500);
      const crystal = await crystalState();
      const heroOpacity = await page.evaluate(
        () => getComputedStyle(document.querySelector('.hero-char')).opacity
      );
      const spacers0 = await pinSpacers();
      // 'fallback' is accepted: WebGL runs on slow software rendering in headless
      check('live: crystal mounted', ['ready', 'fallback'].includes(crystal), `crystal=${crystal}`);
      check('live: hero text revealed', heroOpacity === '1', `opacity=${heroOpacity}`);
      check('live: gallery pinned on desktop', spacers0 >= 1, `pin-spacers=${spacers0}`);

      await page.goto(url('experiencia'), { waitUntil: 'load' });
      await page.waitForTimeout(2500);
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      await tabs.nth(1).click();
      await page.waitForTimeout(700);
      const selected = await tabs.nth(1).getAttribute('aria-selected');
      const panels = await page.locator('[role="tabpanel"]:visible').count();
      const tabsOk = tabCount > 1 && selected === 'true' && panels === 1;
      check(
        'live: experience tabs',
        tabsOk,
        `tabs=${tabCount} selected=${selected} visiblePanels=${panels}`
      );

      await page.locator('#desktop-nav a', { hasText: 'Proyectos' }).click();
      await page.waitForTimeout(2500);
      const navUrl = new URL(page.url()).pathname;
      const activeSel =
        '#desktop-nav [aria-current="true"], #desktop-nav .is-active, #desktop-nav [aria-current="page"]';
      const active = await page.evaluate(
        (sel) => document.querySelector(sel)?.textContent?.trim(),
        activeSel
      );
      check(
        'live: desktop nav',
        navUrl === `${BASE_PATH}proyectos` && active === 'Proyectos',
        `url=${navUrl} active=${active}`
      );

      await page.locator('.cv-pill').click();
      await page.waitForTimeout(2500);
      const cvUrl = new URL(page.url()).pathname;
      await page.locator('a.site-logo, header a[href="/portfolio"]').first().click();
      await page.waitForTimeout(3000);
      const backUrl = new URL(page.url()).pathname;
      const routerOk = cvUrl === `${BASE_PATH}cv` && trimSlash(backUrl) === trimSlash(BASE_PATH);
      check('live: ClientRouter home -> cv -> home', routerOk, `cv=${cvUrl} back=${backUrl}`);
      const spacers = await pinSpacers();
      check('live: gallery re-pinned after navigation', spacers === 1, `pin-spacers=${spacers}`);
      // crystalAfterNav 'fallback' is known noise in headless; only a missing mount fails
      const crystalAfter = await crystalState();
      check(
        'live: crystal after navigation',
        ['ready', 'fallback'].includes(crystalAfter),
        `crystalAfterNav=${crystalAfter}`
      );

      const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 700 } });
      const m = await mobileCtx.newPage();
      m.on('pageerror', (e) => errors.push(`m:${e.message}`));
      await m.goto(url(), { waitUntil: 'load' });
      await m.waitForTimeout(2000);
      await m.click('#mobile-menu-btn');
      await m.waitForTimeout(900);
      const expanded = await m.getAttribute('#mobile-menu-btn', 'aria-expanded');
      await m.locator('#mobile-nav a', { hasText: 'Stack' }).click();
      await m.waitForTimeout(2000);
      const mUrl = new URL(m.url()).pathname;
      const closed = await m.getAttribute('#mobile-menu-btn', 'aria-expanded');
      const stackTop = await m.evaluate(() =>
        Math.round(document.getElementById('stack').getBoundingClientRect().top)
      );
      check('live: mobile menu opens', expanded === 'true', `aria-expanded=${expanded}`);
      const landed = mUrl === `${BASE_PATH}stack` && closed === 'false' && Math.abs(stackTop) <= 4;
      check(
        'live: mobile nav closes menu and lands on section',
        landed,
        `url=${mUrl} expanded=${closed} stackTop=${stackTop}`
      );

      await m.goto(url('en/nope'), { waitUntil: 'load' });
      await m.waitForTimeout(800);
      const nf = await m.evaluate(() => [
        document.documentElement.lang,
        document.querySelector('[data-i18n="title"]')?.textContent,
        document.querySelector('meta[name=robots]')?.content,
      ]);
      check(
        'live: EN 404 (lang, title, noindex)',
        nf[0] === 'en' && Boolean(nf[1]) && nf[2] === 'noindex',
        JSON.stringify(nf)
      );

      check('live: no console/page errors', errors.length === 0, errors.join(' | '));
      await mobileCtx.close();
      await context.close();
    });
  });
}

const all = {
  'gallery-pin': galleryPin,
  'gallery-wheel': galleryWheel,
  'gallery-gap': galleryGap,
  icons,
  analytics,
  'analytics-events': analyticsEvents,
  'analytics-internal': analyticsInternal,
  'not-found': notFound,
  live,
};

const wanted = process.argv.slice(2);
const unknown = wanted.filter((n) => !(n in all));
if (unknown.length) {
  console.error(
    `Unknown check(s): ${unknown.join(', ')}. Available: ${Object.keys(all).join(', ')}`
  );
  process.exit(2);
}
await requireServer();
for (const name of wanted.length ? wanted : Object.keys(all)) {
  await all[name]();
}
