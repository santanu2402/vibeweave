#!/usr/bin/env node
// Originality engine — keeps every build from looking like the last one.
//   ideas  : brief-seeded direction prompts (metaphor × palette strategy × type approach × layout grammar ×
//            signature element × motion personality); they change with the brief, the day and the history size
//   check  : fingerprint a project's real tokens (fonts, accent hue/chroma, background temperature, radius) and
//            compare with the 25 presets AND the user's previous projects → ORIGINAL or TOO CLOSE (and to what)
//   record : save this project's fingerprint to the user's history (~/.vibeweave/history.jsonl)
// Zero dependencies.
//
// Usage: node novelty.mjs ideas "<brief keywords>" [--count 3]
//        node novelty.mjs check <tokens.css|globals.css|DESIGN.md …> [--strict]
//        node novelty.mjs record <tokens.css …> --name "<project>"
//        node novelty.mjs history
import { readFileSync, existsSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseColor, rgbToOklch } from "./color-utils.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PRESETS = JSON.parse(readFileSync(join(here, "../assets/presets/presets.json"), "utf8")).presets;
const HISTORY = process.env.VIBEWEAVE_HISTORY || join(homedir(), ".vibeweave", "history.jsonl");
const argv = process.argv.slice(2);
const opt = (n, f) => { const i = argv.indexOf(`--${n}`); return i === -1 ? f : argv[i + 1]; };
const pos = argv.filter((a, i) => !a.startsWith("--") && !["--count", "--name"].includes(argv[i - 1]));
const [cmd, ...rest] = pos;

/** Read the history file; corrupted or non-object lines are skipped so a bad line never breaks a run. */
function history() {
  let text = "";
  try { text = existsSync(HISTORY) ? readFileSync(HISTORY, "utf8") : ""; } catch { return []; }
  return text.split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((h) => h && typeof h === "object" && !Array.isArray(h));
}

