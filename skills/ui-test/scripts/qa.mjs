#!/usr/bin/env node
// Rendered-page QA in a real browser — the checks a human tester does by hand:
//   1. axe-core accessibility scan (if axe-core is installed in the project; built-in basics otherwise)
//   2. keyboard walk: Tab through the page, flag invisible focus, focus on hidden elements, traps, no skip link
//   3. motion: what still animates under reduced motion; 5s+ loops with no visible pause control (WCAG 2.2.2), and a
//      pause control that doesn't stop them — or stops them and never starts them again (clicked twice, as a visitor)
//   4. no-JS render: content that stays invisible when JavaScript fails (opacity:0 reveal patterns);
//      reveal: content still invisible after scrolling the whole page with JavaScript on (a reveal that never fires);
//      readability: median characters per line of body text in <main> (aim for ≈ 60–75 characters)
//
// Usage: node qa.mjs <url> [--tabs 60] [--mobile] [--dark] [--only axe,keyboard,motion,nojs] [--json] [--strict] [--out .design-review]
//   --dark  emulate prefers-color-scheme: dark in every pass (contrast/axe in the dark theme) → qa-dark.json
// Requires Playwright resolvable from the current project:
//   npm i -D playwright && npx playwright install chromium     (optional: npm i -D axe-core)
// All browser tools accept --max-time <seconds>; here the default scales with the work (120 + 4 per --tabs step).
// A run that hits it stops, writes what it found, and reports INCOMPLETE (exit 124) — never PASS.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
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
const target = argv.find((a, i) => !a.startsWith("--") && !["--tabs", "--only", "--out", "--max-time"].includes(argv[i - 1]));
if (!target) {
  console.error("Usage: node qa.mjs <url> [--tabs 60] [--mobile] [--dark] [--only axe,keyboard,motion,nojs] [--json] [--strict] [--out .design-review]");
  process.exit(2);
}
const url = httpUrl(target);
if (!url) { console.error(`✖ "${target}" is not an http(s) URL. Serve local files first (e.g. npx serve dist) and pass http://localhost:<port>.`); process.exit(2); }
const maxTabs = Math.min(500, parseInt(opt("tabs", "60"), 10) || 60);
const mobile = argv.includes("--mobile");
const dark = argv.includes("--dark");           // without it, nothing changes (Playwright's default light scheme)
const reportFile = dark ? "qa-dark.json" : "qa.json";
const json = argv.includes("--json");
const strict = argv.includes("--strict");
const only = new Set(opt("only", "axe,keyboard,motion,nojs").split(","));
const outDir = resolve(opt("out", ".design-review"));
const req = createRequire(join(process.cwd(), "noop.js"));

async function loadPlaywright() {
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
async function launch(chromium) {
  const errors = [];
  for (const channel of [undefined, "chrome", "msedge"]) {
    try { return await chromium.launch(channel ? { channel } : {}); } catch (e) { errors.push(e.message.split("\n")[0]); }
  }
  console.error(`Could not launch a browser:\n  ${errors.join("\n  ")}\nRun: npx playwright install chromium`);
  process.exit(3);
}
function axeSource() {
  // axe-core directly, or the copy that @axe-core/playwright depends on.
  const tries = [() => req.resolve("axe-core/axe.min.js"),
    () => createRequire(req.resolve("@axe-core/playwright/package.json")).resolve("axe-core/axe.min.js")];
  for (const t of tries) { try { return readFileSync(t(), "utf8"); } catch {} }
  return null;
}

const findings = [];
const add = (sev, check, msg, where = "") => findings.push({ sev, check, msg, where });
const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 };
// bypassCSP: axe-core is injected as a script tag, which a strict Content-Security-Policy (correctly) blocks.
// The page's own CSP still applies to the page's code; only the test harness is exempt.
const ctxOpts = { viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, bypassCSP: true,
  ...(dark ? { colorScheme: "dark" } : {}) };
