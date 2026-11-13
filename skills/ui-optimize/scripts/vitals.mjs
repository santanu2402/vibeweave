#!/usr/bin/env node
// Lab performance check in a real browser: TTFB, FCP, LCP (+ the LCP element), CLS (+ what shifted),
// TBT (the lab proxy for INP), page weight by type, third parties, render-blocking resources and
// concrete opportunities (lazy LCP image, oversized images, eager offscreen images, too many fonts…).
//
// Usage: node vitals.mjs <url> [--runs 3] [--desktop] [--no-throttle] [--json] [--out .design-review]
//   default profile = mobile: 390×844, 4× CPU slowdown, ~slow-4G network (like Lighthouse mobile)
//   every run uses a fresh context (cold cache); a run whose navigation is aborted (net::ERR_ABORTED) is redone
//   once from scratch in a new context — never re-navigated warm — and the report says so
//   numbers are medians; startup-script diagnostics (forced layout, long tasks before first paint, culprit scripts)
//   are merged across runs, because any one run can miss a startup task — say how many runs saw each
// Requires Playwright resolvable from the current project:
//   npm i -D playwright && npx playwright install chromium   (an installed Chrome/Edge also works)
// All browser tools accept --max-time <seconds> (default here: 120 per run). A run cut short is never a pass: it writes
// the partial report with "verdict": "INCOMPLETE", prints what was not verified and exits 124.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
/** Accept only http(s) targets ("localhost:3000" → http://localhost:3000); file:, data: and javascript: URLs are refused. */
function httpUrl(raw) {
  let u; try { u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`); } catch { return null; }
  return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
}
const target = argv.find((a, i) => !a.startsWith("--") && !["--runs", "--out", "--max-time"].includes(argv[i - 1]));
if (!target) {
  console.error("Usage: node vitals.mjs <url> [--runs 3] [--desktop] [--no-throttle] [--json] [--out .design-review]");
  process.exit(2);
}
const url = httpUrl(target);
if (!url) { console.error(`✖ "${target}" is not an http(s) URL. Serve the build first (e.g. npx serve dist) and pass http://localhost:<port>.`); process.exit(2); }
const runs = Math.min(10, Math.max(1, parseInt(opt("runs", "3"), 10) || 3));
const desktop = argv.includes("--desktop");
const throttle = !argv.includes("--no-throttle");
const json = argv.includes("--json");
const outDir = resolve(opt("out", ".design-review"));

async function loadPlaywright() {
  const req = createRequire(join(process.cwd(), "noop.js"));
  for (const id of ["playwright", "playwright-core", "@playwright/test"]) {
    try { return await import(pathToFileURL(req.resolve(id)).href); } catch {}
    try { return await import(id); } catch {}
  }
  console.error(`Playwright not found from ${process.cwd()}.
Install it in the project (ask the user first):
  npm i -D playwright && npx playwright install chromium
Or use Lighthouse (npx lighthouse <url>) / a Chrome DevTools MCP performance trace instead.`);
  process.exit(3);
}
async function launch(chromium) {
  const errors = [];
  for (const channel of [undefined, "chrome", "msedge"]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch (e) { errors.push(e.message.split("\n")[0]); }
  }
  console.error(`Could not launch a browser:\n  ${errors.join("\n  ")}\nRun: npx playwright install chromium`);
  process.exit(3);
}

// Runs inside the page before any page script: buffer the metrics we need.
const OBSERVERS = () => {
  const d = (el) => {
    if (!el || !el.tagName) return null;
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 100);
  };
  const v = (window.__vitals = { lcp: null, shifts: [], longTasks: [], loaf: [] });
  // Shifts right after user input don't count toward CLS. Chrome's own hadRecentInput flag can't be trusted here:
  // under mobile emulation (isMobile) it reports a phantom input ~50 ms after navigation, which would hide real
  // load-time shifts. This tool never clicks or types while measuring, so only trusted input events the page
  // actually receives are tracked.
  let lastInput = -Infinity;
  for (const type of ["pointerdown", "mousedown", "touchstart", "keydown"])
    addEventListener(type, (e) => { if (e.isTrusted) lastInput = performance.now(); }, { capture: true, passive: true });
  try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          const el = e.element;
          v.lcp = { time: e.startTime, size: e.size, url: e.url || null, el: d(el),
            img: el && el.tagName === "IMG" ? { loading: el.getAttribute("loading"), fetchpriority: el.getAttribute("fetchpriority") } : null };
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) if (!(e.startTime - lastInput < 500))
          v.shifts.push({ t: e.startTime, value: e.value, sources: (e.sources || []).map((s) => d(s.node)).filter(Boolean) });
      }).observe({ type: "layout-shift", buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) v.longTasks.push({ t: e.startTime, dur: e.duration }); })
        .observe({ type: "longtask", buffered: true });
    } catch {}
    try { // Long Animation Frames name the script + function behind slow frames (Chromium).
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) for (const s of e.scripts || [])
          if (s.duration > 30) v.loaf.push({ src: (s.sourceURL || "inline").split("?")[0], fn: s.sourceFunctionName || "", invoker: s.invoker || "", dur: s.duration, forced: s.forcedStyleAndLayoutDuration || 0, start: s.startTime });
      }).observe({ type: "long-animation-frame", buffered: true });
    } catch {}
  };

  // Largest session window: shifts < 1s apart, window ≤ 5s (the CLS definition).
  function cls(shifts) {
    let max = 0, cur = 0, start = 0, prev = -Infinity, worst = [], win = [];
    for (const s of shifts) {
      if (s.t - prev > 1000 || s.t - start > 5000) { cur = 0; start = s.t; win = []; }
      cur += s.value; prev = s.t; win.push(s);
      if (cur > max) { max = cur; worst = [...win]; }
    }
    const sources = {};
    for (const s of worst) for (const src of s.sources) sources[src] = (sources[src] || 0) + s.value;
    return { value: max, sources: Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([el, v]) => `${el} (${v.toFixed(3)})`) };
  }

  async function measure(browser) {
    const viewport = desktop ? { width: 1350, height: 940 } : { width: 390, height: 844 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: desktop ? 1 : 2, isMobile: !desktop, hasTouch: !desktop });
    let load, afterScroll, t0;
    const requests = [];
    try {
    await context.addInitScript(OBSERVERS);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page).catch(() => null);
    if (cdp) {
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      if (throttle && !desktop) {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      }
    }
    page.on("requestfinished", async (r) => {
      try {
        const resp = await r.response();
        const sizes = await r.sizes();
        requests.push({ url: r.url(), type: r.resourceType(), bytes: sizes.responseBodySize + sizes.responseHeadersSize, status: resp?.status(), encoding: (await resp?.headerValue("content-encoding").catch(() => null)) || "" });
      } catch {}
    });
    t0 = Date.now();
    // No in-place retry: re-navigating this context would measure a warm cache. An aborted run is redone from scratch.
    await page.goto(url, { waitUntil: "load", timeout: 90_000 });
    // Lazy and JS-fetched images finish after the load event; wait for the network to settle so late LCP
    // candidates, shifts and long tasks land (capped — a page that never goes idle is itself a finding).
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    load = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const vh = innerHeight;
      const imgs = [...document.images].filter((i) => i.complete && i.naturalWidth);
      const oversized = imgs.map((i) => {
        const r = i.getBoundingClientRect();
        const need = Math.ceil(r.width * devicePixelRatio);
        return r.width > 0 && i.naturalWidth > need * 1.5 && i.naturalWidth - need > 200
          ? `${(i.currentSrc || i.src).split("/").pop().slice(0, 60)} is ${i.naturalWidth}px wide, shown at ${Math.round(r.width)}px (needs ~${need}px)` : null;
      }).filter(Boolean).slice(0, 10);
      const eagerOffscreen = [...document.images].filter((i) => i.getBoundingClientRect().top > vh * 1.2 && i.loading !== "lazy")
        .map((i) => (i.currentSrc || i.src).split("/").pop().slice(0, 60)).slice(0, 10);
      const blocking = performance.getEntriesByType("resource").filter((r) => r.renderBlockingStatus === "blocking")
        .map((r) => r.name.split("?")[0].slice(-80));
      return { ttfb: nav ? nav.responseStart : null, fcp: fcp ? fcp.startTime : null, dcl: nav ? nav.domContentLoadedEventEnd : null,
        loadEvent: nav ? nav.loadEventEnd : null, domElements: document.getElementsByTagName("*").length,
        fonts: [...document.fonts].filter((f) => f.status === "loaded").length, oversized, eagerOffscreen, blocking, vitals: window.__vitals };
    });
    // Scroll through to collect shifts that happen as the visitor reads (lazy media without dimensions, late embeds).
    // Capped at 80 steps so infinite-scroll pages can't keep the run going forever.
    await page.evaluate(async () => {
      for (let y = 0, step = 0; y < document.documentElement.scrollHeight && step < 80; y += innerHeight * 0.7, step++) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 150)); }
    });
    await page.waitForTimeout(800);
    afterScroll = await page.evaluate(() => window.__vitals.shifts);
  } finally { await context.close().catch(() => {}); }

  const fcp = load.fcp ?? 0;
  const blocking = (ts) => ts.reduce((a, t) => a + Math.max(0, t.dur - 50), 0);
  const tbt = blocking(load.vitals.longTasks.filter((t) => t.t >= fcp));
  const preFcpBlocking = blocking(load.vitals.longTasks.filter((t) => t.t < fcp));
  const culprits = {};
  for (const s of load.vitals.loaf) { const k = `${s.src}${s.fn ? ` → ${s.fn}()` : ""}${s.invoker ? ` [${s.invoker}]` : ""}`; culprits[k] = (culprits[k] || 0) + s.dur; }
  // Scripts that forced a synchronous style/layout pass before first paint (a startup read of scrollHeight,
  // getBoundingClientRect, offsetWidth, getComputedStyle or document.fonts.ready).
  const forced = {};
  for (const s of load.vitals.loaf) if (s.forced > 30 && s.start < fcp) forced[s.src.split("/").pop() || s.src] = (forced[s.src.split("/").pop() || s.src] || 0) + s.forced;
  const host = new URL(url).host;
  const byType = {};
  for (const r of requests) byType[r.type] = (byType[r.type] || 0) + r.bytes;
  const third = {};
  for (const r of requests) { try { const h = new URL(r.url).host; if (h && h !== host) third[h] = (third[h] || 0) + r.bytes; } catch {} }
  return {
    wallMs: Date.now() - t0, ttfb: load.ttfb, fcp: load.fcp, lcp: load.vitals.lcp, cls: cls(load.vitals.shifts), clsAfterScroll: cls(afterScroll),
    tbt, preFcpBlocking, longTasks: load.vitals.longTasks.length,
    forcedLayoutBeforeFcp: Object.entries(forced).sort((a, b) => b[1] - a[1]).map(([script, ms]) => ({ script, ms: Math.round(ms) })),
    forcedRaw: forced, culpritRaw: culprits,
    culprits: Object.entries(culprits).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, ms]) => `${k} ${Math.round(ms)}ms`), dcl: load.dcl, loadEvent: load.loadEvent, domElements: load.domElements, fonts: load.fonts,
    requests: requests.length, bytes: requests.reduce((a, r) => a + r.bytes, 0), byType, thirdParty: third,
    failed: requests.filter((r) => r.status >= 400).map((r) => `${r.status} ${r.url}`).slice(0, 10),
    // Text files over 4 KB sent without gzip/brotli/zstd (HTML, JS, CSS, JSON, SVG).
    uncompressed: requests.filter((r) => ["document", "script", "stylesheet", "fetch", "xhr"].includes(r.type) && r.status < 300 && r.bytes > 4096 && !r.encoding)
      .map((r) => ({ url: r.url, bytes: r.bytes })),
    oversized: load.oversized, eagerOffscreen: load.eagerOffscreen, blocking: load.blocking,
  };
}

