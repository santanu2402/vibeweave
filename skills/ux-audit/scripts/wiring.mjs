#!/usr/bin/env node
// "Is every page wired?" — crawl a site in a real browser and report what's disconnected:
// broken internal links (4xx/5xx), missing #anchor targets, placeholder links (#, javascript:),
// buttons that do nothing when clicked, dead-end pages (no way onward or home), orphan routes
// (exist in the sitemap or the routes folder but nothing links to them), forms with no submit path,
// 404 handling, per-page console errors and page basics (title, description, h1, lang, og:image).
//
// Usage: node wiring.mjs <start-url> [--max-pages 40] [--routes <dir>] [--external] [--no-click]
//                        [--width 1280] [--json] [--strict] [--out .design-review] [--concurrency 2] [--fast]
//   --routes <dir>     compare against file-system routes: Next.js app/ or pages/, Astro src/pages, SvelteKit src/routes
//   --external         also check external links (HEAD/GET, capped at 60)
//   --no-click         skip the dead-button click test (it never clicks destructive-looking buttons or submits forms)
//   --concurrency n    pages analysed in parallel (default 2). Every page gets its own fresh browser context (the
//                      reloads between button clicks stay in it) and the report keeps crawl order, so the findings
//                      are the same for any n
//   --fast             quick iteration only: skip downloading images, media and fonts (images are checked with HEAD
//                      requests instead, so the browser's own console lines about them are absent) and disable WebGL.
//                      Final gates must run without --fast. (--full is accepted and means the default)
//   --nav-timeout s    per-navigation timeout (default 30)
// A click counts as working when it causes a navigation, URL/hash change, DOM change, ARIA state change, dialog,
// popup, download, focus move or network request. It is called dead only when none happened, two animation frames
// passed and nothing it scheduled (timers up to 10 s) is still pending; deferred work is waited for up to 5 s. No sleeps.
// Requires Playwright resolvable from the current project:
//   npm i -D playwright && npx playwright install chromium   (an installed Chrome/Edge also works)
// All browser tools accept --max-time <seconds> (default here: 30 per --max-pages). A run cut short is never a pass:
// it writes the partial report with "verdict": "INCOMPLETE", prints what was not verified and exits 124.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--max-pages", "--routes", "--width", "--out", "--max-time", "--concurrency", "--nav-timeout"];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
/** Accept only http(s) targets ("localhost:3000" → http://localhost:3000); file:, data: and javascript: URLs are refused. */
function httpUrl(raw) {
  let u; try { u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`); } catch { return null; }
  return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
}
const target0 = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
if (!target0) {
  console.error("Usage: node wiring.mjs <start-url> [--max-pages 40] [--routes <dir>] [--external] [--no-click] [--width 1280] [--json] [--strict] [--out .design-review] [--concurrency 2] [--fast]");
  process.exit(2);
}
const start = httpUrl(target0);
if (!start) { console.error(`✖ "${target0}" is not an http(s) URL. Serve the site first (e.g. npx serve dist) and pass http://localhost:<port>.`); process.exit(2); }
const maxPages = Math.min(1000, Math.max(1, parseInt(opt("max-pages", "40"), 10) || 40));
const routesDir = opt("routes", null);
const width = Math.min(3840, Math.max(320, parseInt(opt("width", "1280"), 10) || 1280));
const click = !argv.includes("--no-click");
const external = argv.includes("--external");
const json = argv.includes("--json");
const strict = argv.includes("--strict");
const fast = argv.includes("--fast");
const concurrency = Math.min(8, Math.max(1, parseInt(opt("concurrency", "2"), 10) || 2));
const navTimeout = Math.min(600, Math.max(1, Number(opt("nav-timeout", "30")) || 30)) * 1000;
const outDir = resolve(opt("out", ".design-review"));
const origin = new URL(start).origin;
const DESTRUCTIVE = /\b(delete|remove|destroy|erase|pay|purchase|buy now|checkout|place order|submit order|confirm order|log ?out|sign ?out|unsubscribe|cancel (subscription|plan|account)|deactivate|reset|send|transfer|donate)\b/i;
const CLICK_CAP_MS = 5000;                        // longest wait for work a click deferred (timers it set) to show an effect
const PASSIVE = new Set(["image", "media", "font", "stylesheet", "manifest", "texttrack"]);   // loads that don't prove a click did something

async function loadPlaywright() {
  const req = createRequire(join(process.cwd(), "noop.js"));
  for (const id of ["playwright", "playwright-core", "@playwright/test"]) {
    try { return await import(pathToFileURL(req.resolve(id)).href); } catch {}
    try { return await import(id); } catch {}
  }
  console.error(`Playwright not found from ${process.cwd()}.\nInstall it in the project (ask the user first):\n  npm i -D playwright && npx playwright install chromium`);
  process.exit(3);
}
async function launch(chromium, args) {
  const errors = [];
  for (const channel of [undefined, "chrome", "msedge"]) {
    try { return await chromium.launch({ ...(channel ? { channel } : {}), args }); } catch (e) { errors.push(e.message.split("\n")[0]); }
  }
  console.error(`Could not launch a browser:\n  ${errors.join("\n  ")}\nRun: npx playwright install chromium`);
  process.exit(3);
}
const norm = (u, base) => {
  try { const x = new URL(u, base); x.hash = ""; if (x.pathname !== "/" ) x.pathname = x.pathname.replace(/\/$/, ""); return x.href; } catch { return null; }
};
const pathOf = (u) => { try { return new URL(u).pathname || "/"; } catch { return u; } };
/** Same origin as the start URL (exact origin match — "localhost:30001" is not "localhost:3000"). */
const isInternal = (u) => { try { return new URL(u).origin === origin; } catch { return false; } };
/** Number the visible, enabled buttons that are safe to click (never form submits). Runs in the page. */
const markButtons = () => {
  const els = [...document.querySelectorAll("button, [role=button], summary")].filter((b) => {
    const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
    const visible = r.width && r.height && cs.visibility !== "hidden" && !b.disabled && b.getAttribute("aria-disabled") !== "true";
    return visible && (!b.closest("form") || b.type === "button");
  });
  els.forEach((b, i) => (b.dataset.wiringIdx = i));
  return els.length;
};
/** Runs in the page: resolve once it has settled — fonts loaded, no DOM mutation for `quiet` ms and no finite
 *  CSS/WAAPI animation still running — or after `cap` ms, so a page that never settles can't stall the crawl. */
const SETTLE = ({ quiet, cap, animCap = cap }) => new Promise((done) => {
  const t0 = performance.now();
  let last = t0, fontsReady = !document.fonts;
  document.fonts?.ready.then(() => { fontsReady = true; }, () => { fontsReady = true; });
  const mo = new MutationObserver(() => { last = performance.now(); });
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  // Finite CSS/WAAPI animations and transitions (intros, curtains, reveals) are waited for up to animCap;
  // infinite ones (spinners, marquees) never count, and DOM quiet is only waited for up to cap.
  const animating = () => { try { return document.getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime)); } catch { return false; } };
  const tick = () => {
    const now = performance.now(), t = now - t0;
    if (t >= animCap || (!animating() && (t >= cap || (fontsReady && now - last >= quiet)))) { mo.disconnect(); done(Math.round(t)); } else setTimeout(tick, 50);
  };
  setTimeout(tick, 50);
});
/** Runs in the page: links, forms, ids and basics. Images: broken ones (normal run) or every image URL (--fast, checked by HEAD). */
const PAGE_INFO = (fast) => {
  const meta = (n) => document.querySelector(`meta[name="${n}"], meta[property="${n}"]`)?.getAttribute("content") || null;
  const links = [...document.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 40) }));
  const forms = [...document.querySelectorAll("form")].map((f, i) => ({ i, action: f.getAttribute("action"), method: f.getAttribute("method"),
    submit: !!f.querySelector("button:not([type=button]):not([type=reset]), input[type=submit], input[type=image]"), fields: f.querySelectorAll("input, select, textarea").length }));
  const ids = [...document.querySelectorAll("[id]")].map((e) => e.id).concat([...document.querySelectorAll("a[name]")].map((a) => a.name));
  const imgs = [...document.images];
  // base: the document's real URL (after redirects such as /docs -> /docs/, and any <base href>) for resolving relative links.
  return { base: document.baseURI, title: document.title, description: meta("description"), ogImage: meta("og:image"), lang: document.documentElement.lang || null,
    h1: document.querySelectorAll("h1").length, links, forms, ids,
    brokenImages: fast ? [] : imgs.filter((i) => i.complete && !i.naturalWidth).map((i) => i.currentSrc || i.src).slice(0, 5),
    imageUrls: fast ? [...new Set(imgs.map((i) => i.currentSrc || i.src).filter(Boolean))].slice(0, 50) : [] };
};
/** Init script (runs before the page's own scripts): pass-through timer wrappers that, only while a click is being
 *  watched, remember which timeouts/intervals (≤ 10 s) the click scheduled — so "nothing happened yet" can be told
 *  apart from "something is still scheduled to happen" without guessing a sleep. */
