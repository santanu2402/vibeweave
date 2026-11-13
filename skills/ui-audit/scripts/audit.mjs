#!/usr/bin/env node
// Static UI audit: accessibility bugs, motion/perf issues and "AI-slop" tells, reported as file:line.
// Zero dependencies. Regex-based, so treat findings as leads to verify, not verdicts.
// Also catches shipped placeholders ({{NAME}}, filler text), loops without a pause control, reduced-motion
// overrides that keep animation delays, and 12-column grids whose gaps overflow phones.
//
// Usage: node audit.mjs [dir=.] [--json] [--strict] [--max 400]
//   --strict  exit 1 when any "error" finding exists (useful in CI)
//   Placeholders filled by a build step? Audit the built output too: node audit.mjs dist
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative, sep } from "node:path";

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const strict = argv.includes("--strict");
const maxIdx = argv.indexOf("--max");
const MAX = maxIdx === -1 ? 400 : parseInt(argv[maxIdx + 1], 10) || 400;
const root = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--max") || ".";

const MARKUP = [".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".astro", ".mdx"];
const STYLE = [".css", ".scss", ".sass", ".less", ".pcss"];
const SCRIPT = [".js", ".ts", ".mjs", ".cjs"];
const ALL = [...MARKUP, ...STYLE, ...SCRIPT];
// Dot-folders (.git, .next, .nuxt, .svelte-kit, .agents, .claude …) are skipped automatically.
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "storybook-static", "target"]);
const SKIP_FILES = /\.min\.(js|css)$|\.d\.ts$|^package(-lock)?\.json$|^tsconfig.*\.json$|^(README|CHANGELOG|LICENSE|CONTRIBUTING|CODE_OF_CONDUCT|SKILL)\b.*\.md$/i;

