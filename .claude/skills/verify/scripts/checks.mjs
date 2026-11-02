/**
 * @file Behavioural regression checks for the built site, driven by Playwright against the preview
 * server (see the verify SKILL.md for how to start it and how to read the results).
 *
 * Usage: node checks.mjs [name...]   (no names runs every check; the names are the keys of `all` at
 * the bottom of this file).
 *
 * Things to know before editing a check:
 *  - The fixed waits (page.waitForTimeout) are deliberate. The site animates, and the scroll
 *    engine and the analytics worker settle on their own schedule, so there is no single event
 *    to wait for. The values are generous so the checks pass on a slow machine; if one fails,
 *    re-run it alone before suspecting a real regression.
 *  - Several checks are about the projects gallery, which has two modes. On desktop it is
 *    "pinned": GSAP ScrollTrigger holds the section in place (a pin) inside an element called
 *    `.pin-spacer`, which it adds to make the page taller, while scrolling moves the cards
 *    sideways. On phones and tablets it is "sticky": plain CSS `position: sticky`, no spacer.
 *  - Analytics checks watch the GA4 (Google Analytics 4) requests that Partytown sends.
 *    Partytown is a library that runs third-party scripts, here Google's, in a web worker.
 *    ClientRouter is Astro's client-side navigation: pages change without a full reload.
 */

import { BASE, BASE_PATH, check, guard, info, launch, requireServer, url } from './lib.mjs';

// Removes one trailing slash, so "/portfolio/" and "/portfolio" compare as equal.
const trimSlash = (p) => p.replace(/\/$/, '');

// Each check gets its own browser, so a failure or leftover state (storage, listeners) never
// leaks into the next check. `options` are Playwright launch options.
async function withBrowser(options, body) {
  const browser = await launch(options);
  try {
    await body(browser);
  } finally {
    await browser.close();
  }
}

// Desktop gallery: it must be in pinned mode, have a pin spacer taller than the screen, and slide
// the cards to the end while the pin holds. Two scenarios: loading the page directly at 1280 px
// wide, and loading at phone width (390) then resizing to 1280 without reloading, which proves
// the gallery switches modes by itself.
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
        // Wait for the scroll engine to initialize after the load event.
        await page.waitForTimeout(1500);
        // No-op for the first scenario (already 1280x720); the real resize for the second one.
        await page.setViewportSize({ width: 1280, height: 720 });
        // The engine refreshes after a resize and may switch mode; give it time to finish.
        await page.waitForTimeout(1200);
        const r = await page.evaluate(async () => {
          const q = (s) => document.querySelector(s);
          const spacer = q('.pin-spacer');
          const top = spacer.getBoundingClientRect().top + scrollY;
          const res = {
            mode: q('[data-gallery]').dataset.mode,
            // Only the sticky (mobile) mode sets an inline height on this box, so it must be empty.
            scrollH: q('[data-gallery-scroll]').style.height,
            spacerH: spacer.offsetHeight,
          };
          // Scroll to 2 px before the end of the spacer (its bottom minus one 720 px screen):
          // the cards should be at their last position while the pin still holds.
          window.scrollTo(0, top + spacer.offsetHeight - 720 - 2);
          // Let the scroll-linked animation (scrubbed, with a short smoothing delay) catch up.
          await new Promise((done) => setTimeout(done, 1200));
          const tr = getComputedStyle(q('[data-gallery-track]')).transform;
          // m41 is the horizontal translation of the transform; negative means moved left.
          res.endX = Math.round(new DOMMatrix(tr).m41);
          res.pinTop = Math.round(q('[data-gallery-pin]').getBoundingClientRect().top);
          return res;
        });
        // spacerH > 720: the spacer adds scroll distance on top of one screen. pinTop within 2 px
        // of 0: the pinned element is still stuck to the top of the screen (the 2 px absorb
        // rounding and the 2 px offset used when scrolling above).
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

// Scrolls with the mouse wheel `count` times by `delta` px, waits 500 ms after each step so the
// smoothed (scrubbed) animation settles, and returns what `read` reports in the page after each
// step. The mouse must already be over the page for the wheel events to reach it.
async function wheelSteps(page, count, delta, read) {
  const frames = [];
  for (let i = 0; i < count; i += 1) {
    await page.mouse.wheel(0, delta);
    await page.waitForTimeout(500);
    frames.push(await page.evaluate(read));
  }
  return frames;
}