const TIMER_HOOK = () => {
  const native = { st: window.setTimeout, ct: window.clearTimeout, si: window.setInterval, ci: window.clearInterval };
  const w = (window.__wiringTimers = { watching: false, pending: new Set() });
  const track = (make) => function (fn, ms, ...args) {
    if (!w.watching || typeof fn !== "function" || Number(ms) > 10_000) return make.call(this, fn, ms, ...args);
    let id;
    id = make.call(this, function (...a) { w.pending.delete(id); return fn.apply(this, a); }, ms, ...args);
    w.pending.add(id);
    return id;
  };
  const untrack = (clear) => function (id) { w.pending.delete(id); return clear.call(this, id); };
  const same = (f, orig) => Object.defineProperty(f, "toString", { value: () => orig.toString(), configurable: true });
  window.setTimeout = same(track(native.st), native.st); window.setInterval = same(track(native.si), native.si);
  window.clearTimeout = same(untrack(native.ct), native.ct); window.clearInterval = same(untrack(native.ci), native.ci);
  // Requests the click starts are counted in the page too, so they can't be missed if the browser's event is late.
  w.requests = 0;
  const count = (obj, key) => { const orig = obj?.[key]; if (typeof orig === "function") obj[key] = same(function (...a) { if (w.watching) w.requests++; return orig.apply(this, a); }, orig); };
  count(window, "fetch"); count(window.XMLHttpRequest?.prototype, "send"); count(window.Navigator?.prototype, "sendBeacon"); count(window.WebSocket?.prototype, "send");
};
/** Runs in the page: start watching for any effect, then click button `i`. */
const ARM_AND_CLICK = (i) => {
  const b = document.querySelector(`[data-wiring-idx="${i}"]`);
  if (!b) return { gone: true };
  const ARIA = ["aria-expanded", "aria-pressed", "aria-checked", "aria-selected"];
  const w = (window.__wiring = { b, mutations: 0, aria: ARIA.map((a) => b.getAttribute(a)).join("|"), focus: document.activeElement, href: location.href,
    dialogs: document.querySelectorAll("dialog[open], [role=dialog], [role=alertdialog]").length, frames: 0 });
  // The whole document is watched (not only <body>): theme toggles often change a class on <html>.
  w.mo = new MutationObserver((list) => { for (const m of list) if (!(m.type === "attributes" && m.attributeName === "data-wiring-idx")) w.mutations++; });
  w.mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const timers = window.__wiringTimers;
  if (timers) { timers.pending.clear(); timers.requests = 0; timers.watching = true; }
  b.click();
  // Two animation frames after the click: anything the handler queued for the next frame has run by then.
  requestAnimationFrame(() => { w.frames++; requestAnimationFrame(() => { w.frames++; }); });
  return { armed: true };
};
/** Runs in the page: what the click has changed so far, and whether work it scheduled is still pending. */
const POLL = () => {
  const w = window.__wiring;
  if (!w) return { navigated: true };            // a new document replaced the page
  const ARIA = ["aria-expanded", "aria-pressed", "aria-checked", "aria-selected"];
  const a = document.activeElement;
  return { mutations: w.mutations, gone: !w.b.isConnected, ariaChanged: w.aria !== ARIA.map((x) => w.b.getAttribute(x)).join("|"),
    dialogsChanged: w.dialogs !== document.querySelectorAll("dialog[open], [role=dialog], [role=alertdialog]").length,
    focusMoved: a !== w.focus && a !== w.b && a !== document.body, hashChanged: location.href !== w.href,
    pageRequests: window.__wiringTimers?.requests || 0, settled: w.frames >= 2 && !(window.__wiringTimers?.pending.size) };
};
const alive = (e) => !!(e.navigated || e.gone || e.mutations > 0 || e.ariaChanged || e.dialogsChanged || e.focusMoved || e.hashChanged
  || e.urlChanged || e.requests > 0 || e.pageRequests > 0 || e.popups > 0 || e.dialogs > 0 || e.downloads > 0);

