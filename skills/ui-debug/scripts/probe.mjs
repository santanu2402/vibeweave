#!/usr/bin/env node
// Diagnose rendered-page bugs in a real browser and explain the usual root causes.
//
// Page mode (no --selector): console + page errors with source locations, hydration warnings,
//   failed requests, the ROOT element causing horizontal overflow, sticky elements that can't stick,
//   position:fixed trapped by a transformed ancestor, z-index with no effect, text spilling out of
//   flex/grid children, broken images, fonts that fell back.
// Element mode (--selector ".css"): box, key computed styles, what is covering it at its centre,
//   and the ancestor chain annotated with stacking contexts, clipping and containing blocks.
//
// Usage: node probe.mjs <url> [--selector "<css>"] [--width 1280] [--height 900] [--dark] [--json] [--out .design-review]
//                       [--nav-timeout 45]   (pages that never go network-idle are probed once loaded)
// Requires Playwright resolvable from the current project:
//   npm i -D playwright && npx playwright install chromium   (an installed Chrome/Edge also works)
// All browser tools accept --max-time <seconds> (default here: 300). A run cut short is never a pass: it writes the
// partial report with "verdict": "INCOMPLETE", prints what was not verified and exits 124.
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
const target = argv.find((a, i) => !a.startsWith("--") && !["--selector", "--width", "--height", "--out", "--max-time", "--nav-timeout"].includes(argv[i - 1]));
if (!target) {
  console.error('Usage: node probe.mjs <url> [--selector "<css>"] [--width 1280] [--height 900] [--dark] [--json] [--out .design-review]');
  process.exit(2);
}
const url = httpUrl(target);
if (!url) { console.error(`✖ "${target}" is not an http(s) URL. Serve local files first (e.g. npx serve dist) and pass http://localhost:<port>.`); process.exit(2); }
const selector = opt("selector", null);
const clampInt = (v, d, lo, hi) => Math.min(hi, Math.max(lo, parseInt(v, 10) || d));
const width = clampInt(opt("width", "1280"), 1280, 200, 3840);
const height = clampInt(opt("height", "900"), 900, 200, 2160);
const json = argv.includes("--json");
const outDir = resolve(opt("out", ".design-review"));
const navTimeout = Math.min(600, Math.max(1, Number(opt("nav-timeout", "45")) || 45)) * 1000;

