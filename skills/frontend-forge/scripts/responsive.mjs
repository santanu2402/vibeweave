#!/usr/bin/env node
// Responsive sweep: render a page at many widths and report what breaks at each one —
// horizontal overflow (+ root cause), overlapping text, text cut off by a box smaller than its content, clipped
// text, text too small, touch targets too small, upscaled (blurry) images, sticky/fixed bars eating the screen,
// lines too long to read.
// 320px also covers WCAG 1.4.10 reflow (= 1280px at 400% zoom).
//
// Usage: node responsive.mjs <url> [--widths 320,360,375,390,414,600,768,820,1024,1280,1440,1920,2560]
//                            [--screens] [--json] [--strict] [--out .design-review] [--concurrency 4] [--nav-timeout 45]
//   --concurrency n   widths rendered in parallel in one browser (default min(4, CPUs/2)); each width gets its own
//                     fresh context and the page is measured only once it has settled, so findings don't depend on n
// Each width is scrolled through once first (reveal-on-scroll content is measured revealed, as visitors see it, with
// content-visibility:auto sections kept rendered so their reveals finish).
// Wrapped inline text is compared line by line and tilted (rotated/3D) containers in their own frame, so neither
// is mistaken for overlapping text; text past the edge of a scroll box (reached by scrolling), visually-hidden text
// (.sr-only) and decorative fixed layers are ignored.
//   --nav-timeout s   per-navigation timeout (default 45); pages that never go network-idle are measured once loaded
// Requires Playwright resolvable from the current project (or an installed Chrome/Edge):
//   npm i -D playwright && npx playwright install chromium
// All browser tools accept --max-time <seconds> (default here: 60 per width). A run cut short is never a pass: it writes
// the partial report with "verdict": "INCOMPLETE", prints what was not verified and exits 124.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { availableParallelism, cpus } from "node:os";

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const VALUE_FLAGS = ["--widths", "--out", "--max-time", "--concurrency", "--nav-timeout"];
/** Accept only http(s) targets ("localhost:3000" → http://localhost:3000); file:, data: and javascript: URLs are refused. */
function httpUrl(raw) {
  let u; try { u = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`); } catch { return null; }
  return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
}
const target = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
if (!target) { console.error("Usage: node responsive.mjs <url> [--widths 320,375,768,1024,1440] [--screens] [--json] [--strict] [--out .design-review] [--concurrency 4]"); process.exit(2); }
const url = httpUrl(target);
if (!url) { console.error(`✖ "${target}" is not an http(s) URL. Serve local files first (e.g. npx serve dist) and pass http://localhost:<port>.`); process.exit(2); }
const widths = [...new Set(opt("widths", "320,360,375,390,414,600,768,820,1024,1280,1440,1920,2560").split(",").map(Number)
  .filter((w) => Number.isInteger(w) && w >= 200 && w <= 4000))].slice(0, 30);
if (!widths.length) { console.error("✖ --widths needs comma-separated pixel widths between 200 and 4000"); process.exit(2); }
const outDir = resolve(opt("out", ".design-review"));
const screens = argv.includes("--screens"), json = argv.includes("--json"), strict = argv.includes("--strict");
const cores = typeof availableParallelism === "function" ? availableParallelism() : cpus().length;
const concurrency = Math.min(16, Math.max(1, parseInt(opt("concurrency", String(Math.min(4, Math.max(1, Math.floor(cores / 2))))), 10) || 1));
const navTimeout = Math.min(600, Math.max(1, Number(opt("nav-timeout", "45")) || 45)) * 1000;

async function loadPlaywright() {
  const req = createRequire(join(process.cwd(), "noop.js"));
  for (const id of ["playwright", "playwright-core", "@playwright/test"]) {
    try { return await import(pathToFileURL(req.resolve(id)).href); } catch {}
    try { return await import(id); } catch {}
  }
  console.error(`Playwright not found from ${process.cwd()}.\nInstall it in the project (ask the user first):\n  npm i -D playwright && npx playwright install chromium`);
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

/** Runs inside the page at one viewport width and returns the raw measurements for every check. */
const CHECK = (touch) => {
  const d = (el) => { const id = el.id ? "#" + el.id : ""; const c = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const t = (el.innerText || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 24); return (el.tagName.toLowerCase() + id + c).slice(0, 70) + (t ? ` "${t}"` : ""); };
  const vw = document.documentElement.clientWidth, vh = innerHeight;
  // Visible = drawn on screen: boxes of 1px or less are visually-hidden text (.sr-only, clip patterns), not layout.
  const visible = (el, r) => { const cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.05; };
  const out = { overflow: document.documentElement.scrollWidth > vw + 1, docWidth: document.documentElement.scrollWidth, overflowRoots: [],
    overlaps: [], cutOff: [], clipped: [], smallText: [], smallTargets: [], tinyTargets: [], upscaled: [], coverage: [], longLines: [] };
  const all = [...document.querySelectorAll("body *")];
  // overflow roots (right edge only; skip clipped subtrees)
  const over = new Set(all.filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > vw + 1; }));
  for (const el of over) {
    if (over.has(el.parentElement)) continue;
    let clipped = false; for (let a = el.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== "visible") { clipped = true; break; } }
    if (!clipped) out.overflowRoots.push(`${d(el)} → right ${Math.round(el.getBoundingClientRect().right)}px`);
    if (out.overflowRoots.length >= 5) break;
  }
  // text leaves (the first 400 visible ones — stop scanning once we have them)
  const texts = [];
  for (const el of all) {
    if (texts.length >= 400) break;
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
    const r = el.getBoundingClientRect(); if (visible(el, r) && r.bottom > 0) texts.push(el);
  }
  for (const el of texts) {
    const cs = getComputedStyle(el), fs = parseFloat(cs.fontSize);
    if (fs < 12) out.smallText.push(`${d(el)} ${fs}px`);
    if ((cs.overflowX === "hidden" || cs.overflow === "hidden" || cs.overflowX === "clip") && el.scrollWidth > el.clientWidth + 2 && cs.textOverflow !== "ellipsis") out.clipped.push(d(el));
    const r = el.getBoundingClientRect();
    if (el.tagName === "P" && fs > 0 && r.width / (fs * 0.5) > 95) out.longLines.push(`${d(el)} ≈ ${Math.round(r.width / (fs * 0.5))} chars/line`);
  }
  // overlapping text (different, unrelated elements). Inline text that wraps is compared line box by line box
  // (getClientRects): its bounding box spans both lines and would "overlap" its neighbours. Inside a rotated, skewed
  // or 3D-transformed container (a tilted card) boxes are compared in the container's own frame: the axis-aligned
  // boxes of tilted lines overlap on screen even though the text doesn't.
  const lineRects = (el) => getComputedStyle(el).display === "inline" ? [...el.getClientRects()].filter((r) => r.width > 1 && r.height > 1) : [el.getBoundingClientRect()];
  const tiltedFrame = (el) => {
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const t = getComputedStyle(a).transform;
      if (t && t !== "none") { const m = new DOMMatrixReadOnly(t); if (!m.is2D || Math.abs(m.b) > 1e-3 || Math.abs(m.c) > 1e-3) return a; }
    }
    return null;
  };
  const boxes = texts.map((el) => ({ el, frame: tiltedFrame(el), rects: lineRects(el) }));
  for (const frame of new Set(boxes.map((b) => b.frame).filter(Boolean))) {
    // Untransformed layout: switch the transition off first so restoring the transform doesn't animate back.
    const s = frame.style, saved = ["transform", "transition"].map((p) => [p, s.getPropertyValue(p), s.getPropertyPriority(p)]);
    s.setProperty("transition", "none", "important"); void getComputedStyle(frame).transition;
    s.setProperty("transform", "none", "important"); void getComputedStyle(frame).transform;
    for (const b of boxes) if (b.frame === frame) b.local = lineRects(b.el);
    for (const [p, v, prio] of saved) { if (v) s.setProperty(p, v, prio); else s.removeProperty(p); void getComputedStyle(frame).getPropertyValue(p); }
  }
  const hits = (ra, rb) => ra.some((a) => rb.some((b) => {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 4 && y > 4 && x * y > 0.25 * Math.min(a.width * a.height, b.width * b.height);
  }));
  // Text that runs past the edge of a clipping ancestor isn't drawn there. In a scroll box it is reached by scrolling
  // (no overlap); under overflow: hidden/clip it is cut off — the real problem is that box (e.g. a card shorter than
  // its content), so that is what gets reported, not the neighbour it happens to lie under.
  const cutBy = (el) => {
    const r = el.getBoundingClientRect();
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a); if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      const c = a.getBoundingClientRect();
      if (r.bottom > c.bottom + 4 || r.top < c.top - 4 || r.right > c.right + 4 || r.left < c.left - 4) return { box: a, scroll: /auto|scroll/.test(cs.overflowX + cs.overflowY) };
    }
    return null;
  };
  for (let i = 0; i < boxes.length && out.overlaps.length + out.cutOff.length < 6; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const sameFrame = a.frame && a.frame === b.frame;
    if (hits(sameFrame ? a.local : a.rects, sameFrame ? b.local : b.rects)) {
      const pa = getComputedStyle(a.el).position, pb = getComputedStyle(b.el).position;
      if (pa === "fixed" || pb === "fixed" || pa === "sticky" || pb === "sticky") continue;   // sticky bars over content are a different check
      const ca = cutBy(a.el), cb = ca ? null : cutBy(b.el), cut = ca || cb;
      if (cut?.scroll) continue;
      if (cut) { out.cutOff.push(`${d(ca ? a.el : b.el)} runs past the edge of ${d(cut.box)} (overflow: hidden) and is hidden — the box is smaller than its content`); break; }
      out.overlaps.push(`${d(a.el)} ⟂ ${d(b.el)}`); break;
    }
  }
  // targets
  for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary")) {
    const r = el.getBoundingClientRect(); if (!visible(el, r)) continue;
    const inline = getComputedStyle(el).display === "inline" && el.closest("p, li, td, dd");
    if (inline) continue;
    if (r.width < 24 || r.height < 24) out.tinyTargets.push(`${d(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    else if (touch && (r.width < 44 || r.height < 44)) out.smallTargets.push(`${d(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  // images shown larger than their pixels (blurry)
  for (const img of document.images) {
    const r = img.getBoundingClientRect(); if (!img.complete || !img.naturalWidth || !r.width || /\.svg(\?|$)/i.test(img.currentSrc)) continue;
    if (img.naturalWidth < r.width * Math.min(devicePixelRatio, 2) * 0.75) out.upscaled.push(`${(img.currentSrc || img.src).split("/").pop().slice(0, 40)} ${img.naturalWidth}px shown at ${Math.round(r.width)}px`);
  }
  // fixed/sticky chrome covering the viewport
  let covered = 0;
  // (decorative layers — no text, nothing to click, or pointer-events: none — sit behind content and don't count)
  for (const el of all) { const cs = getComputedStyle(el); if (cs.position !== "fixed" && cs.position !== "sticky") continue; const r = el.getBoundingClientRect();
    if (!visible(el, r) || r.bottom <= 0 || r.top >= vh || r.width < vw * 0.6) continue;
    if (cs.pointerEvents === "none" || (!(el.innerText || "").trim() && !el.querySelector("a[href], button, input, select, textarea, [role=button]"))) continue;
    const h = Math.min(r.bottom, vh) - Math.max(r.top, 0); if (h > 0) { covered += h; out.coverage.push(`${d(el)} ${Math.round(h)}px`); } }
  out.coveredPct = Math.round((covered / vh) * 100);
  out.viewportMeta = !!document.querySelector('meta[name="viewport"]');
  for (const k of ["smallText", "clipped", "longLines", "smallTargets", "tinyTargets", "upscaled"]) out[k] = [...new Set(out[k])].slice(0, 8);
  return out;
};

/** Runs in the page: resolve once it has settled — fonts loaded, no DOM mutation for `quiet` ms and no finite
 *  CSS/WAAPI animation or transition still running — or after `cap` ms, so a page that never settles can't stall. */
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
/** Runs in the page: scroll through it once like a visitor (two frames per step) and back to the top, so content that
 *  reveals on scroll (IntersectionObserver classes, lazy sections) is measured as people see it, not in its
 *  hidden pre-reveal state. Capped at 150 steps for very long and infinite-scroll pages. */
const REVEAL = async () => {
  // content-visibility:auto sections stop rendering once off-screen and freeze their reveal transitions half-way (then
  // measured mid-slide as overlaps), so every section is kept rendered. A constructed sheet: a strict CSP allows it.
  try { const keep = new CSSStyleSheet(); keep.replaceSync("*, *::before, *::after { content-visibility: visible !important; }"); document.adoptedStyleSheets = [...document.adoptedStyleSheets, keep]; } catch {}
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 40))));
  for (let y = 0, step = 0; y < document.documentElement.scrollHeight && step < 150; y += innerHeight * 0.8, step++) { scrollTo(0, y); await frames(); }
  scrollTo(0, 0); await frames();
};
/** Navigate; when network-idle times out (long-polling, analytics) keep the page that loaded. Other errors throw. */
async function open(page) {
  try { await page.goto(url, { waitUntil: "networkidle", timeout: navTimeout }); }
  catch (e) { if (e?.name !== "TimeoutError") throw e; await page.waitForLoadState("load", { timeout: navTimeout }).catch(() => {}); }
}
/** Run fn over items with at most n in flight; results keep the input order. */
async function pool(items, n, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (next < items.length) { const i = next++; await fn(items[i], i); } }));
}
/** Turn measured rows into findings (also used for the partial report of a run cut short). */
function analyse(rows) {
  const issues = [];
  for (const r of rows) {
    if (!r.viewportMeta && r.width < 600) issues.push({ sev: "error", w: r.width, msg: 'no <meta name="viewport"> — phones render a zoomed-out desktop page' });
    if (r.overflow) issues.push({ sev: "error", w: r.width, msg: `horizontal overflow (page ${r.docWidth}px wide)${r.overflowRoots.length ? ": " + r.overflowRoots.join("; ") : ""}` });
    for (const o of r.overlaps) issues.push({ sev: "error", w: r.width, msg: `overlapping text: ${o}` });
    for (const o of r.cutOff || []) issues.push({ sev: "error", w: r.width, msg: `text cut off: ${o}` });
    for (const t of r.tinyTargets) issues.push({ sev: "error", w: r.width, msg: `target below 24×24 (WCAG 2.5.8): ${t}` });
    for (const c of r.clipped) issues.push({ sev: "warn", w: r.width, msg: `text clipped without ellipsis: ${c}` });
    for (const s of r.smallText) issues.push({ sev: "warn", w: r.width, msg: `text under 12px: ${s}` });
    for (const u of r.upscaled) issues.push({ sev: "warn", w: r.width, msg: `upscaled (blurry) image: ${u} — serve a larger srcset candidate` });
    if (r.width < 768 && r.coveredPct > 25) issues.push({ sev: "warn", w: r.width, msg: `fixed/sticky bars cover ${r.coveredPct}% of the screen: ${r.coverage.join(", ")}` });
    for (const s of r.smallTargets) issues.push({ sev: "info", w: r.width, msg: `touch target under 44×44: ${s}` });
    for (const l of r.longLines) issues.push({ sev: "info", w: r.width, msg: `line length too long to read comfortably (aim ≤ 75ch): ${l}` });
  }
  return { issues, counts: issues.reduce((a, i) => ((a[i.sev] = (a[i.sev] || 0) + 1), a), {}) };
}