const pw = await loadPlaywright();
const browser = await launch(pw.chromium || pw.default?.chromium);
// Run guard: always close the browser on Ctrl+C or termination, and stop with a clear message when the run
// exceeds its time budget (--max-time seconds, default 120 per run) instead of hanging on a slow page or machine.
const maxTimeArg = Number(opt("max-time", NaN));
const runBudget = Math.min(86_400, Math.max(1, maxTimeArg > 0 ? maxTimeArg : 120 * runs));
let stopping = false;
const results = [];
const retried = [];   // run numbers whose navigation was aborted and that were measured again from scratch
/** A run cut short is never a pass: save the finished runs, marked INCOMPLETE, and say what was not verified. */
function writeIncomplete() {
  const notVerified = [`runs ${results.length + 1}–${runs} of ${runs}`, ...(results.length ? [] : ["every metric (no run finished)"])];
  const report = { url, profile: desktop ? "desktop" : throttle ? "mobile (4× CPU, slow 4G)" : "mobile (no throttle)", runs, runsCompleted: results.length,
    verdict: "INCOMPLETE", incomplete: true, notVerified, retriedRuns: retried, partialRuns: results.map((r) => ({ lcp: r.lcp?.time ?? null, cls: r.cls.value, tbt: r.tbt, fcp: r.fcp, ttfb: r.ttfb })), generatedAt: new Date().toISOString() };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "vitals.json"), JSON.stringify(report, null, 2));
  if (json) console.log(JSON.stringify(report, null, 2));
  (json ? console.error : console.log)(`INCOMPLETE — not verified: ${notVerified.join("; ")} (medians need every run) · partial report ${join(outDir, "vitals.json")}`);
}
const closeBrowserAndExit = async (code, message) => {
  if (stopping) return;
  stopping = true;
  if (message) console.error(message);
  if (code === 124) { try { writeIncomplete(); } catch (e) { console.error(`▲ could not write the partial report: ${e.message}`); } }
  setTimeout(() => process.exit(code), 5000).unref();   // never hang on a browser that won't close
  await browser.close().catch(() => {});
  process.exit(code);
};
// Any crash: close the browser and print one readable line. Errors from steps cut short by a stop are expected.
const onCrash = (e) => {
  if (stopping) return;
  const first = String(e?.message || e).split("\n")[0];
  const hint = /ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_NAME_NOT_RESOLVED/.test(first) ? " — is the server running at that URL?" : "";
  closeBrowserAndExit(1, `✖ ${first}${hint}`);
};
process.on("uncaughtException", onCrash);
process.on("unhandledRejection", onCrash);
for (const signal of ["SIGINT", "SIGTERM", "SIGBREAK", "SIGHUP"]) process.once(signal, () => closeBrowserAndExit(130));
setTimeout(() => closeBrowserAndExit(124, `✖ stopped after ${runBudget}s (--max-time): the page or the machine is too slow — try fewer widths or runs, or a larger --max-time`), runBudget * 1000).unref();
for (let i = 0; i < runs; i++) {
  // A navigation aborted under heavy load (net::ERR_ABORTED) is measured again from scratch in a fresh context,
  // once — never re-navigated in the same context, whose warm cache would report an optimistic LCP.
  try { results.push(await measure(browser)); }
  catch (e) {
    if (!/ERR_ABORTED/.test(String(e?.message))) throw e;
    retried.push(i + 1);
    console.error(`▲ run ${i + 1}: navigation aborted (net::ERR_ABORTED) — measuring the whole run again in a fresh context (cold cache)`);
    results.push(await measure(browser));
  }
}
await browser.close();