// File-system routes → URL paths (static ones checked; dynamic ones listed).
function fsRoutes(dir) {
  const out = { static: new Set(), dynamic: [] };
  if (!dir || !existsSync(dir)) return out;
  const root = resolve(dir);
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!["node_modules", "api", "components", "_components"].includes(e.name) && !e.name.startsWith("_") && !e.name.startsWith("@")) walk(p); continue; }
      const rel = relative(root, p).split(sep).join("/");
      let route = null;
      if (/(^|\/)page\.(tsx|jsx|ts|js|mdx|md)$/.test(rel)) route = rel.replace(/(^|\/)page\.\w+$/, "");                  // Next app router
      else if (/(^|\/)\+page\.svelte$/.test(rel)) route = rel.replace(/(^|\/)\+page\.svelte$/, "");                         // SvelteKit
      else if (/\.(astro|md|mdx)$/.test(rel) || (/\.(tsx|jsx)$/.test(rel) && !/(^|\/)(_app|_document|_error|layout|loading|error|not-found|template)\.\w+$/.test(rel) && !/\+/.test(rel)))
        route = rel.replace(/\.\w+$/, "").replace(/(^|\/)index$/, "");                                                      // Astro / Next pages router
      if (route == null) continue;
      route = "/" + route.split("/").filter((s) => !/^\(.*\)$/.test(s)).join("/");                                         // drop (route groups)
      route = route.replace(/\/$/, "") || "/";
      if (/\[|\$|:/.test(route)) out.dynamic.push(route); else out.static.add(route);
    }
  };
  walk(root);
  return out;
}
/** Run fn over items with at most n in flight. */
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}
/** --fast: is this image URL broken? HEAD (GET for servers that refuse HEAD); an HTML answer is a soft 404. */
async function imageProblem(u) {
  const get = async (method) => {
    const r = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(10_000), headers: method === "GET" ? { range: "bytes=0-0" } : {} });
    await r.body?.cancel().catch(() => {});
    return r;
  };
  try {
    let r = await get("HEAD");
    if (r.status >= 400) r = await get("GET");
    if (r.status >= 400) return `HTTP ${r.status}`;
    return /^text\/html/i.test(r.headers.get("content-type") || "") ? "an HTML page, not an image" : null;
  } catch (e) { return e.name === "TimeoutError" ? "timed out" : "failed to load"; }
}