async function open(browser, extra = {}) {
  const context = await browser.newContext({ ...ctxOpts, ...extra });
  const page = await context.newPage();
  // Pages with long-polling or streaming never reach "networkidle"; when that times out, keep the page that
  // already loaded instead of navigating again (a second navigation would destroy the context mid-check).
  // Only Playwright's own timeout falls back; any other navigation error (refused, DNS, net::ERR_*) still throws.
  try { await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 }); }
  catch (e) {
    if (e?.name !== "TimeoutError" && !/^page\.goto: Timeout \d+ms exceeded/.test(String(e?.message))) throw e;
    await page.waitForLoadState("load", { timeout: 45_000 }).catch(() => {});
  }
  await page.waitForTimeout(600);
  return { context, page };
}

/** page.evaluate that survives a late client-side navigation or reload: wait for it to settle, then retry. */
async function evaluateStable(page, script, tries = 3) {
  for (let i = 1; ; i++) {
    try { return await page.evaluate(script); }
    catch (e) {
      if (i >= tries || !/context was destroyed|navigat/i.test(String(e?.message))) throw e;
      await page.waitForLoadState("load", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
  }
}
const describe = `(el) => { if (!el || !el.tagName) return "(none)"; const id = el.id ? "#" + el.id : "";
  const cls = typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "";
  const label = (el.getAttribute("aria-label") || el.innerText || el.value || el.alt || "").trim().replace(/\\s+/g, " ").slice(0, 30);
  return el.tagName.toLowerCase() + id + cls + (label ? ' "' + label + '"' : ""); }`;

const pw = await loadPlaywright();
const browser = await launch(pw.chromium || pw.default?.chromium);
// Run guard: always close the browser on Ctrl+C or termination, and stop when the run exceeds its time budget
// (--max-time seconds; default 120 + 4 per --tabs step when the keyboard walk runs) instead of hanging on a slow
// page or machine. A stopped run is INCOMPLETE: it keeps what it found but never claims PASS.
const runBudget = Math.min(Math.max(Number(opt("max-time")) || 120 + (only.has("keyboard") ? 4 * maxTabs : 0), 30), 7200);
const CHECKS = ["axe", "keyboard", "motion", "nojs"];
const done = new Set();          // checks that ran to the end
const summary = { url, viewport, ...(dark ? { theme: "dark" } : {}), checks: {} };
let stopping = false;
const stopIncomplete = async () => {
  const notVerified = CHECKS.filter((c) => only.has(c) && !done.has(c)).map((c) => (c === "nojs" ? "nojs+readability" : c));
  if (stopping || !notVerified.length) return;      // every check already finished: the normal report follows
  stopping = true;
  finish(notVerified);
  console.error(`✖ stopped after ${runBudget}s (--max-time): the page or the machine is too slow — rerun with a larger --max-time (or fewer --tabs)`);
  await browser.close().catch(() => {});
  process.exit(124);
};
const closeBrowserAndExit = async (code, message) => {
  if (stopping) return;
  stopping = true;
  if (message) console.error(message);
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
setTimeout(stopIncomplete, runBudget * 1000).unref();

// ── 1. Accessibility scan ────────────────────────────────────────────────────
if (only.has("axe")) {
  const { context, page } = await open(browser);
  const src = axeSource();
  if (src) {
    await page.addScriptTag({ content: src });
    // Scan the page as visitors see it: scroll through once so scroll-revealed sections finish their entrance
    // transitions — otherwise axe measures text mid-fade. content-visibility:auto sections stop rendering (and
    // freeze their transitions half-way) once they leave the screen, so every section is kept rendered here.
    await page.evaluate(async () => {
      const keep = document.createElement("style");
      keep.textContent = "*, *::before, *::after { content-visibility: visible !important; }";
      document.head.append(keep);
      const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 40))));
      for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 150; y += innerHeight * 0.8, i++) { scrollTo(0, y); await frames(); }
      scrollTo(0, 0); await frames();
      // Reveal transitions start on the observers' next callbacks, so checking at once can see "nothing running"
      // while text is about to fade in. Wait a moment, then until two checks in a row find no finite animation.
      await new Promise((r) => setTimeout(r, 300));
      const t0 = performance.now();
      const finishing = () => document.getAnimations().some((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime));
      for (let idle = 0; performance.now() - t0 < 8000 && idle < 2;) { idle = finishing() ? 0 : idle + 1; await new Promise((r) => setTimeout(r, 150)); }
    }).catch(() => {});
    const res = await page.evaluate(() => window.axe.run(document, { resultTypes: ["violations"] }));
    const sevMap = { critical: "error", serious: "error", moderate: "warn", minor: "info" };
    for (const v of res.violations) {
      add(sevMap[v.impact] || "warn", "axe", `${v.id}: ${v.help} (${v.nodes.length}×) ${v.helpUrl}`, v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | "));
    }
    summary.checks.axe = { engine: "axe-core", violations: res.violations.length };
  } else {
    // Built-in basics so the check is never empty. axe-core covers ~90 rules; install it for the real scan.
    const basic = await evaluateStable(page, `(() => {
      const d = ${describe}; const out = [];
      const name = (el) => (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || el.value || "").trim()
        || (el.getAttribute("aria-labelledby") || "").split(" ").map((id) => document.getElementById(id)?.innerText || "").join("").trim()
        || [...el.querySelectorAll("img[alt]")].map((i) => i.alt).join("").trim();
      for (const el of document.querySelectorAll("button, a[href], [role=button], [role=link]")) if (!name(el)) out.push(["error", "control without an accessible name", d(el)]);
      for (const el of document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")) {
        const labelled = el.labels?.length || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title");
        if (!labelled) out.push(["error", "form field without a label", d(el)]);
      }
      for (const el of document.querySelectorAll("img:not([alt])")) out.push(["error", "image without alt", d(el)]);
      if (!document.querySelector("main, [role=main]")) out.push(["warn", "no <main> landmark", ""]);
      if (!document.documentElement.lang) out.push(["error", "<html> has no lang", ""]);
      const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => +h.tagName[1]);
      if (hs.filter((h) => h === 1).length !== 1) out.push(["warn", hs.filter((h) => h === 1).length + " <h1> elements (expected 1)", ""]);
      for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) { out.push(["info", "heading level skips from h" + hs[i - 1] + " to h" + hs[i], ""]); break; }
      const ids = {}; for (const el of document.querySelectorAll("[id]")) ids[el.id] = (ids[el.id] || 0) + 1;
      const dup = Object.keys(ids).filter((k) => ids[k] > 1); if (dup.length) out.push(["warn", "duplicate ids: " + dup.slice(0, 5).join(", "), ""]);
      return out; })()`);
    for (const [sev, msg, where] of basic) add(sev, "a11y-basic", msg, where);
    add("info", "a11y-basic", "axe-core not installed — ran built-in basics only. For the full scan: npm i -D axe-core");
    summary.checks.axe = { engine: "built-in basics", violations: basic.length };
  }
  await context.close();
  done.add("axe");
}