const median = (xs) => { const s = xs.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const rep = results.slice().sort((a, b) => (a.lcp?.time ?? 0) - (b.lcp?.time ?? 0))[Math.floor((results.length - 1) / 2)]; // median-LCP run for details
const m = {
  ttfb: median(results.map((r) => r.ttfb)), fcp: median(results.map((r) => r.fcp)), lcp: median(results.map((r) => r.lcp?.time)),
  cls: median(results.map((r) => r.cls.value)), clsAfterScroll: median(results.map((r) => r.clsAfterScroll.value)), tbt: median(results.map((r) => r.tbt)),
};
// Startup-script diagnostics are merged across runs. Chrome can't report a task that was already running when the
// observers were installed, and the page's first parse task sometimes starts together with them — so any one run can
// miss a startup culprit. Each script gets the median of the runs that saw it, and how many runs those were.
const merge = (key) => { const by = {}; for (const r of results) for (const [k, ms] of Object.entries(r[key] || {})) (by[k] ||= []).push(ms);
  return Object.entries(by).map(([k, ms]) => ({ k, ms: Math.round(median(ms)), seen: ms.length })).sort((a, b) => b.ms - a.ms); };
const seenIn = (x) => (x.seen < results.length ? ` (in ${x.seen} of ${results.length} runs)` : "");
const forcedMerged = merge("forcedRaw").map((x) => ({ script: x.k, ms: x.ms, ...(x.seen < results.length ? { runs: x.seen } : {}) }));
const culpritsMerged = merge("culpritRaw").slice(0, 5).map((x) => `${x.k} ${x.ms}ms${seenIn(x)}`);
const preRuns = results.map((r) => r.preFcpBlocking).filter((x) => x > 0);
const preFcp = { ms: preRuns.length ? Math.round(median(preRuns)) : 0, seen: preRuns.length };
// Thresholds: Core Web Vitals (LCP, CLS) and Lighthouse lab guidance (FCP, TBT, TTFB).
const T = { lcp: [2500, 4000], cls: [0.1, 0.25], clsAfterScroll: [0.1, 0.25], tbt: [200, 600], fcp: [1800, 3000], ttfb: [800, 1800] };
const grade = (k, v) => (v == null ? "n/a" : v <= T[k][0] ? "good" : v <= T[k][1] ? "needs work" : "poor");

const opps = [];
const lcpImg = rep.lcp?.img;
if (lcpImg?.loading === "lazy") opps.push({ sev: "error", msg: `The LCP image (${rep.lcp.el}) has loading="lazy" — remove it and add fetchpriority="high" (next/image: preload or fetchPriority="high"; "priority" before Next 16).` });
else if (lcpImg && lcpImg.fetchpriority !== "high") opps.push({ sev: "warn", msg: `The LCP image (${rep.lcp.el}) lacks fetchpriority="high".` });
if (m.lcp > 2500 && m.fcp && m.lcp - m.fcp > 1500) opps.push({ sev: "warn", msg: `LCP lands ${Math.round(m.lcp - m.fcp)}ms after FCP — check that the hero isn't hidden by an entrance animation, lazy-loaded, or fetched late by JS.` });
if (m.ttfb > 800) opps.push({ sev: "warn", msg: `Slow server response (TTFB ${Math.round(m.ttfb)}ms) — static generation, caching or a CDN.` });
if (rep.blocking.length) opps.push({ sev: "warn", msg: `${rep.blocking.length} render-blocking resource(s): ${rep.blocking.slice(0, 4).join(", ")} — inline critical CSS, defer/async scripts, self-host fonts.` });
if (m.cls > 0.1 && rep.cls.sources.length) opps.push({ sev: "warn", msg: `Layout shift during load from: ${rep.cls.sources.join(", ")} — reserve space (width/height, aspect-ratio, min-height) and use font metric overrides.` });
if (m.clsAfterScroll > m.cls + 0.05 && rep.clsAfterScroll.sources.length) opps.push({ sev: "warn", msg: `More shifting while scrolling: ${rep.clsAfterScroll.sources.join(", ")}.` });
if (m.tbt > 200) opps.push({ sev: "warn", msg: `TBT ${Math.round(m.tbt)}ms over ${rep.longTasks} long task(s) — interactions will feel sluggish (INP). Split work, defer non-critical JS, lazy-load heavy libraries.` });
if (preFcp.ms > 100) opps.push({ sev: "warn", msg: `${preFcp.ms}ms of long tasks before first paint${seenIn(preFcp)} — JavaScript is delaying FCP/LCP. Defer it or move it off the critical path.` });
const forcedTotal = forcedMerged.reduce((a, x) => a + x.ms, 0);
if (forcedTotal > 100) opps.push({ sev: "warn", msg: `${forcedTotal}ms of forced style/layout before first paint, from ${forcedMerged.slice(0, 3).map((x) => `${x.script} (${x.ms}ms${x.runs ? `, in ${x.runs} of ${results.length} runs` : ""})`).join(", ")} — a startup script reads layout (scrollHeight, getBoundingClientRect, offsetWidth, getComputedStyle, document.fonts.ready) before the page has painted. Move those reads into requestAnimationFrame(() => setTimeout(fn)).` });
if (culpritsMerged.length && (m.tbt > 200 || preFcp.ms > 100)) opps.push({ sev: "info", msg: `Scripts behind the slow frames: ${culpritsMerged.join(" · ")}` });
for (const o of rep.oversized) opps.push({ sev: "warn", msg: `Oversized image: ${o} — use srcset/sizes or the framework image component.` });
if (rep.eagerOffscreen.length) opps.push({ sev: "info", msg: `${rep.eagerOffscreen.length} offscreen image(s) load eagerly: ${rep.eagerOffscreen.slice(0, 4).join(", ")} — add loading="lazy".` });
if (rep.fonts > 6) opps.push({ sev: "info", msg: `${rep.fonts} font faces loaded — trim weights/styles, prefer one variable font.` });
if ((rep.byType.script || 0) > 350 * 1024) opps.push({ sev: "warn", msg: `${kb(rep.byType.script)} of JavaScript transferred — run bundle.mjs on the build output to find what to split.` });
if (rep.domElements > 1500) opps.push({ sev: "info", msg: `${rep.domElements} DOM elements — large DOMs slow style/layout; virtualize long lists.` });
for (const f of rep.failed) opps.push({ sev: "warn", msg: `Failed request: ${f}` });
if (rep.uncompressed.length) {
  const total = rep.uncompressed.reduce((a, u) => a + u.bytes, 0);
  opps.push({ sev: "warn", msg: `${rep.uncompressed.length} text file(s) sent uncompressed (${kb(total)}): ${rep.uncompressed.slice(0, 4).map((u) => u.url.split("/").pop().split("?")[0] || u.url).join(", ")} — turn on brotli/gzip. Netlify, Vercel and Cloudflare compress by default; many local static servers don't, which also makes these lab numbers worse than production.` });
}

function kb(n) { return `${Math.round((n || 0) / 1024)} KB`; }
const report = { url, profile: desktop ? "desktop" : throttle ? "mobile (4× CPU, slow 4G)" : "mobile (no throttle)", runs, medians: m,
  grades: Object.fromEntries(Object.keys(T).map((k) => [k, grade(k, m[k])])), lcpElement: rep.lcp, clsSources: rep.cls.sources,
  blockingBeforeFcp: preFcp.ms, forcedLayoutBeforeFcp: forcedMerged, scriptCulprits: culpritsMerged,
  weight: { requests: rep.requests, total: rep.bytes, byType: rep.byType, thirdParty: rep.thirdParty }, opportunities: opps,
  ...(retried.length ? { retriedRuns: retried } : {}), generatedAt: new Date().toISOString() };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "vitals.json"), JSON.stringify(report, null, 2));