// ── Fingerprints ─────────────────────────────────────────────────────────────
/** First family of a font stack, lowercased, without quotes or a trailing "Variable". */
const norm = (f) => String(f || "").toLowerCase().replace(/["']/g, "").split(",")[0].trim().replace(/\s+variable$/, "");
const toOk = (c) => { try { return rgbToOklch(parseColor(c)); } catch { return null; } };
/** Fingerprint of a bundled preset (light-mode accent and background). */
function fromPreset(p) {
  const a = toOk(p.light.accent), bg = toOk(p.light.bg);
  return { id: p.id, kind: "preset", display: norm(p.fonts.display.family), body: norm(p.fonts.body.family), accentH: a?.h, accentC: a?.c, accentL: a?.l, bgH: bg?.h, bgC: bg?.c, radius: parseFloat(p.radius.md), shadow: p.shadow };
}
/** Fingerprint of a project from its token/CSS/DESIGN.md files (CSS custom properties or DESIGN.md labels). */
function fromFiles(files) {
  const text = files.map((f) => {
    try { return readFileSync(f, "utf8"); } catch (e) { console.error(`✖ cannot read ${f} (${e.code || e.message})`); process.exit(2); }
  }).join("\n");
  const v = (re) => text.match(re)?.[1]?.trim();
  const display = v(/--font-(?:display|heading|serif)\s*:\s*([^;]+);/i) || v(/\*\*Display:\*\*\s*([^(·\n]+)/);
  const body = v(/--font-(?:body|sans)\s*:\s*([^;]+);/i) || v(/\*\*Body:\*\*\s*([^(·\n]+)/) || v(/font-family\s*:\s*([^;]+);/i);
  const accent = v(/--(?:color-accent|color-primary|primary|accent|brand)\s*:\s*((?:oklch|rgb|#)[^;]*);/i);
  const bg = v(/--(?:color-bg|color-background|background|bg)\s*:\s*((?:oklch|rgb|#)[^;]*);/i);
  const radius = v(/--radius(?:-md)?\s*:\s*([\d.]+)(?:px|rem)/i);
  const a = accent && toOk(accent), b = bg && toOk(bg);
  return { kind: "project", display: norm(display), body: norm(body), accentH: a?.h, accentC: a?.c, accentL: a?.l, bgH: b?.h, bgC: b?.c,
    radius: radius ? parseFloat(radius) * (/rem/.test(text.match(/--radius(?:-md)?\s*:\s*[\d.]+(px|rem)/i)?.[1] || "") ? 16 : 1) : undefined };
}
const hueDist = (a, b) => (a == null || b == null ? 180 : Math.min(Math.abs(a - b), 360 - Math.abs(a - b)));
/**
 * Weighted similarity of two fingerprints in 0..1 (≥ 0.6 = too close). Weights: display font 0.28,
 * accent 0.28 (hue within 18° and lightness within 0.12, or both near-neutral), body font 0.14,
 * background temperature 0.15, radius within 2px 0.15.
 * @returns {{ score: number, parts: string[] }} parts = the shared traits
 */
function similarity(x, y) {
  const parts = [];
  const add = (w, hit, label) => { if (hit) parts.push(label); return hit ? w : 0; };
  let s = 0;
  s += add(0.28, x.display && x.display === y.display, `display font (${x.display})`);
  s += add(0.14, x.body && x.body === y.body, `body font (${x.body})`);
  const chromatic = (x.accentC ?? 0) > 0.04 && (y.accentC ?? 0) > 0.04;
  s += add(0.28, chromatic ? hueDist(x.accentH, y.accentH) < 18 && Math.abs((x.accentL ?? 0) - (y.accentL ?? 0)) < 0.12 : (x.accentC ?? 1) <= 0.04 && (y.accentC ?? 1) <= 0.04, "accent color");
  s += add(0.15, (x.bgC ?? 0) < 0.012 && (y.bgC ?? 0) < 0.012 ? true : hueDist(x.bgH, y.bgH) < 25, "background temperature");
  s += add(0.15, x.radius != null && y.radius != null && Math.abs(x.radius - y.radius) <= 2, `radius (${x.radius}px)`);
  return { score: +s.toFixed(2), parts };
}

// ── Idea generator ───────────────────────────────────────────────────────────
const POOLS = {
  metaphor: ["a field notebook", "museum wall labels", "a train timetable", "a botanical specimen sheet", "a vinyl record sleeve", "a ship's logbook",
    "a recipe card", "an architect's blueprint", "a gallery catalogue", "a sports scoreboard", "a seed packet", "a tailor's pattern", "airport signage",
    "a vintage instrument panel", "a zine cut-and-paste", "a hotel key card", "a concert poster wall", "a pharmacy label", "a weather map", "a library card catalogue",
    "a travel passport", "a film credits sequence", "a kitchen ticket rail", "a geological core sample", "a trading card", "a newspaper front page", "a chess clock"],
  palette: ["derive the accent from the subject's real material (clay, copper, moss, denim…)", "monochrome + one saturated accent used under 5% of the area",
    "two complementary accents with a warm neutral", "dark, hue-tinted base with a light editorial reading surface", "high-key pastel neutrals with an ink-dark accent",
    "duotone imagery tied to the accent", "earth tones with one electric counterpoint", "black and paper white with color only in photography"],
  type: ["a characterful serif display + a quiet grotesk body", "one variable grotesk across every role, contrast through weight and width",
    "a mono for labels and data + a humanist sans body", "a condensed display at huge sizes + a wide body", "a rounded geometric display + a neutral sans",
    "an old-style serif for everything, editorial feel", "a slab serif display + a crisp sans body"],
  layout: ["asymmetric 12-column grid with deliberate empty columns", "one long editorial column with full-bleed interruptions", "bento tiles sized by importance",
    "horizontal scroll chapters inside a vertical page", "split screen: sticky visual left, scrolling story right", "index-style lists with large numerals",
    "overlapping layers and cut-outs", "dashboard-like panels even on the marketing page", "centered, poster-like statements alternating with dense detail"],
  signature: ["an interactive product demo as the hero", "an oversized typographic statement", "a scroll-drawn SVG line that tells the story", "a custom illustration system",
    "a tactile 3D object you can turn", "photography with a consistent crop and grade", "a kinetic headline that responds to scroll", "a playful cursor/hover interaction",
    "a data visualization of something real about the product", "a shader or generative background tied to the brand"],
  motion: ["calm", "snappy", "playful", "luxury", "cinematic", "technical"],
};
/** Seeded PRNG (FNV-1a hash → xorshift32): reproducible for the same seed text, different across briefs. */
function rng(seedText) {
  let h = 2166136261; for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1e6) / 1e6; };
}

if (cmd === "ideas") {
  const brief = rest.join(" ") || "untitled";
  const count = Math.min(10, Math.max(1, parseInt(opt("count", "3"), 10) || 3));
  const r = rng(`${brief}|${history().length}|${new Date().toISOString().slice(0, 10)}`);
  // Within one run, every seed gets a different value from each pool until the pool runs out.
  const pick = (pool, taken) => { const avail = pool.filter((x) => !taken.has(x)); const x = (avail.length ? avail : pool)[Math.floor(r() * (avail.length || pool.length))]; taken.add(x); return x; };
  const taken = Object.fromEntries(Object.keys(POOLS).map((k) => [k, new Set()]));
  console.log(`Direction seeds for: ${brief}\n(each is a prompt to design from — combine with the brief; none is a template)\n`);
  for (let i = 0; i < count; i++) {
    const idea = Object.fromEntries(Object.keys(POOLS).map((k) => [k, pick(POOLS[k], taken[k])]));
    console.log(`${String.fromCharCode(65 + i)}. Concept metaphor: ${idea.metaphor}\n   Palette strategy: ${idea.palette}\n   Type approach: ${idea.type}\n   Layout grammar: ${idea.layout}\n   Signature element: ${idea.signature}\n   Motion personality: ${idea.motion}\n`);
  }
  console.log("Translate each seed into a direction card (concept sentence tied to the subject, tokens from the brief), then run:\n  node novelty.mjs check <your tokens file>   — before showing it to the user");
} else if (cmd === "check" || cmd === "record") {
  if (!rest.length) { console.error(`Usage: node novelty.mjs ${cmd} <tokens.css|globals.css|DESIGN.md …>`); process.exit(2); }
  const fp = fromFiles(rest);
  if (cmd === "record") {
    mkdirSync(dirname(HISTORY), { recursive: true });
    appendFileSync(HISTORY, JSON.stringify({ at: new Date().toISOString(), name: opt("name", rest[0]), ...fp }) + "\n");
    console.log(`recorded fingerprint → ${HISTORY}`);
    process.exit(0);
  }
  const others = [...PRESETS.map(fromPreset), ...history().map((h) => ({ ...h, id: h.name, kind: "your past project" }))];
  const ranked = others.map((o) => ({ o, ...similarity(fp, o) })).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  console.log(`Fingerprint: display ${fp.display || "?"} · body ${fp.body || "?"} · accent ${fp.accentH != null ? `h${Math.round(fp.accentH)} c${fp.accentC?.toFixed(2)} l${fp.accentL?.toFixed(2)}` : "?"} · bg ${fp.bgH != null ? `h${Math.round(fp.bgH)}` : "?"} · radius ${fp.radius ?? "?"}px\n`);
  for (const r of ranked.slice(0, 3)) console.log(`  ${r.score.toFixed(2)}  ${r.o.kind} "${r.o.id}"  ${r.parts.length ? "— same " + r.parts.join(", ") : ""}`);
  const tooClose = top && top.score >= 0.6;
  console.log(`\n${tooClose ? `▲ TOO CLOSE to ${top.o.kind} "${top.o.id}" — change at least two of: ${top.parts.join(", ")}. Derive them from the brief, not from a preset.` : "✔ ORIGINAL — no preset or past project shares most of this fingerprint."}`);
  console.log("(Fingerprints cover fonts, accent, background temperature and radius. Layout, imagery and the signature element matter just as much — judge those by eye.)");
  process.exitCode = tooClose && argv.includes("--strict") ? 1 : 0;
} else if (cmd === "history") {
  const h = history();
  if (!h.length) console.log(`No history yet (${HISTORY}). Record a project with: node novelty.mjs record <tokens.css> --name "<project>"`);
  for (const x of h) console.log(`${String(x.at || "").slice(0, 10).padEnd(10)}  ${String(x.name).padEnd(28)} ${x.display || "?"} / ${x.body || "?"} · accent h${Math.round(Number(x.accentH) || 0)} · radius ${x.radius ?? "?"}px`.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, ""));
} else {
  const head = [];
  for (const l of readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exitCode = cmd ? 2 : 0;
}