// ── 2. Keyboard walk ─────────────────────────────────────────────────────────
if (only.has("keyboard")) {
  const { context, page } = await open(browser);
  const total = await evaluateStable(page, `(() => {
    const sel = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex='-1']), [contenteditable=true]";
    const STYLE = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "borderColor", "backgroundColor", "color", "textDecorationLine"];
    let n = 0, idx = 0;
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el); el.dataset.qaIdx = idx++;
      el.dataset.qaRest = STYLE.map((k) => cs[k]).join("|");
      // Count only what Tab can reach: rendered (not display:none, [hidden], a closed <details> or a collapsed
      // menu), not visibility:hidden and not inert — otherwise a collapsed menu's links look like a focus trap.
      const rendered = el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : el.getClientRects().length > 0;
      if (rendered && !el.closest("[inert]")) n++;
      // Custom radios/checkboxes: the real input is transparent and its visible stand-in (the next sibling, or the
      // label) shows the focus ring — remember that stand-in's resting style to compare against on focus.
      if (/^(radio|checkbox)$/.test(el.type)) {
        const proxy = el.nextElementSibling || el.closest("label") || (el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
        if (proxy) { (window.__qaProxies ||= []).push(proxy); el.dataset.qaProxy = window.__qaProxies.length - 1; const ps = getComputedStyle(proxy); el.dataset.qaProxyRest = STYLE.map((k) => ps[k]).join("|"); }
      }
    }
    window.__qaStyle = STYLE; return n; })()`);
  // No mouse click to reset focus: it can land on a link and navigate. After load, Tab starts at the document start.
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  const steps = [];
  const startUrl = page.url();
  for (let i = 0; i < Math.min(maxTabs, Math.max(total + 2, 5)); i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40); // let focus transitions settle
    if (page.url() !== startUrl) { add("warn", "keyboard", `focusing an element navigated away to ${page.url()} — focus must not trigger navigation (WCAG 3.2.1)`); break; }
    steps.push(await page.evaluate(`(() => {
      const d = ${describe}; const el = document.activeElement;
      if (!el || el === document.body) return { body: true };
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      const now = window.__qaStyle.map((k) => cs[k]).join("|");
      const outline = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
      let visible = r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.05;
      let changed = outline || (el.dataset.qaRest && el.dataset.qaRest !== now);
      const proxy = !visible && el.dataset.qaProxy != null ? window.__qaProxies[el.dataset.qaProxy] : null;
      if (proxy) {   // a transparent custom radio/checkbox: judge its visible stand-in instead
        const ps = getComputedStyle(proxy), pr = proxy.getBoundingClientRect();
        visible = pr.width > 0 && pr.height > 0 && ps.visibility !== "hidden" && parseFloat(ps.opacity) > 0.05;
        changed = (ps.outlineStyle !== "none" && parseFloat(ps.outlineWidth) > 0) || el.dataset.qaProxyRest !== window.__qaStyle.map((k) => ps[k]).join("|");
      }
      return { idx: el.dataset.qaIdx ?? null, el: d(el), changed, visible, inView: r.bottom > 0 && r.top < innerHeight, href: el.getAttribute("href") };
    })()`));
  }
  const real = steps.filter((s) => !s.body);
  const seen = new Set();
  let firstRepeatAt = -1;
  real.forEach((s, i) => { const k = s.idx ?? s.el; if (seen.has(k) && firstRepeatAt < 0) firstRepeatAt = i; seen.add(k); });
  const noRing = [...new Map(real.filter((s) => !s.changed && s.visible).map((s) => [s.el, s])).values()];
  const hidden = [...new Map(real.filter((s) => !s.visible).map((s) => [s.el, s])).values()];
  for (const s of noRing.slice(0, 10)) add("error", "keyboard", "no visible focus indicator when tabbed to (WCAG 2.4.7) — add a :focus-visible ring", s.el);
  if (noRing.length > 10) add("error", "keyboard", `…and ${noRing.length - 10} more elements without a focus indicator`);
  for (const s of hidden.slice(0, 5)) add("warn", "keyboard", "focus lands on an invisible element — hide it from tab order (inert / tabindex=-1 / display:none) or make it visible on focus", s.el);
  // A page with one focusable element legitimately cycles back to it; a trap leaves some of them unreachable.
  if (firstRepeatAt >= 0 && seen.size < Math.min(total, Math.max(2, total * 0.6)))
    add("error", "keyboard", `possible focus trap: focus cycles among ${seen.size} element(s) of ${total} focusable (WCAG 2.1.2)`, real.slice(0, 4).map((s) => s.el).join(" → "));
  const first = real[0];
  if (total > 8 && !(first && first.href && first.href.startsWith("#"))) add("info", "keyboard", "no skip link as the first focusable element — add 'Skip to content' for keyboard users", first?.el || "");
  if (!real.length && total > 0) add("error", "keyboard", `Tab never focused anything although ${total} focusable elements exist`);
  summary.checks.keyboard = { focusable: total, tabbed: real.length, unique: seen.size, noIndicator: noRing.length };
  await context.close();
  done.add("keyboard");
}

