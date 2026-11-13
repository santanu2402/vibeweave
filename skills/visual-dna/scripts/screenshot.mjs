#!/usr/bin/env node
// Visual check: full-page screenshots at several widths + a rendered-page health report
// (horizontal overflow, console errors, failed requests, broken images, missing alt,
// small tap targets, fonts actually loaded).
//
// Usage: node screenshot.mjs <url> [--widths 375,768,1440] [--out .design-review] [--dark]
//                            [--reduced-motion] [--no-full-page] [--wait 800] [--concurrency 3] [--nav-timeout 45]
//   --wait ms        extra wait after scrolling; the capture then also waits for the page to settle (no DOM change,
//                    no finite animation running; capped at 2 s) so a busy machine can't capture a half-rendered page
//   --concurrency n  widths captured in parallel, each in its own fresh context (default min(3, CPUs/2))
// Requires Playwright resolvable from the current project:
//   npm i -D playwright && npx playwright install chromium
// All browser tools accept --max-time <seconds> (default here: 60 per width, at least 300). A run cut short is never a
// pass: it writes the partial report with "verdict": "INCOMPLETE", prints what was not verified and exits 124.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { availableParallelism, cpus } from "node:os";

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const VALUE_FLAGS = ["--widths", "--out", "--wait", "--max-time", "--concurrency", "--nav-timeout"];
const url = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
if (!url) {
  console.error("Usage: node screenshot.mjs <url> [--widths 375,768,1440] [--out .design-review] [--dark] [--reduced-motion] [--no-full-page] [--wait 800] [--concurrency 3]");
  process.exit(2);
}
// Only web pages and local files are opened (no javascript:, data: or browser-internal URLs).
try { if (!["http:", "https:", "file:"].includes(new URL(url).protocol)) throw 0; }
catch { console.error(`✖ ${url} is not an http(s):// or file:// URL`); process.exit(2); }
// Widths are clamped to 200–3840px so a typo can't request a gigantic full-page capture; duplicates are dropped.
const widths = [...new Set(opt("widths", "375,768,1440").split(",").map((w) => parseInt(w, 10)).filter(Boolean).map((w) => Math.min(3840, Math.max(200, w))))];
if (!widths.length) { console.error("✖ --widths needs comma-separated pixel widths, e.g. 375,768,1440"); process.exit(2); }
const outDir = resolve(opt("out", ".design-review"));
const waitMs = Math.min(30_000, Math.max(0, parseInt(opt("wait", "800"), 10) || 0));
const cores = typeof availableParallelism === "function" ? availableParallelism() : cpus().length;
const concurrency = Math.min(8, Math.max(1, parseInt(opt("concurrency", String(Math.min(3, Math.max(1, Math.floor(cores / 2))))), 10) || 1));
const navTimeout = Math.min(600, Math.max(1, Number(opt("nav-timeout", "45")) || 45)) * 1000;
/** Strip terminal control characters from page-derived text before printing it. */
const clean = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
const fullPage = !argv.includes("--no-full-page");
const colorScheme = argv.includes("--dark") ? "dark" : "light";
const reducedMotion = argv.includes("--reduced-motion") ? "reduce" : "no-preference";

/** Import Playwright from the user's project first (the skill folder has no node_modules), then globally. */
async function loadPlaywright() {
  const req = createRequire(join(process.cwd(), "noop.js"));
  for (const id of ["playwright", "playwright-core", "@playwright/test"]) {
    try { return await import(pathToFileURL(req.resolve(id)).href); } catch {}
    try { return await import(id); } catch {}
  }
  console.error(`Playwright not found from ${process.cwd()}.
Install it in the project (ask the user first):
  npm i -D playwright && npx playwright install chromium
Or use a browser/Playwright MCP tool if your IDE provides one.`);
  process.exit(3);
}

/** Launch bundled Chromium, falling back to an installed Chrome or Edge so no browser download is needed. */
async function launch(chromium) {
  const errors = [];
  for (const channel of [undefined, "chrome", "msedge"]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch (e) { errors.push(e.message.split("\n")[0]); }
  }
  console.error(`Could not launch a browser:\n  ${errors.join("\n  ")}\nRun: npx playwright install chromium`);
  process.exit(3);
}
/** Runs in the page: resolve once it has settled — fonts loaded, no DOM mutation for `quiet` ms and no finite
 *  CSS/WAAPI animation still running — or after `cap` ms, so a page that never settles can't stall the run. */
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
/** Run fn over items with at most n in flight. */
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}

const pw = await loadPlaywright();
const chromium = pw.chromium || pw.default?.chromium;
const browser = await launch(chromium);
const report = { url, colorScheme, reducedMotion, generatedAt: new Date().toISOString(), viewports: [] };
const slots = new Array(widths.length);   // one viewport report per width, in --widths order
// Run guard: always close the browser on Ctrl+C or termination, and stop with a clear message when the run
// exceeds its time budget (--max-time seconds, default 60 per width, at least 300) instead of hanging.
const maxTimeArg = Number(opt("max-time", NaN));
const runBudget = Math.min(86_400, Math.max(1, maxTimeArg > 0 ? maxTimeArg : Math.max(300, 60 * widths.length)));
let stopping = false;
/** A run cut short is never a pass: save what was captured, marked INCOMPLETE, and say what was not verified. */
function writeIncomplete() {
  const missing = widths.filter((w, i) => !slots[i]);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "report.json"), JSON.stringify({ ...report, verdict: "INCOMPLETE", incomplete: true, notVerified: missing.map((w) => `${w}px`), viewports: slots.filter(Boolean) }, null, 2));
  console.log(`INCOMPLETE — not verified: widths ${missing.join(", ")}px (${widths.length - missing.length}/${widths.length} captured) · partial report ${join(outDir, "report.json")}`);
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
mkdirSync(outDir, { recursive: true });