if (json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }
const ms = (v) => (v == null ? "n/a" : `${Math.round(v)} ms`);
console.log(`${url}\nprofile: ${report.profile} · median of ${runs} run(s)${retried.length ? ` · run ${retried.join(", ")} retried from scratch after net::ERR_ABORTED` : ""}\n`);
console.log(`  LCP   ${ms(m.lcp).padStart(9)}  ${grade("lcp", m.lcp)}${rep.lcp?.el ? `   ← ${rep.lcp.el}${rep.lcp.url ? " " + rep.lcp.url.split("/").pop().slice(0, 50) : ""}` : ""}`);
console.log(`  CLS   ${(m.cls ?? 0).toFixed(3).padStart(9)}  ${grade("cls", m.cls)}   (after scrolling: ${(m.clsAfterScroll ?? 0).toFixed(3)})`);
console.log(`  TBT   ${ms(m.tbt).padStart(9)}  ${grade("tbt", m.tbt)}   (lab proxy for INP)`);
console.log(`  FCP   ${ms(m.fcp).padStart(9)}  ${grade("fcp", m.fcp)}`);
console.log(`  TTFB  ${ms(m.ttfb).padStart(9)}  ${grade("ttfb", m.ttfb)}`);
console.log(`\n  weight: ${kb(rep.bytes)} in ${rep.requests} requests — ${Object.entries(rep.byType).sort((a, b) => b[1] - a[1]).map(([t, b]) => `${t} ${kb(b)}`).join(" · ")}`);
const tp = Object.entries(rep.thirdParty).sort((a, b) => b[1] - a[1]);
if (tp.length) console.log(`  third parties: ${tp.slice(0, 6).map(([h, b]) => `${h} ${kb(b)}`).join(" · ")}`);
const icon = { error: "✖", warn: "▲", info: "·" };
console.log(opps.length ? "\nOPPORTUNITIES" : "\n✓ no automatic opportunities found");
for (const o of opps.sort((a, b) => "ewi".indexOf(a.sev[0]) - "ewi".indexOf(b.sev[0]))) console.log(`  ${icon[o.sev]} ${o.msg}`);
console.log(`\nReport: ${join(outDir, "vitals.json")}\nLab numbers vary run to run and differ from field data (CrUX / RUM). Compare before/after with the same profile.`);