const pw = await loadPlaywright();
const browser = await launch(pw.chromium || pw.default?.chromium);
const slots = new Array(widths.length);   // one measured row per width, in --widths order
// Run guard: always close the browser on Ctrl+C or termination, and stop with a clear message when the run
// exceeds its time budget (--max-time seconds, default 60 per width) instead of hanging on a slow page or machine.
const maxTimeArg = Number(opt("max-time", NaN));
const runBudget = Math.min(86_400, Math.max(1, maxTimeArg > 0 ? maxTimeArg : 60 * widths.length));
let stopping = false;
/** A run cut short is never a pass: save what was measured, marked INCOMPLETE, and say what was not verified. */
function writeIncomplete() {
  const done = slots.filter(Boolean);
  const missing = widths.filter((w, i) => !slots[i]);
  const { issues, counts } = analyse(done);
  const report = { url, verdict: "INCOMPLETE", incomplete: true, notVerified: missing.map((w) => `${w}px`), counts, rows: done, issues };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "responsive.json"), JSON.stringify(report, null, 2));
  if (json) console.log(JSON.stringify({ url, verdict: report.verdict, incomplete: true, notVerified: report.notVerified, counts, issues }, null, 2));
  const line = `INCOMPLETE — not verified: ${missing.length ? `widths ${missing.join(", ")}px` : "the final report"} (${done.length}/${widths.length} widths measured; ${counts.error || 0} errors so far) · partial report ${join(outDir, "responsive.json")}`;
  (json ? console.error : console.log)(line);
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
if (screens) mkdirSync(outDir, { recursive: true });
// Widths run in parallel, each in its own fresh context; the page is measured only after it has settled.
await pool(widths, concurrency, async (w, i) => {
  const touch = w < 1024;
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 800 : w < 1100 ? 1000 : 900 }, isMobile: w < 600, hasTouch: touch, deviceScaleFactor: w < 600 ? 2 : 1 });
  try {
    const page = await ctx.newPage();
    await open(page);
    await page.evaluate(SETTLE, { quiet: 200, cap: 2000, animCap: 10_000 }).catch(() => {});
    await page.evaluate(REVEAL).catch(() => {});
    await page.evaluate(SETTLE, { quiet: 200, cap: 2000, animCap: 10_000 }).catch(() => {});
    const r = await page.evaluate(CHECK, touch);
    if (screens) await page.screenshot({ path: join(outDir, `responsive-${w}.png`) });
    slots[i] = { width: w, ...r };
  } finally { await ctx.close().catch(() => {}); }
});
await browser.close();