const pw = await loadPlaywright();
// --fast also disables WebGL/3D (heavy GPU work that links and buttons don't need).
const browser = await launch(pw.chromium || pw.default?.chromium, fast ? ["--disable-3d-apis"] : []);
const pages = new Map();          // url → page record, in crawl (breadth-first) order
let frontier = [];                // discovered, not yet analysed
let phase = "crawl";
const issues = [];
const add = (sev, kind, msg, where = "") => issues.push({ sev, kind, msg, where });
// Run guard: always close the browser on Ctrl+C or termination, and stop with a clear message when the run
// exceeds its time budget (--max-time seconds, default 30 per --max-pages) instead of hanging on a slow site.
const maxTimeArg = Number(opt("max-time", NaN));
const runBudget = Math.min(86_400, Math.max(1, maxTimeArg > 0 ? maxTimeArg : 30 * maxPages));
let stopping = false;
const order = { error: 0, warn: 1, info: 2 };
const sortIssues = (list) => list.sort((a, b) => order[a.sev] - order[b.sev] || a.kind.localeCompare(b.kind) || a.where.localeCompare(b.where));
const publicPages = () => [...pages.values()].filter((p) => !p.pending).map(({ ids, links, discovered, anchorChecks, imageUrls, issues: _, pending, base, ...p }) => ({ ...p, outgoingLinks: links?.length ?? 0 }));
/** A run cut short is never a pass: save what was found, marked INCOMPLETE, and say what was not verified. */
function writeIncomplete() {
  const found = sortIssues(phase === "crawl" ? [...pages.values()].filter((p) => !p.pending).flatMap((p) => p.issues || []) : [...issues]);
  const notCrawled = [...new Set([...[...pages.values()].filter((p) => p.pending).map((p) => p.url), ...frontier.filter((u) => !pages.has(u))])].map(pathOf);
  const notVerified = [...(notCrawled.length ? [`pages ${notCrawled.slice(0, 10).join(", ")}${notCrawled.length > 10 ? ` (+${notCrawled.length - 10} more)` : ""}`] : []),
    ...(phase === "crawl" ? ["pages linked from those", "broken links", "anchors", "orphans", "404 handling"] : phase === "post" ? ["404 handling"] : []),
    ...(external && phase !== "done" ? ["external links"] : [])];
  const counts = found.reduce((acc, i) => ((acc[i.sev] = (acc[i.sev] || 0) + 1), acc), {});
  const report = { start, verdict: "INCOMPLETE", incomplete: true, notVerified, counts, pagesCrawled: publicPages().length, pages: publicPages(), issues: found, generatedAt: new Date().toISOString() };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "wiring.json"), JSON.stringify(report, null, 2));
  if (json) console.log(JSON.stringify(report, null, 2));
  (json ? console.error : console.log)(`INCOMPLETE — not verified: ${notVerified.join("; ") || "the final report"} (${report.pagesCrawled} page(s) checked; ${counts.error || 0} errors so far) · partial report ${join(outDir, "wiring.json")}`);
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
setTimeout(() => closeBrowserAndExit(124, `✖ stopped after ${runBudget}s (--max-time): the site or the machine is too slow — try --max-pages, --no-click or a larger --max-time`), runBudget * 1000).unref();