// ── 3. Reduced motion ────────────────────────────────────────────────────────
if (only.has("motion")) {
  const count = async (reducedMotion) => {
    const { context, page } = await open(browser, { reducedMotion });
    await page.waitForTimeout(1200);
    const r = await evaluateStable(page, `(() => { const d = ${describe};
      const anims = document.getAnimations().filter((a) => a.playState === "running");
      const moving = anims.filter((a) => { try { return a.effect.getKeyframes().some((k) => k.transform || k.translate || k.scale || k.rotate || k.left || k.top || k.offsetDistance); } catch { return false; } });
      const shown = (el) => { if (!el || !el.getBoundingClientRect) return false; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) > 0.05; };
      // WCAG 2.2.2: anything that moves automatically for more than 5s needs pause/stop/hide. Loops shorter than
      // 5s per cycle (spinners, pulses, skeleton shimmer) read as loading indicators and are not counted here.
      const loops = anims.filter((a) => { const t = a.effect?.getComputedTiming?.() || {};
        return t.iterations === Infinity && Number(t.duration) >= 5000 && shown(a.effect?.target); });
      const name = (el) => [el.getAttribute("aria-label"), (el.getAttribute("aria-labelledby") || "").split(/\\s+/).map((id) => document.getElementById(id)?.textContent || "").join(" "),
        el.innerText || el.textContent, el.value, el.title, [...(el.labels || [])].map((l) => l.innerText).join(" ")].filter(Boolean).join(" ");
      // A control in a section the browser hasn't rendered yet (content-visibility: auto) still counts: it exists and
      // shows up when scrolled to. checkVisibility() ignores that deferral; hidden/display:none controls don't count.
      const available = (el) => (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : shown(el));
      const pauseControl = [...document.querySelectorAll("button, [role=button], [role=switch], input[type=button], input[type=checkbox]")]
        .some((el) => available(el) && /pause|stop|play/i.test(name(el)));
      return { running: anims.length, moving: moving.length, infinite: anims.filter((a) => a.effect?.getTiming?.().iterations === Infinity).length,
        loops: loops.length, pauseControl,
        loopExamples: loops.slice(0, 4).map((a) => d(a.effect?.target) + " " + (a.animationName || a.id || "") + " " + Math.round(a.effect.getComputedTiming().duration / 1000) + "s"),
        examples: moving.slice(0, 4).map((a) => d(a.effect?.target) + " " + (a.animationName || a.id || "")) }; })()`);
    if (reducedMotion === "no-preference" && r.loops > 0 && r.pauseControl) r.roundTrip = await pauseRoundTrip(page).catch(() => null);
    await context.close();
    return r;
  };
  // Click the pause control, then click it again with focus still on it, as a visitor does: the 5s+ loops must stop,
  // then run again. (A :focus-within or :hover pause rule around the control keeps them frozen after "Play".)
  async function pauseRoundTrip(page) {
    const LOOPS = `document.getAnimations().filter((a) => { const t = a.effect?.getComputedTiming?.() || {};
      return a.playState === "running" && t.iterations === Infinity && Number(t.duration) >= 5000; }).length`;
    const label = await evaluateStable(page, `(() => {
      const name = (el) => [el.getAttribute("aria-label"), el.innerText || el.textContent, el.value, el.title].filter(Boolean).join(" ").trim();
      const el = [...document.querySelectorAll("button, [role=button], [role=switch], input[type=button], input[type=checkbox]")]
        .find((el) => (el.checkVisibility ? el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) : true) && /pause|stop|play/i.test(name(el)));
      if (!el) return null; el.setAttribute("data-qa-pause", ""); return name(el).slice(0, 40); })()`);
    if (!label || (/play/i.test(label) && !/pause|stop/i.test(label))) return null;   // starts as "Play": motion is off until clicked
    const ctl = page.locator("[data-qa-pause]").first();
    const before = await evaluateStable(page, LOOPS);
    await ctl.click({ timeout: 5000 }); await page.waitForTimeout(500);
    const paused = await evaluateStable(page, LOOPS);
    await ctl.click({ timeout: 5000 }); await page.waitForTimeout(500);
    const resumed = await evaluateStable(page, LOOPS);
    return { label, before, paused, resumed };
  }
  const normal = await count("no-preference");
  const reduced = await count("reduce");
  if (normal.loops > 0 && !normal.pauseControl) add("warn", "motion", `auto-moving content without a pause control (WCAG 2.2.2): ${normal.loops} infinite animation(s) of 5s+ per cycle and no visible button named Pause/Stop/Play — pause on hover/focus and add a toggle button`, normal.loopExamples.join(" | "));
  const rt = normal.roundTrip;
  if (rt && rt.paused >= rt.before) add("warn", "motion", `the pause control "${rt.label}" doesn't stop the motion: ${rt.before} loop(s) of 5s+ still run after clicking it — pause CSS loops (animation-play-state) and JS/canvas loops alike`);
  else if (rt && rt.resumed <= rt.paused) add("warn", "motion", `the pause control "${rt.label}" stops the motion but doesn't start it again: ${rt.before} → ${rt.paused} → ${rt.resumed} running loop(s) after a second click with focus still on it — look for a :focus-within or :hover pause rule around the control, and make "Play" resume every loop`);
  if (reduced.moving > 0) add("warn", "motion", `${reduced.moving} transform/position animation(s) still run with prefers-reduced-motion: reduce — swap movement for a fade or nothing`, reduced.examples.join(" | "));
  if (reduced.infinite > 0) add("warn", "motion", `${reduced.infinite} infinite animation(s) keep looping under reduced motion — stop them or add a pause control`);
  if (normal.running === 0 && reduced.running === 0) add("info", "motion", "no CSS/WAAPI animations detected (GSAP and canvas/WebGL loops are invisible to this check — test them manually)");
  summary.checks.motion = { normal, reduced };
  done.add("motion");
}