const rows = slots;
const { issues, counts } = analyse(rows);
const verdict = counts.error ? "FAIL" : counts.warn ? "CONCERNS" : "PASS";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "responsive.json"), JSON.stringify({ url, verdict, counts, rows, issues }, null, 2));

if (json) console.log(JSON.stringify({ url, verdict, counts, issues }, null, 2));
else {
  console.log(`Responsive sweep — ${url}\n`);
  console.log(" WIDTH  OVERFLOW  OVERLAP  CLIPPED  SMALL TEXT  TARGETS<24  <44  UPSCALED  CHROME%");
  for (const r of rows) console.log(`${String(r.width).padStart(6)}  ${(r.overflow ? "✖" : "·").padStart(8)}  ${String(r.overlaps.length || "·").padStart(7)}  ${String(r.clipped.length || "·").padStart(7)}  ${String(r.smallText.length || "·").padStart(10)}  ${String(r.tinyTargets.length || "·").padStart(10)}  ${String(r.smallTargets.length || "·").padStart(3)}  ${String(r.upscaled.length || "·").padStart(8)}  ${String(r.coveredPct).padStart(7)}`);
  const icon = { error: "✖", warn: "▲", info: "·" };
  let current = "";
  for (const i of issues.sort((a, b) => "ewi".indexOf(a.sev[0]) - "ewi".indexOf(b.sev[0]) || a.w - b.w)) {
    if (i.sev !== current) { current = i.sev; console.log(`\n${current.toUpperCase()}`); }
    console.log(`  ${icon[i.sev]} @${i.w}px ${i.msg}`);
  }
  console.log(`\nVerdict: ${verdict} — ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info · report ${join(outDir, "responsive.json")}${screens ? " · screenshots responsive-<w>.png" : ""}`);
  console.log("Also check by eye: layouts should re-compose (not just shrink) at each breakpoint; test real devices for safe areas and the on-screen keyboard.");
}
process.exitCode = strict && counts.error ? 1 : 0;