async function loadPlaywright() {
  const req = createRequire(join(process.cwd(), "noop.js"));
  for (const id of ["playwright", "playwright-core", "@playwright/test"]) {
    try { return await import(pathToFileURL(req.resolve(id)).href); } catch {}
    try { return await import(id); } catch {}
  }
  console.error(`Playwright not found from ${process.cwd()}.
Install it in the project (ask the user first):
  npm i -D playwright && npx playwright install chromium
Or use a Chrome DevTools / Playwright MCP tool if your IDE provides one.`);
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

const pw = await loadPlaywright();
const browser = await launch(pw.chromium || pw.default?.chromium);
// Run guard: always close the browser on Ctrl+C or termination, and stop with a clear message when the run
// exceeds its time budget (--max-time seconds, default 300) instead of hanging on a slow page or machine.
const maxTimeArg = Number(opt("max-time", NaN));
const runBudget = Math.min(86_400, Math.max(1, maxTimeArg > 0 ? maxTimeArg : 300));
let stopping = false, stage = "loading the page";
const consoleMsgs = [], failed = [];
/** A run cut short is never a pass: save what was seen so far, marked INCOMPLETE, and say what was not verified. */
function writeIncomplete() {
  const notVerified = [`${stage} did not finish`, selector ? `element ${selector}` : "overflow, sticky, fixed, z-index, spill, image and font checks"];
  mkdirSync(outDir, { recursive: true });
  const report = { url, viewport: { width, height }, selector, verdict: "INCOMPLETE", incomplete: true, notVerified, console: consoleMsgs.slice(0, 30), failedRequests: [...new Set(failed)].slice(0, 20) };
  writeFileSync(join(outDir, "probe.json"), JSON.stringify(report, null, 2));
  if (json) console.log(JSON.stringify(report, null, 2));
  (json ? console.error : console.log)(`INCOMPLETE — not verified: ${notVerified.join("; ")} · partial report ${join(outDir, "probe.json")}`);
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
const context = await browser.newContext({ viewport: { width, height }, colorScheme: argv.includes("--dark") ? "dark" : "light",
  isMobile: width < 600, hasTouch: width < 600, deviceScaleFactor: width < 600 ? 2 : 1 });
const page = await context.newPage();
page.on("console", (m) => {
  if (!["error", "warning"].includes(m.type())) return;
  const loc = m.location();
  consoleMsgs.push({ type: m.type(), text: m.text().slice(0, 400), at: loc?.url ? `${loc.url.split("?")[0]}:${loc.lineNumber + 1}` : "" });
});
page.on("pageerror", (e) => consoleMsgs.push({ type: "pageerror", text: String(e.message).slice(0, 400), at: (e.stack || "").split("\n")[1]?.trim() || "" }));
page.on("requestfailed", (r) => failed.push(`FAILED ${r.url()} (${r.failure()?.errorText})`));
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
// Only a network-idle timeout keeps the loaded page (long-polling, analytics); any other navigation error stops the run.
try { await page.goto(url, { waitUntil: "networkidle", timeout: navTimeout }); }
catch (e) { if (e?.name !== "TimeoutError") throw e; await page.waitForLoadState("load", { timeout: navTimeout }).catch(() => {}); }
await page.waitForTimeout(800);   // late hydration warnings and timer errors still land in the report
stage = selector ? "the element probe" : "the page checks";

const HELPERS = `
  const d = (el) => { if (!el || !el.tagName) return "(none)"; const id = el.id ? "#" + el.id : "";
    const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") : "";
    return (el.tagName.toLowerCase() + id + cls).slice(0, 110); };
  // Why does this element start a stacking context / containing block / clip? (CSS spec triggers)
  const stacking = (el, cs) => { const r = []; const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const flexItem = pcs && /flex|grid/.test(pcs.display);
    if (cs.zIndex !== "auto" && (cs.position !== "static" || flexItem)) r.push("z-index " + cs.zIndex);
    if (cs.position === "fixed" || cs.position === "sticky") r.push("position:" + cs.position);
    if (parseFloat(cs.opacity) < 1) r.push("opacity " + cs.opacity);
    if (cs.transform !== "none") r.push("transform"); if (cs.filter !== "none") r.push("filter");
    if (cs.backdropFilter && cs.backdropFilter !== "none") r.push("backdrop-filter");
    if (cs.isolation === "isolate") r.push("isolation"); if (cs.mixBlendMode !== "normal") r.push("mix-blend-mode");
    if (/transform|opacity|filter/.test(cs.willChange)) r.push("will-change:" + cs.willChange);
    if (/paint|strict|content/.test(cs.contain)) r.push("contain:" + cs.contain);
    if (cs.clipPath !== "none") r.push("clip-path"); if (cs.maskImage && cs.maskImage !== "none") r.push("mask");
    return r; };
  const trapsFixed = (cs) => cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" ||
    (cs.backdropFilter && cs.backdropFilter !== "none") || /transform|filter|perspective/.test(cs.willChange) || /paint|layout|strict|content/.test(cs.contain);
  const clips = (cs) => cs.overflowX !== "visible" || cs.overflowY !== "visible";
`;

let result;
if (!selector) {
  result = await page.evaluate(`(() => { ${HELPERS}
    const out = { overflow: [], sticky: [], fixedTrapped: [], zIndexNoEffect: [], textSpill: [], brokenImages: [], fontFallback: [] };
    const vw = document.documentElement.clientWidth;
    out.docWidth = document.documentElement.scrollWidth; out.viewport = vw;
    const all = [...document.querySelectorAll("body *")];
    // Horizontal overflow: report the outermost offenders whose parent does NOT overflow (the root cause).
    // Only the right edge matters — content past the left edge can't be scrolled to (e.g. off-screen skip links).
    const over = new Set(all.filter((el) => { const r = el.getBoundingClientRect(); return r.width && r.right > vw + 1; }));
    for (const el of over) {
      if (over.has(el.parentElement)) continue;
      let clipped = false; for (let a = el.parentElement; a; a = a.parentElement) if (clips(getComputedStyle(a))) { clipped = true; break; }
      if (clipped) continue;
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); const why = [];
      // innerWidth - clientWidth is the scrollbar on desktop; on mobile emulation innerWidth grows with the overflow, so cap it.
      const scrollbar = innerWidth - vw > 0 && innerWidth - vw < 30;
      const fullVw = Math.abs(r.width - vw) < 2 || (scrollbar && Math.abs(r.width - innerWidth) < 2);
      if (fullVw && r.left > 1) why.push("full viewport width (100vw / w-screen) plus a left offset or margin — use width: 100% or subtract the offset");
      else if (fullVw && scrollbar) why.push("width = 100vw includes the vertical scrollbar — use width: 100%");
      else if (r.width > vw + 1) why.push(Math.round(r.width) + "px wide in a " + vw + "px viewport — use max-width: 100% or a fluid width (%, min(), clamp())");
      if (parseFloat(cs.marginLeft) < 0 || parseFloat(cs.marginRight) < 0) why.push("negative margin");
      if (cs.transform !== "none") why.push("transform moves it off-screen — clip the section (overflow-x: clip)");
      if (cs.whiteSpace === "nowrap" || cs.whiteSpace === "pre") why.push("white-space: " + cs.whiteSpace + " — long unbroken text");
      if (/^(IMG|VIDEO|IFRAME|CANVAS|SVG|TABLE|PRE)$/i.test(el.tagName)) why.push(el.tagName.toLowerCase() + " without max-width:100% / overflow-x:auto");
      if (cs.position === "absolute") why.push("absolutely positioned past the edge");
      out.overflow.push({ el: d(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), why });
      if (out.overflow.length >= 8) break;
    }
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.position === "sticky") {
        const why = [];
        if ([cs.top, cs.bottom, cs.left, cs.right].every((v) => v === "auto")) why.push("no top/bottom/left/right offset set");
        for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
          const acs = getComputedStyle(a);
          if (clips(acs)) { why.push("ancestor " + d(a) + " has overflow " + acs.overflowX + "/" + acs.overflowY + " — sticky sticks to that box instead of the page (use overflow: clip or move the overflow)"); break; }
        }
        const p = el.parentElement; if (p && p.getBoundingClientRect().height - el.getBoundingClientRect().height < 4) why.push("parent is barely taller than the element — no room to stick (sticky only moves within its parent)");
        if (p && /flex|grid/.test(getComputedStyle(p).display) && getComputedStyle(el).alignSelf === "auto" && /stretch|normal/.test(getComputedStyle(p).alignItems)) why.push("stretched flex/grid item fills the parent height — add align-self: start");
        if (why.length) out.sticky.push({ el: d(el), why });
      }
      if (cs.position === "fixed") {
        for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
          if (trapsFixed(getComputedStyle(a))) { out.fixedTrapped.push({ el: d(el), ancestor: d(a), why: "ancestor has transform/filter/perspective/contain/backdrop-filter, so position:fixed is relative to it, not the viewport (portal the element to <body>)" }); break; }
        }
      }
      if (cs.zIndex !== "auto" && cs.position === "static") {
        const pcs = el.parentElement ? getComputedStyle(el.parentElement) : null;
        if (!(pcs && /flex|grid/.test(pcs.display))) out.zIndexNoEffect.push(d(el) + " (z-index " + cs.zIndex + " on position: static — add position: relative)");
      }
      if (/flex|grid/.test(cs.display) && el.clientWidth > 0) {
        const right = el.getBoundingClientRect().right;
        for (const c of el.children) {
          const ccs = getComputedStyle(c);
          if (c.getBoundingClientRect().right > right + 2 && ccs.position !== "absolute" && ccs.position !== "fixed")
            out.textSpill.push(d(c) + " is wider than its " + cs.display + " container " + d(el) + (ccs.minWidth === "auto" ? " — min-width:auto keeps it at content size: add min-width: 0 (grid: minmax(0, 1fr)) and overflow-wrap: anywhere" : ""));
        }
      } else if (el.children.length === 0 && el.innerText && el.scrollWidth > el.clientWidth + 2 && cs.overflowX === "visible" && el.clientWidth > 0) {
        out.textSpill.push(d(el) + " — text overflows its box: add overflow-wrap: anywhere, or text-overflow: ellipsis with overflow: hidden");
      }
    }
    out.zIndexNoEffect = out.zIndexNoEffect.slice(0, 8); out.textSpill = out.textSpill.slice(0, 8);
    out.brokenImages = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => (i.currentSrc || i.src)).slice(0, 10);
    const families = new Set();
    for (const el of document.querySelectorAll("body, h1, h2, h3, p, button, a")) families.add(getComputedStyle(el).fontFamily.split(",")[0].trim().replace(/["']/g, ""));
    const generic = /^(serif|sans-serif|monospace|system-ui|ui-\\w+|cursive|fantasy|-apple-system|BlinkMacSystemFont)$/i;
    // document.fonts.check() is true for unknown names, so compare glyph widths against two generic fallbacks instead.
    const ctx = document.createElement("canvas").getContext("2d"); const probe = "mmmmmmmmmwwwwwwwlli1QZ@#";
    const w = (font) => { ctx.font = "32px " + font; return ctx.measureText(probe).width; };
    for (const f of families) if (f && !generic.test(f) && w('"' + f + '", monospace') === w("monospace") && w('"' + f + '", serif') === w("serif"))
      out.fontFallback.push(f + " is requested but not available — the browser fell back. Check the @font-face URL/CORS, the next/font or Fontsource import, and the exact family name");
    return out; })()`);
} else {
  result = await page.evaluate(`((sel) => { ${HELPERS}
    let els; try { els = document.querySelectorAll(sel); } catch { return { error: "Invalid CSS selector: " + sel }; }
    if (!els.length) return { error: "No element matches " + sel };
    const el = els[0]; const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    const pick = ["display", "position", "zIndex", "top", "left", "width", "height", "minWidth", "overflowX", "overflowY", "opacity", "visibility",
      "transform", "filter", "backdropFilter", "pointerEvents", "isolation", "contain", "willChange", "flexShrink", "alignSelf"];
    const DEFAULTS = { opacity: "1", flexShrink: "1", minWidth: "0px", isolation: "auto" };
    const styles = Object.fromEntries(pick.map((k) => [k, cs[k]]).filter(([k, v]) => k === "display" || k === "position" || (v && v !== DEFAULTS[k] && !["none", "auto", "normal", "visible"].includes(v))));
    let covered = null;
    if (r.width && r.height) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx >= 0 && cy >= 0 && cx <= innerWidth && cy <= innerHeight) {
        const top = document.elementFromPoint(cx, cy);
        if (top && top !== el && !el.contains(top) && !top.contains(el)) covered = d(top) + " is on top at the element's centre — it receives the clicks (check its z-index/stacking context or pointer-events)";
      } else covered = "element centre is outside the viewport (scroll needed or positioned off-screen)";
    }
    const chain = [];
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const acs = getComputedStyle(a); const notes = [];
      const sc = stacking(a, acs); if (sc.length) notes.push("stacking context (" + sc.join(", ") + ")");
      if (a !== el && clips(acs)) notes.push("clips overflow (" + acs.overflowX + "/" + acs.overflowY + ")");
      if (a !== el && trapsFixed(acs)) notes.push("containing block for fixed descendants");
      if (acs.display === "none") notes.push("display:none");
      if (acs.visibility === "hidden") notes.push("visibility:hidden");
      if (acs.pointerEvents === "none") notes.push("pointer-events:none");
      chain.push({ el: d(a), notes });
    }
    return { selector: sel, matches: els.length, element: d(el), box: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
      styles, covered, chain }; })(${JSON.stringify(selector)})`);
}
await context.close().catch(() => {});
await browser.close();

const hydration = consoleMsgs.filter((m) => /hydrat|did not match|server rendered HTML|Text content does not match/i.test(m.text));
const report = { url, viewport: { width, height }, selector, console: consoleMsgs.slice(0, 30), hydration: hydration.length, failedRequests: [...new Set(failed)].slice(0, 20), ...result };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "probe.json"), JSON.stringify(report, null, 2));
if (json) { console.log(JSON.stringify(report, null, 2)); process.exit(0); }