// Each rule: id, severity (error|warn|info), category, applies-to extensions, regex, message.
// `unless` (optional): if this regex matches anywhere in the same file, the rule is skipped.
const RULES = [
  // ── Accessibility ──────────────────────────────────────────────────────────
  { id: "img-alt", sev: "error", cat: "a11y", ext: MARKUP, re: /<(img|Image)\b(?![^>]*\balt\s*=)[^>]*>/g,
    msg: "Image without alt. Use descriptive alt, or alt=\"\" for decorative images." },
  { id: "click-non-interactive", sev: "error", cat: "a11y", ext: MARKUP, re: /<(div|span|li|td)\b(?![^>]*\brole\s*=)[^>]*\s(onClick|@click|on:click|v-on:click|\(click\))\s*=/g,
    msg: "Click handler on a non-interactive element. Use <button> (action) or <a href> (navigation)." },
  { id: "positive-tabindex", sev: "error", cat: "a11y", ext: MARKUP, re: /tab[iI]ndex\s*=\s*\{?["']?[1-9]/g,
    msg: "Positive tabindex breaks natural focus order. Use 0 or -1." },
  { id: "zoom-disabled", sev: "error", cat: "a11y", ext: MARKUP, re: /user-scalable\s*=\s*["']?no|maximum-scale\s*=\s*["']?1(\.0)?\b/g,
    msg: "Viewport blocks zoom (WCAG 1.4.4). Remove user-scalable=no / maximum-scale=1." },
  { id: "html-lang", sev: "error", cat: "a11y", ext: [".html", ".htm"], re: /<html\b(?![^>]*\blang\s*=)[^>]*>/g,
    msg: "<html> without lang attribute." },
  { id: "outline-removed", sev: "warn", cat: "a11y", ext: [...STYLE, ...MARKUP], re: /outline\s*:\s*(none|0)\b|\boutline-none\b/g,
    unless: /focus-visible|focus:ring|focus-within:ring|focus:shadow|focus:border/,
    msg: "Focus outline removed with no visible focus style in this file. Add a :focus-visible ring." },
  { id: "anchor-no-href", sev: "warn", cat: "a11y", ext: MARKUP, re: /<a\b(?![^>]*(\b(href|routerLink|to)\s*=|\{\.\.\.))[^>]*>/g,
    msg: "<a> without href is not keyboard-focusable. Use <button> for actions." },
  { id: "autoplay-unmuted", sev: "warn", cat: "a11y", ext: MARKUP, re: /<video\b(?=[^>]*\bautoplay)(?![^>]*\bmuted)[^>]*>/gi,
    msg: "Autoplaying video without muted. Browsers block it and it harms a11y." },
  { id: "icon-button-label", sev: "warn", cat: "a11y", ext: MARKUP, re: /<button\b(?![^>]*\b(aria-label|title)\s*=)[^>]*>\s*<(svg|[A-Z]\w*)\b[^]*?<\/button>/g,
    test: (m) => !/>[^<\s][^<]*</.test(m.replace(/<svg[^]*?<\/svg>/g, "")),
    msg: "Icon-only button without aria-label (or visually hidden text)." },
  { id: "placeholder-as-label", sev: "info", cat: "a11y", ext: MARKUP, re: /<input\b(?=[^>]*\bplaceholder\s*=)(?![^>]*\b(aria-label|aria-labelledby|id)\s*=)[^>]*>/g,
    msg: "Input with placeholder but no id/aria-label — placeholder is not a label." },

  // ── Motion & performance ───────────────────────────────────────────────────
  { id: "transition-all", sev: "warn", cat: "motion", ext: [...STYLE, ...MARKUP], re: /transition\s*:\s*all\b|\btransition-all\b/g,
    msg: "transition: all animates unintended properties. List the properties (transform, opacity, colors)." },
  { id: "layout-animation", sev: "info", cat: "motion", ext: [...STYLE, ...MARKUP], re: /transition(-property)?\s*:\s*[^;"]*\b(width|height|top|left|right|bottom|margin|padding)\b/g,
    msg: "Animating layout properties causes reflow. Prefer transform/opacity (or grid-template-rows for accordions)." },
  { id: "huge-z-index", sev: "info", cat: "code", ext: [...STYLE, ...MARKUP], re: /z-index\s*:\s*\d{4,}|\bz-\[\d{4,}\]/g,
    msg: "z-index arms race. Define a small z-index scale as tokens." },
  { id: "100vh", sev: "info", cat: "responsive", ext: [...STYLE, ...MARKUP], re: /\b100vh\b|\bh-screen\b/g,
    msg: "100vh / h-screen overflows behind mobile browser UI. Prefer 100dvh / min-h-dvh (or svh)." },
  // audit-ignore (the rule patterns below would otherwise flag this file itself)
  { id: "placeholder-image", sev: "warn", cat: "content", ext: [...MARKUP, ...SCRIPT], re: /(via\.placeholder\.com|placehold\.(co|it)|dummyimage\.com|placekitten|fakeimg\.pl)/g,
    msg: "Placeholder image service. Ship real imagery or purposeful illustration." },
  // Unfilled template tokens ({{AXE}}, {{ PROJECT_NAME }}) — UPPER_CASE only, so Vue/Angular `{{ value }}` and JSX
  // `style={{ x }}` never match. Template-engine files (.hbs/.njk/.liquid/.mustache are not scanned; files using
  // {% %}, {{#if}}, {{> partial}} are skipped), code spans, template literals and tests/stories are ignored.
  { id: "unreplaced-placeholder", sev: "error", cat: "content", ext: [...MARKUP, ".md"], re: /\{\{\s*([A-Z][A-Z0-9_]*(?:[.-][A-Z0-9_]+)*)\s*\}\}/g,
    unless: /\{%|\{\{[#/>!^{]|\{\{-|-\}\}/,
    test: (m, c) => !NOT_SHIPPED.test(c.path) && !inCode(c) && !declaredBinding(m, c),
    msg: "Unreplaced template placeholder ships to users (trust failure). Fill it, or fail the build when one remains — if a build step fills it, audit the built output (node audit.mjs dist)." },
  // audit-ignore
  { id: "lorem-ipsum", sev: "error", cat: "content", ext: [...MARKUP, ...SCRIPT, ".md", ".json"], re: /\blorem ipsum\b/gi,
    // In prose docs (.md) a bare mention is usually about filler ("no lorem…"); real filler goes on: "… dolor sit".
    test: (m, c) => !NOT_SHIPPED.test(c.path) && !/\b(no|not|never|avoid|without|ban)\b[^.\n]{0,24}$/i.test(c.before) && !inCode(c)
      && (c.ext !== ".md" || /^\s*dolor\b/i.test(c.text.slice(c.index + m.length, c.index + m.length + 10))),
    msg: "Filler text ships to users (trust failure). Write the real copy, or mark sample content clearly." },

  // ── AI-slop tells (deliberate use is fine — these are defaults to question) ─
  { id: "default-font", sev: "info", cat: "slop", ext: [...STYLE, ...MARKUP, ...SCRIPT], re: /font-family\s*:\s*["']?(Inter|Roboto|Arial|Open Sans|Poppins)\b|next\/font\/google["'][^;\n]*\b(Inter|Roboto|Poppins)\b|\b(Inter|Roboto|Poppins)\s*\(\s*\{|family=(Inter|Roboto|Poppins)\b/g,
    msg: "Default-font choice (Inter/Roboto/Poppins/Arial). Fine for dense app UI; on brand pages choose on purpose." },
  { id: "purple-gradient", sev: "info", cat: "slop", ext: [...STYLE, ...MARKUP], re: /from-(purple|violet|indigo|fuchsia)-\d{3}[^"'`]*\bto-(blue|pink|purple|indigo|cyan|violet)-\d{3}|linear-gradient\([^)]*(#6366f1|#8b5cf6|#7c3aed|#a855f7|#9333ea|purple|violet)[^)]*\)/gi,
    msg: "The purple/indigo gradient is the #1 generated-UI tell. Derive the accent from the brief." },
  { id: "gradient-text", sev: "info", cat: "slop", ext: [...STYLE, ...MARKUP], re: /bg-clip-text[^"'`]*text-transparent|text-transparent[^"'`]*bg-clip-text|background-clip\s*:\s*text/g,
    msg: "Gradient text. Use it once, deliberately, or not at all." },
  { id: "indigo-default", sev: "info", cat: "slop", ext: [...MARKUP], re: /\b(bg|text|border|ring)-indigo-(500|600)\b/g,
    msg: "Tailwind indigo-500/600 as the accent is a framework default, not a brand decision." },
  { id: "emoji-icon", sev: "info", cat: "slop", ext: MARKUP, re: /(✨|🚀|💡|🔥|⚡|🎯|💎|🌟|✅|🧠|📈|🔒|💪|🤖|🎉)/gu,
    msg: "Emoji used as UI icon. Use one consistent icon set (Lucide, Phosphor, Tabler…)." },
  // audit-ignore
  { id: "slop-copy", sev: "warn", cat: "slop", ext: [...MARKUP, ...SCRIPT, ".md", ".json"], re: /\b(unlock(ing)? the (full )?(power|potential)|revolutioni[sz]e|supercharge|elevate your|seamless(ly)?|next-level|game[- ]chang\w*|cutting[- ]edge|harness the power|in today'?s fast[- ]paced|take .{1,20} to the next level|empower(s|ing)? (you|your|teams))\b/gi,
    msg: "Generic marketing copy. Say the specific thing this product does for this audience." },
  { id: "fake-person", sev: "warn", cat: "content", ext: [...MARKUP, ...SCRIPT, ".json"], re: /\b(John|Jane) (Doe|Smith)\b/g,
    msg: "Placeholder person. Use realistic, clearly sample content or real testimonials." },
];

// Files that never ship (tests, stories, fixtures, mocks, scaffold templates) are exempt from the content rules.
const NOT_SHIPPED = /(^|\/)(__tests__|__mocks__|__fixtures__|fixtures?|mocks?|tests?|e2e|stories|templates?)\/|\.(test|spec|stories|story|template|tpl|tmpl|example|sample)\.[\w.]+$/i;
/** True when the match sits in code, not content: a markdown code span/fence, <code>/<pre>, an HTML <template> or
 *  template <script>, or (in component files) a JS template literal. */
function inCode({ text, index, ext, before }) {
  const prefix = text.slice(0, index);
  const open = (tag) => prefix.lastIndexOf(`<${tag}`) > prefix.lastIndexOf(`</${tag}>`);
  if (open("code") || open("pre")) return true;
  if (ext === ".md" || ext === ".mdx") {
    if ((before.match(/`/g) || []).length % 2 === 1) return true;              // inline `code span`
    if (((prefix.match(/^ {0,3}(```|~~~)/gm) || []).length) % 2 === 1) return true; // inside a fenced block
    return false;
  }
  if ((ext === ".html" || ext === ".htm") && (open("template") || /<script\b[^>]*type\s*=\s*["']?text\/(x-)?(template|html|handlebars|mustache)/i.test(prefix.slice(prefix.lastIndexOf("<script"))) && open("script"))) return true;
  return (prefix.replace(/\\`/g, "").match(/`/g) || []).length % 2 === 1;     // inside a JS template literal
}
/** In component files, {{ NAME }} is a real binding when NAME is declared elsewhere in the file (const NAME = …). */
function declaredBinding(m, { text, ext }) {
  if (![".jsx", ".tsx", ".vue", ".svelte", ".astro"].includes(ext)) return false;
  const name = m.replace(/[{}\s]/g, "").split(/[.-]/)[0];
  return new RegExp(`\\b(const|let|var|import|export|function|class)\\b[^\\n;]*\\b${name}\\b|\\b${name}\\s*[:=]`).test(text);
}

// ── CSS structure helpers (stylesheets and <style> blocks in markup) ─────────
/** Body of the {…} block whose opening brace is at `open` (brace-matched). */
function blockAt(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1);
}
/** Declarations of the innermost rule around `index` (from the previous "{" to the next "}"). */
function ruleAround(text, index) {
  const start = text.lastIndexOf("{", index), end = text.indexOf("}", index);
  return text.slice(start + 1, end === -1 ? undefined : end);
}
/** Replace var(--x[, fallback]) with the first value --x gets in the same file (or the fallback). */
function resolveVars(value, text, depth = 0) {
  if (depth > 3) return value;
  return value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (all, name, fallback) => {
    const def = text.match(new RegExp(`${name}\\s*:\\s*([^;}"'\`\\n]+)`));
    return def ? resolveVars(def[1].trim(), text, depth + 1) : fallback?.trim() || all;
  });
}
/** CSS length → px (rem/em = 16px). clamp() → its minimum (what phones get). NaN when unknown (%, vw, var). */
function toPx(value) {
  const v = value.trim();
  const args = (s) => s.slice(s.indexOf("(") + 1, s.lastIndexOf(")")).split(",").map(toPx);
  if (/^clamp\(/i.test(v)) return args(v)[0];
  if (/^min\(/i.test(v)) return Math.min(...args(v));
  if (/^max\(/i.test(v)) return Math.max(...args(v));
  const m = v.match(/^(-?\d*\.?\d+)(px|rem|em)?$/i);
  if (!m) return NaN;
  return parseFloat(m[1]) * (/r?em/i.test(m[2] || "") ? 16 : m[2] ? 1 : NaN);
}
/** Duration in ms of the first time value in a string ("marquee 40s linear infinite" → 40000), NaN if none. */
function durationMs(value) {
  const m = value.match(/(?:^|[\s,_(\[])(\d*\.?\d+)(ms|s)(?=$|[\s,_);\]"'`])/i);   // "_" separates Tailwind values
  return m ? parseFloat(m[1]) * (m[2].toLowerCase() === "s" ? 1000 : 1) : NaN;
}
const PAUSE_RE = /animation-play-state\s*:\s*paused|animationPlayState\s*[:=]\s*["'`]paused/;

const findings = [];
let filesScanned = 0;
const projectSignals = { animates: false, reducedMotion: false, hexInComponents: new Map(), loops: [], pauses: false };

/** Recurse into dir and scan every supported file (symlinks are not followed; files > 600 KB are skipped). */
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && !e.name.startsWith(".")) walk(p);
      continue;
    }
    const ext = extname(e.name).toLowerCase();
    if (![...ALL, ".md", ".json"].includes(ext) || SKIP_FILES.test(e.name)) continue;
    try { if (statSync(p).size > 600_000) continue; } catch { continue; }
    scanFile(p, ext);
  }
}

/** 1-based line number of a character index (binary search over line start offsets). */
function lineOf(lineStarts, index) {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1;
}

/** Run every rule that applies to this extension, record project-wide signals, and collect findings. */
function scanFile(path, ext) {
  const text = readFileSync(path, "utf8");
  const lines = text.split("\n");
  const lineStarts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);
  filesScanned++;
  const rel = (relative(root, path) || path).split(sep).join("/");

  if (/@keyframes|animation\s*:|\banimate-|framer-motion|from ["']motion|gsap|@react-spring|anime\(|lottie/.test(text)) projectSignals.animates = true;
  if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|motion-safe:|reducedMotion/.test(text)) projectSignals.reducedMotion = true;

  if ([".jsx", ".tsx", ".vue", ".svelte", ".astro"].includes(ext)) {
    const hexes = text.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g) || [];
    const arbitrary = text.match(/\b(bg|text|border|from|to|via|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g) || [];
    const n = new Set([...hexes, ...arbitrary]).size;
    if (n >= 8) projectSignals.hexInComponents.set(rel, n);
  }

  const ignored = (line) => /audit-ignore/.test(lines[line - 1] || "") || /audit-ignore/.test(lines[line - 2] || "");
  const clean = (s) => s.replace(/\s+/g, " ").replace(/[\u0000-\u001f\u007f-\u009f]/g, "").slice(0, 90);
  /** Record a finding at a character index unless that line (or the one above) says audit-ignore. */
  const report = (index, rule, snippet) => {
    const line = lineOf(lineStarts, index);
    if (ignored(line)) return null;
    const f = { file: rel, line, sev: rule.sev, cat: rule.cat, rule: rule.id, msg: rule.msg, snippet: clean(snippet) };
    findings.push(f);
    return f;
  };

  // Commented-out markup isn't live: rules match a copy with <!-- … --> blanked to spaces (same length, newlines
  // kept, so indexes and line numbers stay exact). audit-ignore markers are still read from the original lines.
  const live = [".html", ".htm", ".vue", ".svelte", ".astro"].includes(ext) ? text.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, " ")) : text;
  for (const rule of RULES) {
    if (!rule.ext.includes(ext)) continue;
    if (rule.unless && rule.unless.test(live)) continue;
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(live))) {
      if (rule.test) {
        const line = lineOf(lineStarts, m.index);
        const before = live.slice(lineStarts[line - 1], m.index);
        if (!rule.test(m[0], { text: live, index: m.index, ext, path: rel, before })) continue;
      }
      report(m.index, rule, m[0]);
    }
  }

  if (ALL.includes(ext) && PAUSE_RE.test(text)) projectSignals.pauses = true;     // CSS, Tailwind [..:paused] or JS
  if ([...STYLE, ...MARKUP].includes(ext)) scanCssStructure(text, report);
}

/** Checks that need more than one regex: looping animations, reduced-motion blocks, 12-column grids. */
function scanCssStructure(text, report) {
  // 1. Infinite loops of 5s+ (marquees, drifting backgrounds). Shorter loops — spinners, pulses, skeleton
  //    shimmer — read as loading indicators and are left to judgment. Reported after the walk, and only
  //    when no file in the project ever sets animation-play-state to paused.
  const loop = /\banimation(?:-iteration-count)?\s*:\s*[^;{}"'`\n]*\binfinite\b|\banimation(?:IterationCount)?\s*:\s*["'`][^"'`\n]*\binfinite\b|\banimate-\[[^\]\s]*[_[]infinite(?=[_\]])[^\]\s]*\]/g;
  const interactive = (s) => /:(hover|focus|focus-within|focus-visible|active)\b/.test(s);
  for (const m of text.matchAll(loop)) {
    // Loops that run only while the user hovers/focuses something are user-started, not auto-moving.
    const open = text.lastIndexOf("{", m.index);
    const selector = open < 0 ? "" : text.slice(Math.max(text.lastIndexOf("}", open - 1), text.lastIndexOf("{", open - 1)) + 1, open);
    if (selector.trim() && selector.split(",").every(interactive)) continue;
    if (/\b(group-)?(hover|focus|focus-within|active):[\w:-]*$/.test(text.slice(Math.max(0, m.index - 30), m.index))) continue;
    const timing = /iteration-count|IterationCount/.test(m[0])
      ? ruleAround(text, m.index).match(/animation(?:-duration|Duration)?\s*:\s*["'`]?([^;}"'`\n]+)/)?.[1] || ""
      : m[0];
    if (durationMs(resolveVars(timing, text)) < 5000) continue;
    projectSignals.loops.push(() => report(m.index, LOOP, m[0]));
  }

  // 2. Reduced-motion overrides that shorten durations but keep delays: delayed entrances stay invisible.
  for (const m of text.matchAll(/@media[^{;]*prefers-reduced-motion\s*(?::\s*reduce\s*)?\)[^{;]*\{/g)) {
    if (/\bnot\s*\(\s*prefers-reduced-motion/.test(m[0])) continue;
    const body = blockAt(text, m.index + m[0].length - 1);
    if (/animation-delay\s*:/.test(body)) continue;
    const rules = [...body.matchAll(/\{([^{}]*)\}/g)].map((r) => r[1]);
    if (rules.some((decls) => /animation-duration\s*:/.test(decls) && !/(^|[\s;])animation\s*:/.test(decls)))
      report(m.index, RM_DELAY, m[0]);
  }

  // 3. 12-column grids with a wide gap and no breakpoint that changes the columns: 11 gaps overflow a phone.
  const responsiveCols = [...text.matchAll(/@(media|container)\b[^{;]*\{/g)]
    .some((m) => /grid-template(-columns)?\s*:|\bgrid\s*:/.test(blockAt(text, m.index + m[0].length - 1)));
  if (!responsiveCols) {
    for (const m of text.matchAll(/(?:grid-template-columns|gridTemplateColumns)\s*:\s*["'`]?\s*repeat\(\s*12\s*,/g)) {
      const decls = ruleAround(text, m.index);
      let gap = NaN;
      for (const g of decls.matchAll(/(?:^|[\s;{,])(gap|grid-gap|column-gap|grid-column-gap|columnGap|gridGap|gridColumnGap)\s*:\s*["'`]?([^;}"'`\n]+)/g)) {
        const parts = resolveVars(g[2].replace(/!important/, "").trim(), text).split(/\s+(?![^(]*\))/);
        gap = toPx(/^(gap|grid-gap|gridGap)$/.test(g[1]) ? parts[parts.length - 1] : parts[0]);
      }
      if (gap >= 24) report(m.index, GRID12, `${m[0]}… gap ${Math.round(gap)}px`);
    }
  }
  // Tailwind: unprefixed grid-cols-12 with gap-6+ (24px+) and no sm:/md:/lg: column change in the same class list.
  for (const m of text.matchAll(/\bclass(?:Name)?\s*=\s*\{?\s*["'`]([^"'`]*\bgrid-cols-12\b[^"'`]*)["'`]/g)) {
    const cls = m[1].split(/\s+/);
    if (!cls.includes("grid-cols-12") || cls.some((c) => /^[\w@-]+:grid-cols-/.test(c))) continue;
    const gapCls = cls.find((c) => /^gap(-x)?-(\d+(\.5)?|\[[^\]]+\])$/.test(c));
    if (!gapCls) continue;
    const v = gapCls.replace(/^gap(-x)?-/, "");
    const px = v.startsWith("[") ? toPx(v.slice(1, -1)) : parseFloat(v) * 4;
    if (px >= 24) report(m.index, GRID12, `grid-cols-12 ${gapCls}`);
  }
}
const LOOP = { id: "loop-no-pause", sev: "warn", cat: "a11y",
  msg: "Auto-moving content needs a pause control (WCAG 2.2.2) — pause on hover/focus and offer a button." };
const RM_DELAY = { id: "reduced-motion-delay", sev: "warn", cat: "motion",
  msg: "Reduced motion keeps animation delays; content stays hidden — set animation-delay: 0s too (or animation: none)." };
const GRID12 = { id: "grid-12-gap", sev: "warn", cat: "responsive",
  msg: "12-column grid with a wide gap overflows phones (11 gaps); collapse to 1 column under ~760px (@media) and use minmax(0, 1fr)." };

const rootStat = (() => { try { return statSync(root); } catch { return null; } })();
if (!rootStat) { console.error(`Path not found: ${root}`); process.exit(2); }
if (rootStat.isDirectory()) walk(root); else scanFile(root, extname(root).toLowerCase());

if (!projectSignals.pauses) for (const reportLoop of projectSignals.loops) reportLoop();
if (projectSignals.animates && !projectSignals.reducedMotion) {
  findings.push({ file: "(project)", line: 0, sev: "warn", cat: "motion", rule: "no-reduced-motion",
    msg: "Animations found but no prefers-reduced-motion handling anywhere. Add a reduced-motion path.", snippet: "" });
}
for (const [file, n] of projectSignals.hexInComponents) {
  findings.push({ file, line: 0, sev: "info", cat: "tokens", rule: "token-drift",
    msg: `${n} distinct hard-coded colors in a component. Move them to design tokens.`, snippet: "" });
}

const order = { error: 0, warn: 1, info: 2 };
findings.sort((a, b) => order[a.sev] - order[b.sev] || a.file.localeCompare(b.file) || a.line - b.line);
const counts = findings.reduce((acc, f) => ((acc[f.sev] = (acc[f.sev] || 0) + 1), acc), {});

if (json) {
  console.log(JSON.stringify({ root, filesScanned, counts, findings: findings.slice(0, MAX) }, null, 2));
} else {
  const icon = { error: "✖", warn: "▲", info: "·" };
  let current = "";
  for (const f of findings.slice(0, MAX)) {
    if (f.sev !== current) { current = f.sev; console.log(`\n${current.toUpperCase()}`); }
    const loc = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`  ${icon[f.sev]} ${loc}  [${f.cat}/${f.rule}] ${f.msg}${f.snippet ? `\n      ↳ ${f.snippet}` : ""}`);
  }
  if (findings.length > MAX) console.log(`\n… ${findings.length - MAX} more (raise --max)`);
  console.log(`\nScanned ${filesScanned} files: ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info.`);
  console.log(`Regex heuristics — verify each finding. Silence a line deliberately with an "audit-ignore" comment.`);
}
process.exit(strict && counts.error ? 1 : 0);