// ── 4. No-JS render ──────────────────────────────────────────────────────────
if (only.has("nojs")) {
  const textLen = async (javaScriptEnabled) => {
    const { context, page } = await open(browser, { javaScriptEnabled });
    const r = await evaluateStable(page, `(() => { const d = ${describe}; const hidden = [];
      for (const el of document.querySelectorAll("h1, h2, h3, p, li, a, button, img, figure, section > *")) {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (r.width && r.height && (parseFloat(cs.opacity) < 0.05 || cs.visibility === "hidden") && (el.innerText || el.tagName === "IMG")) hidden.push(d(el));
      }
      return { text: (document.body?.innerText || "").trim().length, hidden: hidden.slice(0, 8), hiddenCount: hidden.length }; })()`);
    // Reveals that never fire: scroll the whole page like a visitor, let transitions finish, then list content in
    // main/footer that is laid out but still invisible. Typical cause: an IntersectionObserver with a negative
    // rootMargin or a high threshold, which can never trigger for the last rows of the page. Menus, tooltips,
    // popovers, dialogs and anything hidden, inert or aria-hidden are left alone (they are hidden on purpose).
    if (javaScriptEnabled) {
      await evaluateStable(page, `(async () => { const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const keep = document.createElement("style");   // off-screen content-visibility:auto sections would freeze mid-fade
        keep.textContent = "*, *::before, *::after { content-visibility: visible !important; }";
        document.head.append(keep);
        const step = Math.max(200, innerHeight * 0.6);
        for (let i = 0, y = 0; i < 80 && y <= document.documentElement.scrollHeight; i++, y += step) { scrollTo({ top: y, behavior: "instant" }); await wait(90); }
        scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); await wait(1600); })()`);
      r.afterScroll = await evaluateStable(page, `(async () => { const d = ${describe}; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const onPurpose = (el) => { for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
          if (n.hidden || n.inert || n.getAttribute("aria-hidden") === "true" || /^(NAV|HEADER|DIALOG)$/.test(n.tagName) || n.hasAttribute("popover")
            || /^(menu|menubar|tooltip|dialog|alertdialog|listbox)$/.test(n.getAttribute("role") || "")) return true; } return false; };
        const invisible = (el) => { const cs = getComputedStyle(el); return parseFloat(cs.opacity) < 0.05 || cs.visibility === "hidden"; };
        const candidates = [];
        for (const el of document.querySelectorAll("main h1, main h2, main h3, main p, main li, main a, main button, main img, main figure, main section > *, footer p, footer li, footer a, footer h2, footer h3")) {
          const r = el.getBoundingClientRect();
          if (r.width && r.height && invisible(el) && (el.innerText || el.tagName === "IMG") && !onPurpose(el)) candidates.push(el);
        }
        // A quick scroll on a busy machine can skip a small element between two rendering updates, so each candidate
        // is brought to the middle of the screen (as far as the page allows) and given time to reveal: only what
        // stays invisible there is a reveal that never fires. Past the first 12, candidates count unconfirmed.
        const hidden = [];
        for (const el of candidates.slice(0, 12)) {
          el.scrollIntoView({ block: "center", behavior: "instant" });
          let shown = false;
          for (let t = 0; t < 1600 && !shown; t += 100) { await wait(100); shown = !invisible(el) || el.getAnimations().some((a) => a.playState === "running"); }
          if (!shown) hidden.push(d(el));
        }
        hidden.push(...candidates.slice(12).map(d));
        return { hidden: hidden.slice(0, 8), hiddenCount: hidden.length }; })()`);
    }
    // Readability (rendered with JS): characters per line ≈ text length ÷ (text height ÷ line-height), over
    // visible <p>/<li> in <main> that wrap to 2+ lines. The height is the rendered text's own (a Range), so
    // stretched flex/grid boxes don't count as lines. Lists that hold blocks are measured via their children.
    if (javaScriptEnabled) r.measure = await evaluateStable(page, `(() => { const d = ${describe}; const rows = [];
      const root = document.querySelector("main, [role=main]") || document.body; const range = document.createRange();
      for (const el of root.querySelectorAll("p, li")) {
        if (el.closest("nav, pre, table") || (el.tagName === "LI" && el.querySelector("p, ul, ol, div, table"))) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || !el.getClientRects().length) continue;
        const fs = parseFloat(cs.fontSize) || 16;
        const lh = cs.lineHeight === "normal" ? fs * 1.2 : parseFloat(cs.lineHeight) || fs * 1.2;
        range.selectNodeContents(el);
        const lines = Math.round(range.getBoundingClientRect().height / lh);
        const len = (el.innerText || "").replace(/\\s+/g, " ").trim().length;
        if (lines >= 2 && len) rows.push({ cpl: len / lines, where: d(el) });
      }
      const sorted = rows.map((r) => r.cpl).sort((a, b) => a - b);
      const median = sorted.length ? (sorted[(sorted.length - 1) >> 1] + sorted[sorted.length >> 1]) / 2 : 0;
      return { measured: rows.length, median: Math.round(median),
        worst: rows.sort((a, b) => b.cpl - a.cpl).slice(0, 3).map((r) => r.where + " ≈ " + Math.round(r.cpl) + " chars/line") }; })()`);
    await context.close();
    return r;
  };
  const withJs = await textLen(true);
  const noJs = await textLen(false);
  if (noJs.text < withJs.text * 0.2 && withJs.text > 200) add("info", "nojs", `without JavaScript the page shows ${noJs.text} characters of text vs ${withJs.text} with it — client-only rendering; fine for apps, costly for marketing pages (SEO, slow devices)`);
  if (noJs.hiddenCount > 0) add("warn", "nojs", `${noJs.hiddenCount} element(s) render but stay invisible without JS (opacity:0 / visibility:hidden waiting for an animation) — default content to visible and set hidden states from JS`, noJs.hidden.join(" | "));
  const late = withJs.afterScroll || { hiddenCount: 0, hidden: [] };
  if (late.hiddenCount > 0) add("warn", "reveal", `${late.hiddenCount} element(s) still invisible after scrolling the whole page (JavaScript on) — a scroll reveal that never fires; use IntersectionObserver threshold 0 with no negative bottom rootMargin, so the last rows of the page can reveal too`, late.hidden.join(" | "));
  const read = withJs.measure;
  if (read?.median > 90) add("warn", "readability", `lines average ${read.median} characters — set max-width ≈ 62–65ch on body text (≈ 60–75 characters; a ch is the width of "0", so 70ch runs ~80+)`, read.worst.join(" | "));
  summary.checks.nojs = { textWithJs: withJs.text, textNoJs: noJs.text, invisibleNoJs: noJs.hiddenCount, invisibleAfterScroll: late.hiddenCount };
  summary.checks.readability = { measured: read?.measured || 0, medianCharsPerLine: read?.median || 0 };
  done.add("nojs");
}