// Mobile gallery: it must use the sticky stage with no pin spacer, and the horizontal track must
// move steadily left (never backwards) while the visitor scrolls. Two scenarios: loading
// directly at 390 px wide, and loading at 1280 then shrinking to 390 without reloading, which
// proves the gallery switches from pinned to sticky mode by itself.
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
        // Wait for the scroll engine to initialize after the load event.
        await page.waitForTimeout(1500);
        if (startWidth !== 390) {
          await page.setViewportSize({ width: 390, height: 664 });
          // The engine refreshes after a resize and may switch mode; give it time to finish.
          await page.waitForTimeout(1200);
        }
        // Jump to the section just above the projects gallery, so the wheel steps below reach the
        // gallery quickly. This relies on the certifications section existing (it is hidden when
        // there are no certifications, which would make this check fail).
        await page.evaluate(() => {
          const s = document.getElementById('certificaciones');
          window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 200);
        });
        await page.waitForTimeout(800);
        // Park the pointer in the middle of the 390x664 screen, where the wheel events go.
        await page.mouse.move(195, 400);
        // 16 steps of 220 px (about 3500 px) give the track plenty of scroll to move through.
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
        // sticky: sticky mode, and no JS pin (a pin would add a .pin-spacer).
        const sticky = frames.every((f) => f.mode === 'sticky' && f.spacers === 0);
        // monotonic: the track x position (negative = moved left) never goes back to the right.
        const monotonic = frames.every((f, i) => i === 0 || f.x <= frames[i - 1].x);
        const advanced = frames.at(-1).x < 0;
        // held: the stage kept the same top for 3 consecutive frames while the track moved, which
        // means it stayed stuck on screen instead of scrolling away with the page.
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

// Mobile layout of the gallery: the spacing between the intro text ("lead") under the Projects
// title and the first card, and the stage sticking at its sticky offset (the `top` value that
// the script computes so the cards sit centered below the fixed header).
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
      // Wait for the scroll engine to initialize after the load event.
      await page.waitForTimeout(1500);
      // Scroll so the intro sits 150 px below the top of the screen: the title, the lead and the
      // first card are all visible, as a visitor would see them arriving at the section.
      await page.evaluate(() => {
        const s = document.querySelector('.projects-intro');
        window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 150);
      });
      await page.waitForTimeout(800);
      // Middle of the 390x664 screen, where the wheel events below go.
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
      // gap: distance between the bottom of the lead text and the top of the first card.
      // clear: the stage (the sticky box with the cards) does not overlap the lead text.
      const gap = first.cardTop - first.leadBottom;
      const clear = first.stageTop >= first.leadBottom;
      // While the track moves, the stage must sit at its sticky offset in at least two frames, and
      // never lower than it. It may only leave upwards, at the end, when the sticky parent ends.
      const moving = frames.filter((f) => f.x < 0);
      const atOffset = moving.filter((f) => f.stageTop === f.stickyTop).length;
      const stuck = atOffset >= 2 && moving.every((f) => f.stageTop <= f.stickyTop);
      // The 20 to 100 px range is a tolerance around the intended spacing, not an exact design
      // value: below 20 px the lead text would nearly touch the cards, and above 100 px a
      // conspicuous empty band would open between them.
      check(
        name,
        gap >= 20 && gap <= 100 && clear && stuck,
        `gap=${gap}px (20-100) clear=${clear} stuck=${stuck}`
      );
      await context.close();
    });
  });
}