/** A fresh context + tab, with listeners that record console errors and every kind of click effect. */
async function newTab() {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addInitScript(TIMER_HOOK);
  const tab = await context.newPage();
  const t = { context, tab, consoleErrors: [], blocked: new Set(), mainStatus: 0, effects: { requests: 0, popups: 0, dialogs: 0, downloads: 0 } };
  if (fast) {   // CDP request blocking by resource type keeps the HTTP cache (Playwright routes would disable it)
    const cdp = await context.newCDPSession(tab);
    cdp.on("Fetch.requestPaused", (e) => { t.blocked.add(e.request.url); cdp.send("Fetch.failRequest", { requestId: e.requestId, errorReason: "BlockedByClient" }).catch(() => {}); });
    await cdp.send("Fetch.enable", { patterns: ["Image", "Media", "Font"].map((resourceType) => ({ urlPattern: "*", resourceType, requestStage: "Request" })) });
  }
  tab.on("console", (m) => {
    if (m.type() !== "error") return;
    if (fast && /^Failed to load resource: net::ERR_BLOCKED_BY_CLIENT/.test(m.text()) && t.blocked.has(m.location()?.url)) return;   // our own --fast blocking
    t.consoleErrors.push(m.text().slice(0, 200));
  });
  tab.on("pageerror", (e) => t.consoleErrors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  // Status of the page itself for the idle-timeout fallback: a redirect hop (3xx with Location) is not the page.
  tab.on("response", (r) => { if (r.request().isNavigationRequest() && r.frame() === tab.mainFrame() && !(r.status() >= 300 && r.status() < 400 && r.headers().location)) t.mainStatus = r.status(); });
  tab.on("request", (r) => { if (!PASSIVE.has(r.resourceType())) t.effects.requests++; });
  tab.on("popup", (p) => { t.effects.popups++; p.close().catch(() => {}); });
  tab.on("dialog", (d) => { t.effects.dialogs++; d.dismiss().catch(() => {}); });
  tab.on("download", (d) => { t.effects.downloads++; d.cancel().catch(() => {}); });
  return t;
}
/** Navigate and wait for network idle; when that times out keep the page that loaded. Other failures → status -1.
 *  idle:false (a page that never went idle on its first visit) waits for "load" only, so resets don't stall.
 *  A navigation aborted under heavy load (net::ERR_ABORTED) is tried once more before it counts as a failure. */
async function visit(t, url, idle = true, retry = true) {
  t.mainStatus = 0;
  try { const res = await t.tab.goto(url, { waitUntil: idle ? "networkidle" : "load", timeout: navTimeout }); return { status: res?.status() ?? 0, idle }; }
  catch (e) {
    if (retry && /ERR_ABORTED/.test(String(e?.message))) return visit(t, url, idle, false);
    if (e?.name !== "TimeoutError") return { status: -1, error: String(e?.message || e).split("\n")[0] };
    await t.tab.waitForLoadState("load", { timeout: navTimeout }).catch(() => {});
    return t.mainStatus ? { status: t.mainStatus, idle: false } : { status: -1, error: `no response within ${navTimeout / 1000}s` };
  }
}
/** Click button i and wait for the first sign that it did something. "Dead" is decided causally, not by a sleep:
 *  nothing changed, two animation frames have passed and no timer the click scheduled is pending — on two polls
 *  ≥ 100 ms apart. Work the click deferred (debounce, simulated latency) is waited for up to CLICK_CAP_MS. */
async function clickAndWatch(t, i) {
  const { tab } = t;
  // Scroll first and let scroll-triggered reveals and lazy loads settle, so they aren't credited to the click.
  const present = await tab.evaluate((i) => { const b = document.querySelector(`[data-wiring-idx="${i}"]`); if (!b) return false; b.scrollIntoView({ block: "center" }); return true; }, i).catch(() => false);
  if (!present) return { gone: true, skipped: true };
  await tab.evaluate(SETTLE, { quiet: 150, cap: 1500, animCap: 5000 }).catch(() => {});
  const base = { url: tab.url(), ...t.effects };
  const armed = await tab.evaluate(ARM_AND_CLICK, i).catch(() => ({ navigated: true }));
  if (armed.gone) return { gone: true, skipped: true };
  if (!armed.armed) return armed;
  const deadline = Date.now() + CLICK_CAP_MS;
  let settledSince = 0;
  for (;;) {
    const s = await tab.evaluate(POLL).catch(() => ({ navigated: true }));
    const e = { ...s, urlChanged: tab.url() !== base.url, requests: t.effects.requests - base.requests, popups: t.effects.popups - base.popups,
      dialogs: t.effects.dialogs - base.dialogs, downloads: t.effects.downloads - base.downloads };
    settledSince = s.settled ? settledSince || Date.now() : 0;
    if (alive(e) || (settledSince && Date.now() - settledSince >= 100) || Date.now() >= deadline) {
      if (!e.navigated) await tab.evaluate(() => {
        window.__wiring?.mo.disconnect(); delete window.__wiring;
        if (window.__wiringTimers) { window.__wiringTimers.watching = false; window.__wiringTimers.pending.clear(); }
      }).catch(() => {});
      return e;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

/** Analyse one page in its own context: links, forms, basics, console, images and the dead-button test. */
async function analysePage(url, isStart) {
  const page = { url, path: pathOf(url), status: 0, consoleErrors: [], deadButtons: [], issues: [], discovered: [], anchorChecks: [], imageUrls: [] };
  const padd = (sev, kind, msg) => page.issues.push({ sev, kind, msg, where: page.path });
  const t = await newTab();
  try {
    const nav = await visit(t, url);
    page.status = nav.status;
    page.consoleErrors = [...t.consoleErrors];
    // The start URL itself failing at the network level means there is nothing to check: stop with the reason.
    if (isStart && nav.status === -1 && nav.error && !/^no response within/.test(nav.error)) throw new Error(nav.error);
    if (nav.status > 0 && !isInternal(t.tab.url())) {   // redirected off-site (e.g. a login provider): never analyse or click there
      page.issues.push({ sev: "info", kind: "off-site", msg: `redirects to ${new URL(t.tab.url()).origin} — not crawled`, where: page.path });
      return page;
    }
    if (!(nav.status >= 200 && nav.status < 400)) {   // others are reported as broken links with their sources
      if (isStart) padd("error", "broken-page", `start page returns ${nav.status === -1 ? "no response" : nav.status}`);
      return page;
    }
    await t.tab.evaluate(SETTLE, { quiet: 200, cap: 2000, animCap: 10_000 }).catch(() => {});
    const info = await t.tab.evaluate(PAGE_INFO, fast);
    Object.assign(page, info);
    page.consoleErrors = [...t.consoleErrors];

    const seen = new Set();
    for (const l of info.links) {
      const h = (l.href || "").trim();
      if (!h || h === "#" || /^javascript:/i.test(h)) { padd("warn", "placeholder-link", `link "${l.text || "(no text)"}" goes nowhere (href="${h}") — point it at a real page or make it a <button>`); continue; }
      if (/^(mailto|tel|sms):/i.test(h)) continue;
      if (h.startsWith("#")) { if (!info.ids.includes(decodeURIComponent(h.slice(1)))) padd("warn", "missing-anchor", `link "${l.text}" → ${h} but no element has that id`); continue; }
      let abs; try { abs = new URL(h, info.base); } catch { padd("warn", "bad-href", `unparseable href "${h}"`); continue; }
      if (abs.origin !== origin) continue;
      const tgt = norm(abs.href, info.base);
      if (abs.hash && abs.hash.length > 1) page.anchorChecks.push({ source: page.path, target: tgt, id: decodeURIComponent(abs.hash.slice(1)), text: l.text });
      if (!seen.has(tgt)) { seen.add(tgt); page.discovered.push(tgt); }
    }
    for (const f of info.forms) {
      if (!f.submit) padd("warn", "form", `form #${f.i + 1} (${f.fields} fields) has no submit button — keyboard and screen-reader users can't send it`);
      if (!f.action) padd("info", "form", `form #${f.i + 1} has no action attribute — make sure a JS submit handler exists and test a real submission (success + error states)`);
    }
    const internalOut = info.links.filter((l) => { try { const u = new URL(l.href || "", info.base); return u.origin === origin && norm(u.href, url) !== url; } catch { return false; } });
    // A one-page site (start page, in-page links only, nothing else found) has no other page to link to: not a dead end.
    const inPageNav = info.links.some((l) => { const h = (l.href || "").trim(); if (/^#./.test(h)) return true; try { const u = new URL(h, info.base); return u.origin === origin && u.hash.length > 1; } catch { return false; } });
    if (!internalOut.length && isStart && inPageNav) padd("info", "one-page", "one-page site — navigation is in-page links only (a dead end only if other pages exist)");
    else if (!internalOut.length) padd("warn", "dead-end", "no links to any other page on the site — add navigation (header/footer) or a next step");
    else if (page.path !== "/" && !info.links.some((l) => { try { return pathOf(new URL(l.href || "", info.base).href) === "/"; } catch { return false; } }))
      padd("info", "no-home-link", "no link back to the home page (logo or nav)");
    if (!info.title) padd("warn", "page-basics", "missing <title>");
    if (!info.description) padd("info", "page-basics", "missing meta description");
    if (info.h1 !== 1) padd("warn", "page-basics", `${info.h1} <h1> elements (expected 1)`);
    if (!info.lang) padd("warn", "page-basics", "<html> has no lang");
    if (!info.ogImage) padd("info", "page-basics", "no og:image (link previews will be blank)");
    for (const b of info.brokenImages) padd("warn", "broken-image", `image failed to load: ${b}`);
    page.imageUrls = info.imageUrls;   // --fast: checked once per URL after the crawl
    // Up to three, so the one that matters isn't hidden by whichever happened to be logged first.
    if (page.consoleErrors.length) padd("warn", "console", `${page.consoleErrors.length} console error(s): ${page.consoleErrors.slice(0, 3).map((m) => String(m).slice(0, 160)).join(" | ")}`);

    // Dead-button test: click each visible, enabled button and wait for any effect.
    if (click) {
      const count = await t.tab.evaluate(markButtons);
      for (let i = 0; i < Math.min(count, 25); i++) {
        const label = await t.tab.evaluate((i) => { const b = document.querySelector(`[data-wiring-idx="${i}"]`); return b ? (b.getAttribute("aria-label") || b.innerText || b.title || "").trim().replace(/\s+/g, " ").slice(0, 40) : null; }, i).catch(() => null);
        if (label == null) continue;
        if (DESTRUCTIVE.test(label)) { padd("info", "button-skipped", `not clicked (looks destructive): "${label}" — test it manually`); continue; }
        const e = await clickAndWatch(t, i);
        if (e.skipped) continue;   // the button disappeared before it could be clicked
        if (!alive(e)) { page.deadButtons.push(label || "(unlabelled)"); padd("error", "dead-button", `button "${label || "(no label)"}" does nothing when clicked (no navigation, DOM change, request or dialog)`); continue; }
        if (e.focusMoved && !e.navigated && !e.urlChanged && !e.hashChanged && !e.mutations && !e.dialogsChanged && !e.ariaChanged && !e.requests && !e.popups && !e.dialogs && !e.downloads) continue;
        // The click changed something: reload the page (same navigation as the first visit) before the next button.
        // The reload stays in this page's own context, so the sequence is the same whatever --concurrency is.
        const again = await visit(t, url, nav.idle !== false);
        if (!(again.status >= 200 && again.status < 400) || !isInternal(t.tab.url())) break;
        await t.tab.evaluate(SETTLE, { quiet: 200, cap: 2000, animCap: 10_000 }).catch(() => {});
        await t.tab.evaluate(markButtons).catch(() => {});
      }
    }
    return page;
  } finally { await t.context.close().catch(() => {}); }
}

const startUrl = norm(start, start);
frontier = [startUrl];
try { // seed from sitemap.xml when present (same-origin entries only)
  const sm = (await (await fetch(`${origin}/sitemap.xml`, { signal: AbortSignal.timeout(10_000) })).text()).slice(0, 5_000_000);
  for (const m of sm.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) { const u = norm(m[1], origin); if (u && isInternal(u)) frontier.push(u); }
} catch {}
const sitemapUrls = new Set(frontier.slice(1));

// Breadth-first, one level at a time: the pages of a level are analysed in parallel, then the next level is built
// from their links in page order — so the crawl order, the page cap and the findings match a one-at-a-time crawl.
while (frontier.length && pages.size < maxPages) {
  const level = [];
  while (frontier.length && pages.size + level.length < maxPages) { const u = frontier.shift(); if (u && !pages.has(u) && !level.includes(u)) level.push(u); }
  for (const u of level) pages.set(u, { url: u, path: pathOf(u), pending: true });   // reserve the report order
  await pool(level, concurrency, async (u) => { pages.set(u, await analysePage(u, u === startUrl)); });
  const next = [];
  for (const u of level) for (const tgt of pages.get(u).discovered) if (!pages.has(tgt) && !frontier.includes(tgt) && !next.includes(tgt)) next.push(tgt);
  frontier.push(...next);
}
phase = "post";

// Findings in crawl order (identical for any --concurrency), then the cross-page checks.
const linkSources = new Map();    // target url → Set(source paths)
const anchorChecks = [];
for (const p of pages.values()) {
  issues.push(...p.issues);
  anchorChecks.push(...(p.anchorChecks || []));
  for (const l of p.links || []) {
    const h = (l.href || "").trim();
    if (!h || h === "#" || /^(javascript|mailto|tel|sms):/i.test(h) || h.startsWith("#")) continue;
    let abs; try { abs = new URL(h, p.base || p.url); } catch { continue; }
    const key = abs.origin !== origin ? (/^https?:$/.test(abs.protocol) ? abs.href : null) : norm(abs.href, p.url);
    if (key) (linkSources.get(key) || linkSources.set(key, new Set()).get(key)).add(p.path);
  }
}
if (fast) {   // images were not downloaded during the crawl: check each distinct URL once
  const urls = [...new Set([...pages.values()].flatMap((p) => p.imageUrls || []))].filter((u) => /^https?:/i.test(u)).slice(0, 300);
  const problems = new Map();
  await pool(urls, 8, async (u) => { const why = await imageProblem(u); if (why) problems.set(u, why); });
  for (const p of pages.values()) for (const u of (p.imageUrls || []).filter((x) => problems.has(x)).slice(0, 5)) add("warn", "broken-image", `image failed to load: ${u}`, p.path);
}
// Anchors on other pages: check the target page's ids.
for (const a of anchorChecks) {
  const p = pages.get(a.target);
  if (p?.ids && !p.ids.includes(a.id)) add("warn", "missing-anchor", `link "${a.text}" → ${pathOf(a.target)}#${a.id} but that page has no element with id "${a.id}"`, a.source);
}
// Broken internal links, reported once per target with its sources.
for (const [tgt, sources] of linkSources) {
  if (!isInternal(tgt)) continue;
  const p = pages.get(tgt);
  if (p && (p.status >= 400 || p.status === -1)) add("error", "broken-link", `${pathOf(tgt)} returns ${p.status === -1 ? "no response" : p.status} — linked from ${[...sources].slice(0, 4).join(", ")}`, [...sources][0]);
}
// Orphans: in the sitemap or routes folder, but no crawled page links to them.
const linked = new Set([...linkSources.keys()].filter(isInternal).map(pathOf));
linked.add(pathOf(startUrl));
for (const u of sitemapUrls) if (!linked.has(pathOf(u))) add("warn", "orphan", `in sitemap.xml but no page links to it — users can't find it`, pathOf(u));
const fsr = fsRoutes(routesDir);
for (const r of fsr.static) {
  if (!linked.has(r)) add("warn", "orphan", `route exists in ${routesDir} but no crawled page links to it`, r);
}
if (fsr.dynamic.length) add("info", "routes", `${fsr.dynamic.length} dynamic route(s) not crawled directly: ${fsr.dynamic.slice(0, 6).join(", ")} — make sure list pages link to them`);
// 404 handling.
{
  const t = await newTab();
  try {
    const res = await t.tab.goto(`${origin}/__vibeweave-wiring-404-check`, { waitUntil: "load", timeout: 20_000 });
    const s = res?.status() ?? 0;
    const has = await t.tab.evaluate(() => ({ links: document.querySelectorAll("a[href]").length, h1: !!document.querySelector("h1") })).catch(() => ({ links: 0, h1: false }));
    if (s !== 404) add("warn", "not-found", `unknown URLs return ${s}, not 404 (soft 404s hurt SEO and confuse users)`);
    else if (!has.links) add("warn", "not-found", "the 404 page has no links — give lost visitors a way home (and search, if the site is large)");
  } catch {} finally { await t.context.close().catch(() => {}); }
}
// External links (optional), reported in link order.
if (external) {
  phase = "external";
  const ext = [...linkSources.keys()].filter((u) => !isInternal(u)).slice(0, 60);
  const results = new Array(ext.length);
  await pool(ext, 8, async (u, i) => {
    try {
      let r = await fetch(u, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
      if (r.status === 405 || r.status === 403) r = await fetch(u, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(8000) });
      await r.body?.cancel().catch(() => {});
      if (r.status >= 400) results[i] = ["warn", `${u} returns ${r.status} — linked from ${[...linkSources.get(u)].slice(0, 3).join(", ")}`];
    } catch (e) { results[i] = ["info", `${u} could not be checked (${e.name})`]; }
  });
  for (const r of results) if (r) add(r[0], "external-link", r[1]);
}
phase = "done";
await browser.close();

sortIssues(issues);
const counts = issues.reduce((acc, i) => ((acc[i.sev] = (acc[i.sev] || 0) + 1), acc), {});
const verdict = counts.error ? "FAIL" : counts.warn ? "CONCERNS" : "PASS";
const report = { start, verdict, counts, pagesCrawled: pages.size, truncated: frontier.some((u) => !pages.has(u)),
  pages: publicPages(), issues, generatedAt: new Date().toISOString() };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "wiring.json"), JSON.stringify(report, null, 2));

if (json) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Wiring check — ${start}  (${pages.size} page${pages.size === 1 ? "" : "s"} crawled${report.truncated ? `, stopped at --max-pages ${maxPages}` : ""}${click ? ", buttons click-tested" : ""}${fast ? ", --fast" : ""})\n`);
  console.log("PAGE                                   STATUS  LINKS  H1  DEAD BUTTONS");
  for (const p of report.pages) console.log(`${p.path.slice(0, 38).padEnd(38)} ${String(p.status).padStart(6)}  ${String(p.outgoingLinks).padStart(5)}  ${String(p.h1 ?? "-").padStart(2)}  ${p.deadButtons.length || ""}`);
  const icon = { error: "✖", warn: "▲", info: "·" };
  let current = "";
  for (const i of issues) {
    if (i.sev !== current) { current = i.sev; console.log(`\n${current.toUpperCase()}`); }
    console.log(`  ${icon[i.sev]} [${i.kind}] ${i.where ? `${i.where} — ` : ""}${i.msg}`);
  }
  console.log(`\nVerdict: ${verdict} — ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info${fast ? " (--fast: images checked by HEAD, fonts/media/WebGL off — re-run without --fast for the final gate)" : ""}`);
  console.log(`Report: ${join(outDir, "wiring.json")}\nForms, auth and payments still need an end-to-end test with real data — see test-recipes.md.`);
}
process.exitCode = strict && counts.error ? 1 : 0;