await browser.close();
const counts = finish();
process.exit(strict && counts.error ? 1 : 0);

/** Write .design-review/qa.json and print the report. `notVerified` (checks cut short by --max-time) makes the
 *  verdict INCOMPLETE whatever was found so far: an unfinished run is unverified, never PASS. */
function finish(notVerified = []) {
  const order = { error: 0, warn: 1, info: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);
  const counts = findings.reduce((a, f) => ((a[f.sev] = (a[f.sev] || 0) + 1), a), {});
  const incomplete = notVerified.length > 0;
  const verdict = incomplete ? "INCOMPLETE" : counts.error ? "FAIL" : counts.warn ? "CONCERNS" : "PASS";
  const report = { ...summary, verdict, ...(incomplete ? { incomplete: true, notVerified } : {}), counts, findings, generatedAt: new Date().toISOString() };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, reportFile), JSON.stringify(report, null, 2));
  const incompleteLine = `INCOMPLETE — not verified: ${notVerified.join(", ")}`;

  if (json) { console.log(JSON.stringify(report, null, 2)); if (incomplete) console.error(incompleteLine); }
  else {
    const icon = { error: "✖", warn: "▲", info: "·" };
    console.log(`${url}  (${viewport.width}×${viewport.height}${mobile ? " mobile" : ""}${dark ? ", theme: dark" : ""})`);
    let current = "";
    for (const f of findings) {
      if (f.sev !== current) { current = f.sev; console.log(`\n${current.toUpperCase()}`); }
      console.log(`  ${icon[f.sev]} [${f.check}] ${f.msg}${f.where ? `\n      ↳ ${f.where}` : ""}`);
    }
    if (incomplete) console.log(`\n${incompleteLine} (findings so far: ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info)`);
    else console.log(`\nVerdict: ${verdict} — ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info`);
    console.log(`Report: ${join(outDir, reportFile)}\nAutomated checks catch roughly a third of accessibility issues — still test with a screen reader and real devices.`);
  }
  return counts;
}