// The technology icons come from one external SVG sprite (tech-icons.svg, see
// src/pages/tech-icons.svg.ts). This checks that the sprite is downloaded with status 200, that
// the icons that reference it actually render with a size, and that they turn orange on hover.
async function icons() {
  await withBrowser({}, async (browser) => {
    await guard('icons', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const sprites = [];
      page.on('response', (res) => {
        if (res.url().includes('tech-icons')) sprites.push(res.status());
      });
      // The /stack route renders the home page and scrolls to the stack section.
      await page.goto(url('stack'), { waitUntil: 'load' });
      await page.waitForTimeout(2500);
      const svg = page.locator('#stack svg').first();
      const box = await svg.boundingBox();
      const before = await svg.evaluate((e) => getComputedStyle(e).color);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      // The color change is a 0.2 s CSS transition; 500 ms is enough for it to finish.
      await page.waitForTimeout(500);
      const after = await svg.evaluate((e) => getComputedStyle(e).color);
      // Size of the first three icons as drawn. A <use> whose sprite fragment did not resolve
      // has an empty bounding box (0x0), so this catches a sprite that loaded but did not match.
      const sizes = await page.evaluate(() =>
        [...document.querySelectorAll('svg use[href*="tech-icons"]')].slice(0, 3).map((u) => {
          const b = u.getBBox();
          return [Math.round(b.width), Math.round(b.height)];
        })
      );
      const uses = await page.locator('use[href*="tech-icons"]').count();
      // "Orange" means the hover accent (the site's lava color, #ff3621 = rgb(255, 54, 33)), not
      // the muted idle color: a strong red channel with low green and blue. The limits also accept
      // the slightly lighter lava-400 tint (#ff5f46) in case the accent is adjusted a little.
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

// Starts recording the GA4 "collect" hits (the requests to .../g/collect that Google Analytics
// sends for every event) made by a browser context. Returns an array that fills up as events
// arrive, with one entry per event: its name, the page path and the raw parameters.
//
// A hit carries either one event in its query string or a batch with one event per line of the
// request body. Parameters shared by the whole hit travel in the query. The ones used here are:
//   en       event name (page_view, section_view...)
//   ep.<x>   custom event parameter <x> (for example ep.section)
//   dl       document location: the full URL of the page that sent the event
//   tt       traffic type; the site sets it to "internal" for visits that are not real traffic
//   ae       "a" when Google generated the event automatically (such as its own page views on
//            history changes); `auto` below is true for those.
function collectEvents(context) {
  const events = [];
  context.on('request', (r) => {
    if (!/g\/collect/.test(r.url())) return;
    const query = new URL(r.url()).searchParams;
    const lines = (r.postData() || '').split(/\r?\n/).filter(Boolean);
    // With no body, the event is described by the query alone, hence the single empty line.
    for (const line of lines.length ? lines : ['']) {
      // Shared query params first, then the line's own params on top (they win on a clash).
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

// Google Analytics through Partytown across ClientRouter navigations: the Partytown sandbox
// iframe is created once and survives navigations, there are no console errors, page_view is sent
// on the first load and again after navigating to the CV page, and every hit from localhost is
// flagged as internal traffic.
async function analytics() {
  await withBrowser({}, async (browser) => {
    await guard('analytics', async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      let sandboxLoads = 0;
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)));
      // The sandbox is the hidden iframe where Partytown runs its worker. If it loaded more than
      // once, a navigation re-created it, which would restart Google Analytics.
      context.on('request', (r) => /partytown-sandbox/.test(r.url()) && (sandboxLoads += 1));
      const events = collectEvents(context);
      await page.goto(url(), { waitUntil: 'load' });
      // Time for Partytown to boot and for the first page_view to be sent.
      await page.waitForTimeout(4000);
      // Navigate to the CV page through the header pill (a ClientRouter navigation, no reload).
      await page.locator('.cv-pill').click();
      await page.waitForTimeout(6000);
      await page.locator('header a.site-logo').first().click();
      // Partytown batches hits and sends them with a delay, so wait long enough for the last
      // navigation to be flushed. 8 s is a generous margin, not a measured delay.
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
      // localhost is not the production host, so every hit must carry tt=internal (the
      // traffic_type parameter). A GA filter drops that traffic, so tests never pollute real data.
      const untagged = events.filter((e) => e.params.get('tt') !== 'internal').length;
      check(
        'analytics: localhost hits flagged internal (tt=internal)',
        events.length > 0 && untagged === 0,
        `events=${events.length} untagged=${untagged}`
      );
      // The page_view of the return to the home page may not be flushed before the script ends, so
      // it is only reported, never a failure.
      info(
        `analytics: back-home page_view sent=${pageViews.filter((p) => p === home).length > 1} (optional)`
      );
      await context.close();
    });
  });
}

// The site's custom analytics events (declared with `data-track` attributes in the markup) and
// the page_view accounting: section_view, project_click, contact_click, cv_open and cv_download
// must be sent with the right parameters, and page_view must be sent once per real page, never
// once per section. The hits go to the real GA property but carry tt=internal, so the Internal
// Traffic filter in GA drops them.
async function analyticsEvents() {
  await withBrowser({}, async (browser) => {
    await guard('analytics-events', async () => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        acceptDownloads: true,
      });
      const page = await context.newPage();
      // External links and the PDF open in a new tab. Close it right away: only the click
      // matters, since the event is sent when the click happens.
      context.on('page', (popup) => popup.close().catch(() => {}));
      const events = collectEvents(context);

      await page.goto(url(), { waitUntil: 'load' });
      // Time for Partytown to boot and for the first hits to be sent.
      await page.waitForTimeout(3500);
      // Scroll into the projects section: this should produce a section_view event, but no
      // page_view (a section is not a page).
      await page.evaluate(() => {
        const s = document.getElementById('proyectos');
        window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY + 100);
      });
      await page.waitForTimeout(2000);
      // The click has a longer timeout (8 s) because the card may still be animating into place.
      await page.locator('[data-card] .card-links a').first().click({ timeout: 8000 });
      await page.waitForTimeout(500);
      await page.locator('.dock-link').first().click(); // GitHub link in the side dock
      await page.waitForTimeout(500);
      await page.locator('.cv-pill').click(); // ClientRouter navigation from home to the CV page
      await page.waitForTimeout(3500);
      // Register the download listener before the click that triggers it, then cancel the
      // download: the file itself is not needed.
      const download = page.waitForEvent('download', { timeout: 8000 });
      await page.locator('.cv-actions-top a[download]').click();
      await (await download).cancel().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('.cv-actions-top a[target="_blank"]').click();
      // Partytown batches hits and sends them with a delay; wait long enough for the last click
      // to be flushed (a little longer than in `analytics`, as this check sends more events).
      await page.waitForTimeout(9000);

      // `find` returns the first event with that name whose custom parameters (ep.*) match
      // `expected`. `seen` turns that into a PASS/FAIL line.
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

      // page_view: exactly one per real page (the home load, then the ClientRouter navigation to
      // the CV page); scrolling through sections must add none. Events that Google generated by
      // itself (`auto`) are excluded here and only reported below.
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

// Internal-traffic flag. Visiting any page with ?interno=1 stores `ga_internal` in localStorage,
// so later hits are marked tt=internal even on the production host; ?interno=0 removes it. The
// flag is read inside the Partytown worker, which is why this is tested end to end.
// To prove that only the flag decides, the test makes the page believe localhost is the production
// host (it rewrites the host name in the page's inline script), and it aborts every collect hit
// so these visits never reach Google Analytics.
async function analyticsInternal() {
  await withBrowser({}, async (browser) => {
    await guard('analytics-internal', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const { hostname } = new URL(BASE);
      // Regex that matches only the home document (the base URL with an optional query string),
      // not its assets; the base is escaped so its dots and slashes are literal.
      const escaped = trimSlash(BASE).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      // Replace the production host name in the inline script by the local host name. The page
      // then treats localhost as production, so the host check no longer marks it internal.
      await context.route(new RegExp(`${escaped}/?(\\?.*)?$`), async (route) => {
        const res = await route.fetch();
        const body = (await res.text()).replace("'jdcolonia.github.io'", `'${hostname}'`);
        await route.fulfill({ response: res, body });
      });
      // Record the tt value of each hit and abort the request, so nothing reaches Google.
      const tags = [];
      await context.route(/g\/collect/, (route) => {
        tags.push(new URL(route.request().url()).searchParams.get('tt'));
        return route.abort();
      });
      // Opens a fresh page at `query` and reports what happened as a short string:
      // the tt value of the first hit ("internal", "null" when absent, or "no-hit" if none was
      // sent) plus "+stored" when localStorage has the ga_internal flag.
      const visit = async (query) => {
        tags.length = 0;
        const page = await context.newPage();
        await page.goto(url(query), { waitUntil: 'load' });
        // Poll up to 20 s (40 x 500 ms) for the first hit, since Partytown needs time to boot.
        for (let i = 0; i < 40 && !tags.length; i += 1) await page.waitForTimeout(500);
        await page.waitForTimeout(1000);
        const stored = await page.evaluate(() => localStorage.getItem('ga_internal'));
        await page.close();
        return `${tags.length ? String(tags[0]) : 'no-hit'}${stored ? '+stored' : ''}`;
      };
      // Each step is [query to visit, expected result]. The flag set by ?interno=1 must persist
      // on the next plain visit and disappear after ?interno=0.
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

// The 404 page in Spanish and English: the server must answer with status 404, the page must set
// the matching <html lang> (done in the browser by not-found.ts from the URL), and it must show
// the "404" content.
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

// A smoke test of the site with animations enabled (the other checks mostly look at one feature):
// the 3D crystal, the hero reveal, the pinned gallery, experience tabs, desktop navigation,
// ClientRouter navigation home to CV and back, the mobile menu, the English 404 and, at the end,
// that nothing logged a console or page error.
async function live() {
  // These flags make Chromium draw WebGL in software (SwiftShader), so the three.js crystal can
  // run in headless mode on a machine without a usable GPU. It is slow, which is why a crystal
  // in the 'fallback' state is also accepted below.
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  await withBrowser({ args }, async (browser) => {
    await guard('live', async () => {
      const errors = [];
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 120)));
      // Crystal state is written by the crystal script to data-crystal: 'loading', 'ready'
      // (three.js scene running) or 'fallback' (static image shown instead).
      const crystalState = () =>
        page.evaluate(() => document.getElementById('crystal-root')?.dataset.crystal);
      const pinSpacers = () => page.evaluate(() => document.querySelectorAll('.pin-spacer').length);

      await page.goto(url(), { waitUntil: 'load' });
      // Time for three.js to load lazily and for the hero entrance animation to finish.
      await page.waitForTimeout(3500);
      const crystal = await crystalState();
      // The hero title is split into characters that fade in; opacity 1 means the reveal ended.
      const heroOpacity = await page.evaluate(
        () => getComputedStyle(document.querySelector('.hero-char')).opacity
      );
      const spacers0 = await pinSpacers();
      // 'fallback' is accepted because headless software WebGL can be too slow to reach 'ready'.
      check('live: crystal mounted', ['ready', 'fallback'].includes(crystal), `crystal=${crystal}`);
      check('live: hero text revealed', heroOpacity === '1', `opacity=${heroOpacity}`);
      check('live: gallery pinned on desktop', spacers0 >= 1, `pin-spacers=${spacers0}`);

      await page.goto(url('experiencia'), { waitUntil: 'load' });
      await page.waitForTimeout(2500);
      // Experience tabs: click the second tab; it must become selected and exactly one panel
      // must be visible (the others hidden).
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

      // Desktop nav: clicking "Proyectos" must update the URL to the clean section route and
      // mark that link as the active one (the wait covers the smooth scroll to the section).
      await page.locator('#desktop-nav a', { hasText: 'Proyectos' }).click();
      await page.waitForTimeout(2500);
      const navUrl = new URL(page.url()).pathname;
      // The active link may be marked with any of these attributes or classes.
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

      // ClientRouter round trip: home to the CV page through the header pill, then back home
      // through the logo. The second selector hardcodes the production base (/portfolio) as a
      // fallback in case the logo class changes.
      await page.locator('.cv-pill').click();
      await page.waitForTimeout(2500);
      const cvUrl = new URL(page.url()).pathname;
      await page.locator('a.site-logo, header a[href="/portfolio"]').first().click();
      await page.waitForTimeout(3000);
      const backUrl = new URL(page.url()).pathname;
      const routerOk = cvUrl === `${BASE_PATH}cv` && trimSlash(backUrl) === trimSlash(BASE_PATH);
      check('live: ClientRouter home -> cv -> home', routerOk, `cv=${cvUrl} back=${backUrl}`);
      // Back on the home page the gallery must be pinned again, with exactly one spacer. Zero
      // would mean it was not re-initialized; two would mean the old pin was not cleaned up.
      const spacers = await pinSpacers();
      check('live: gallery re-pinned after navigation', spacers === 1, `pin-spacers=${spacers}`);
      // A 'fallback' crystal after navigating is known noise in headless (slow software WebGL);
      // only a crystal that never mounted fails.
      const crystalAfter = await crystalState();
      check(
        'live: crystal after navigation',
        ['ready', 'fallback'].includes(crystalAfter),
        `crystalAfterNav=${crystalAfter}`
      );

      // Phone-sized context: open the menu button, pick "Stack", then check that the menu closes
      // again and the page lands with the stack section at the top of the screen.
      const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 700 } });
      const m = await mobileCtx.newPage();
      m.on('pageerror', (e) => errors.push(`m:${e.message}`));
      await m.goto(url(), { waitUntil: 'load' });
      await m.waitForTimeout(2000);
      await m.click('#mobile-menu-btn');
      // Wait for the menu opening animation to end.
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
      // The section top may be a few pixels off 0 because of rounding and sub-pixel scrolling,
      // so up to 4 px is accepted.
      const landed = mUrl === `${BASE_PATH}stack` && closed === 'false' && Math.abs(stackTop) <= 4;
      check(
        'live: mobile nav closes menu and lands on section',
        landed,
        `url=${mUrl} expanded=${closed} stackTop=${stackTop}`
      );

      // English 404: not-found.ts must set lang="en", translate the title, and the page must
      // keep its noindex robots tag so search engines do not index it.
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

// Registry of the checks: the names accepted on the command line, in the order they run by default.
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

// Command-line names, if any. An unknown name stops the run with exit code 2 before any browser
// is launched.
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