// Widths run in parallel, each in its own fresh context; results keep the --widths order.
await pool(widths, concurrency, async (width, i) => {
  const height = width < 600 ? 812 : width < 1100 ? 1024 : 900;
  const context = await browser.newContext({ viewport: { width, height }, colorScheme, reducedMotion,
    deviceScaleFactor: width < 600 ? 2 : 1, hasTouch: width < 600, isMobile: width < 600 });
  try {
    const page = await context.newPage();
    const consoleErrors = [], failedRequests = [];
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 300)); });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e.message).slice(0, 300)}`));
    page.on("response", (r) => { if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => failedRequests.push(`FAILED ${r.url()} (${r.failure()?.errorText})`));

    // Pages with long-polling or analytics never reach "networkidle": on that timeout keep the loaded page.
    // Any other navigation error (refused, DNS, TLS…) stops the run with the real reason.
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: navTimeout });
    } catch (e) {
      if (e?.name !== "TimeoutError") throw e;
      await page.waitForLoadState("load", { timeout: navTimeout }).catch(() => {});
    }
    // Scroll through once so lazy content and scroll-triggered reveals render before capture.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(waitMs);
    await page.evaluate(SETTLE, { quiet: 200, cap: 2000, animCap: 10_000 }).catch(() => {});

    const checks = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const describe = (el) => {
        const id = el.id ? `#${el.id}` : "";
        const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".") : "";
        return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 120);
      };
      const overflowing = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > vw + 1 || r.left < -1) {
          const style = getComputedStyle(el);
          if (style.position === "fixed" && style.visibility === "hidden") continue;
          overflowing.push({ el: describe(el), right: Math.round(r.right), left: Math.round(r.left) });
        }
        if (overflowing.length >= 15) break;
      }
      const imgs = [...document.images];
      const small = [];
      for (const el of document.querySelectorAll("a[href], button, input, select, textarea, [role=button], [role=link], [tabindex]:not([tabindex='-1'])")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const inline = getComputedStyle(el).display === "inline" && el.closest("p, li, td");
        if (!inline && (r.width < 24 || r.height < 24)) small.push(`${describe(el)} (${Math.round(r.width)}×${Math.round(r.height)})`);
        if (small.length >= 15) break;
      }
      const body = getComputedStyle(document.body);
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: vw,
        horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
        overflowingElements: overflowing,
        brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src).slice(0, 15),
        imagesMissingAlt: imgs.filter((i) => !i.hasAttribute("alt")).map((i) => i.currentSrc || i.src).slice(0, 15),
        smallTapTargets: small,
        viewportMeta: document.querySelector('meta[name="viewport"]')?.content || null,
        h1Count: document.querySelectorAll("h1").length,
        title: document.title,
        metaDescription: document.querySelector('meta[name="description"]')?.content || null,
        lang: document.documentElement.lang || null,
        bodyFont: body.fontFamily, bodyFontSize: body.fontSize,
        fontsLoaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20),
      };
    });

    const file = join(outDir, `${colorScheme}-${width}.png`);
    await page.screenshot({ path: file, fullPage, animations: "disabled" });
    slots[i] = { width, screenshot: file, consoleErrors, failedRequests: failedRequests.slice(0, 20), ...checks };
  } finally { await context.close().catch(() => {}); }
});
await browser.close();
report.viewports = slots;

writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
for (const v of report.viewports) {
  const flags = [
    !v.viewportMeta && `no <meta name="viewport"> — mobile browsers will render a zoomed-out desktop layout`,
    v.horizontalOverflow && `HORIZONTAL OVERFLOW (doc ${v.documentWidth}px > viewport ${v.viewportWidth}px)`,
    v.consoleErrors.length && `${v.consoleErrors.length} console errors`,
    v.failedRequests.length && `${v.failedRequests.length} failed requests`,
    v.brokenImages.length && `${v.brokenImages.length} broken images`,
    v.imagesMissingAlt.length && `${v.imagesMissingAlt.length} images missing alt`,
    v.smallTapTargets.length && `${v.smallTapTargets.length} tap targets < 24px`,
    v.h1Count !== 1 && `${v.h1Count} <h1> elements`,
  ].filter(Boolean);
  console.log(`\n${v.width}px → ${v.screenshot}`);
  console.log(flags.length ? flags.map((f) => `  ⚠ ${f}`).join("\n") : "  ✓ no automatic issues found");
  if (v.horizontalOverflow) console.log("  overflowing:", clean(v.overflowingElements.slice(0, 5).map((o) => o.el).join(", ")));
}
console.log(`\nFull report: ${join(outDir, "report.json")}`);
console.log("Now open the screenshots and critique them visually — automated checks can't judge taste.");