console.log(`${url} @ ${width}×${height}`);
const section = (title, items, fmt = (x) => x) => { if (items?.length) { console.log(`\n${title}`); for (const i of items) console.log(`  ${fmt(i)}`); } };
section("CONSOLE / PAGE ERRORS", consoleMsgs.slice(0, 15), (m) => `${m.type === "warning" ? "▲" : "✖"} ${m.text}${m.at ? `\n      at ${m.at}` : ""}`);
if (hydration.length) console.log("  → hydration mismatch: server and client rendered different markup. Usual causes: Date/Math.random/locale formatting in render, typeof window branches, browser extensions, invalid nesting (<p><div>). Move client-only values into an effect or render them client-only.");
section("FAILED REQUESTS", report.failedRequests, (f) => `✖ ${f}`);
if (result.error) { console.log(`\n✖ ${result.error}`); process.exit(1); }
if (!selector) {
  if (result.docWidth > result.viewport + 1) console.log(`\nHORIZONTAL OVERFLOW: document ${result.docWidth}px > viewport ${result.viewport}px`);
  section("OVERFLOW ROOT CAUSES", result.overflow, (o) => `✖ ${o.el} (left ${o.left}, right ${o.right})${o.why.length ? `\n      ${o.why.join("; ")}` : ""}`);
  section("STICKY THAT CAN'T STICK", result.sticky, (s) => `▲ ${s.el}\n      ${s.why.join("\n      ")}`);
  section("FIXED ELEMENTS TRAPPED", result.fixedTrapped, (f) => `▲ ${f.el} inside ${f.ancestor}\n      ${f.why}`);
  section("Z-INDEX WITH NO EFFECT", result.zIndexNoEffect, (z) => `· ${z}`);
  section("CONTENT SPILLING OUT OF ITS CONTAINER", result.textSpill, (t) => `▲ ${t}`);
  section("BROKEN IMAGES", result.brokenImages, (b) => `✖ ${b}`);
  section("FONT FALLBACKS", result.fontFallback, (f) => `▲ ${f}`);
  const clean = !consoleMsgs.length && !report.failedRequests.length && ["overflow", "sticky", "fixedTrapped", "zIndexNoEffect", "textSpill", "brokenImages", "fontFallback"].every((k) => !result[k].length);
  if (clean) console.log("\n✓ nothing suspicious found at this viewport — try --width 375, --dark, or --selector on the broken element");
} else {
  console.log(`\nELEMENT ${result.element}  (${result.matches} match${result.matches > 1 ? "es" : ""}; box ${result.box.w}×${result.box.h} at ${result.box.x},${result.box.y})`);
  for (const [k, v] of Object.entries(result.styles)) console.log(`  ${k}: ${v}`);
  if (!result.box.w || !result.box.h) console.log("  ✖ zero-size box — check display, collapsed parent, or content that hasn't rendered");
  if (result.covered) console.log(`\n  ✖ ${result.covered}`);
  console.log("\nANCESTORS (element → html)");
  for (const a of result.chain) console.log(`  ${a.el}${a.notes.length ? `\n      ${a.notes.join(" · ")}` : ""}`);
  console.log("\nz-index only competes within the nearest ancestor stacking context; overflow clipping ancestors cut off popovers and break sticky.");
}
console.log(`\nReport: ${join(outDir, "probe.json")}`);
