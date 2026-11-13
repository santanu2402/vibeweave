#!/usr/bin/env node
// Vibeweave design presets: 25 ready themes (palette light/dark, fonts, radius, shadows, motion personality,
// dials, signature patterns) covering most site types — list them, apply one as tokens, or verify them all.
// Zero dependencies. `check --fonts` needs network (Fontsource API); everything else works offline.
//
// Usage: node preset.mjs list [--for restaurant] [--style glass]   browse presets (filter by site type or style)
//        node preset.mjs show <id>                                  full details + font install commands
//        node preset.mjs apply <id> [--format css|tailwind|shadcn|json|design] [--out <file>]
//        node preset.mjs check [--fonts]                            verify WCAG AA for every preset (+ fonts exist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseColor, wcagRatio, rgbToHex } from "./color-utils.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(readFileSync(join(here, "../assets/presets/presets.json"), "utf8"));
const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--for", "--style", "--format", "--out"];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const [cmd, arg] = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
const find = (id) => DATA.presets.find((p) => p.id === id) || fail(`unknown preset "${id}" — run: node preset.mjs list`);
function fail(msg) { console.error(`✖ ${msg}`); process.exit(2); }

// Fallback stacks are chosen by the preset font's classification.
const SERIF = new Set(["instrument-serif", "source-serif-4", "fraunces", "bodoni-moda", "young-serif"]);
const MONO = new Set(["space-mono", "ibm-plex-mono", "jetbrains-mono", "geist-mono", "vt323"]);
const fallbackFor = (id) => (SERIF.has(id) ? 'ui-serif, Georgia, "Times New Roman", serif' : MONO.has(id) ? 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace' : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif');
const family = (f) => `"${f.family}${f.variable ? " Variable" : ""}"`;
const pkg = (f) => `@fontsource${f.variable ? "-variable" : ""}/${f.id}`;
const fonts = (p) => Object.entries(p.fonts).map(([role, f]) => ({ role, ...f }));

/**
 * Simulate a damped spring (semi-implicit Euler, 600 steps/s, 2 s max) and sample it into a CSS linear() easing.
 * @param {{ k: number, c: number, m?: number }} s stiffness, damping, mass
 * @returns {{ easing: string, ms: number }} 33-point linear() curve and the time to settle within 0.1%
 */
function spring({ k, c, m = 1 }) {
  const dt = 1 / 600, s = { x: 0, v: 0 }, xs = [];
  let settle = 0;
  for (let i = 0; i < 1200; i++) {                          // 2s max
    const f = -k * (s.x - 1) - c * s.v; s.v += (f / m) * dt; s.x += s.v * dt; xs.push(s.x);
    if (Math.abs(s.x - 1) > 0.001 || Math.abs(s.v) > 0.01) settle = i;
  }
  const n = Math.max(2, settle + 1), samples = 32, pts = [];
  for (let i = 0; i <= samples; i++) pts.push(+xs[Math.min(n - 1, Math.round((i / samples) * (n - 1)))].toFixed(3));
  pts[0] = 0; pts[pts.length - 1] = 1;
  return { easing: `linear(${pts.join(", ")})`, ms: Math.round(n * dt * 1000) };
}

const hueOf = (c) => +(String(c).match(/oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)/)?.[1] ?? 260);
const lightOf = (c) => +(String(c).match(/oklch\(\s*([\d.]+)/)?.[1] ?? 0.9);
/** Three elevation levels in the preset's shadow style (soft, hard, none, glow, neu, clay), tinted by the background hue. */
function shadows(p, mode) {
  const c = p[mode], h = hueOf(c.bg), sc = (a) => `oklch(${mode === "dark" ? 0.05 : 0.25} 0.03 ${h} / ${a})`;
  switch (p.shadow) {
    case "hard": return ["2px 2px 0 var(--color-border)", "4px 4px 0 var(--color-border)", "6px 6px 0 var(--color-border)"];
    case "none": return ["0 0 0 1px var(--color-border)", "0 0 0 1px var(--color-border)", `0 0 0 1px var(--color-border), 0 12px 32px -16px ${sc(0.25)}`];
    case "glow": return ["0 0 0 1px var(--color-border)", `0 0 0 1px var(--color-border), 0 8px 28px -12px color-mix(in oklch, var(--color-accent) 40%, transparent)`,
      `0 0 0 1px var(--color-border), 0 24px 64px -20px color-mix(in oklch, var(--color-accent) 45%, transparent)`];
    case "neu": { const l = lightOf(c.bg), lo = `oklch(${Math.max(0, l - 0.12).toFixed(2)} 0.012 ${h})`, hi = `oklch(${Math.min(1, l + 0.07).toFixed(2)} 0.006 ${h})`;
      return [`4px 4px 10px ${lo}, -4px -4px 10px ${hi}`, `8px 8px 18px ${lo}, -8px -8px 18px ${hi}`, `inset 6px 6px 12px ${lo}, inset -6px -6px 12px ${hi}`]; }
    case "clay": return [`8px 10px 20px ${sc(0.16)}, inset -4px -4px 10px ${sc(0.12)}, inset 4px 4px 10px oklch(1 0 0 / .6)`,
      `14px 16px 30px ${sc(0.2)}, inset -6px -6px 14px ${sc(0.14)}, inset 6px 6px 14px oklch(1 0 0 / .65)`,
      `20px 24px 44px ${sc(0.24)}, inset -8px -8px 18px ${sc(0.16)}, inset 8px 8px 18px oklch(1 0 0 / .7)`];
    default: return [`0 1px 2px ${sc(0.08)}, 0 1px 1px ${sc(0.06)}`,
      `0 1px 2px ${sc(0.07)}, 0 4px 8px ${sc(0.07)}, 0 12px 24px ${sc(0.06)}`,
      `0 2px 4px ${sc(0.07)}, 0 8px 16px ${sc(0.07)}, 0 24px 48px ${sc(0.07)}, 0 48px 96px ${sc(0.05)}`];
  }
}
const ROLE = { bg: "bg", surface: "surface", text: "text", muted: "text-muted", border: "border", accent: "accent", onAccent: "on-accent", focus: "focus", accent2: "accent-2" };
const colorVars = (c, prefix = "--color-") => Object.entries({ ...c, focus: c.focus || c.accent }).map(([k, v]) => `  ${prefix}${ROLE[k] || k}: ${v};`).join("\n");
const DANGER = { light: "oklch(0.55 0.2 27)", dark: "oklch(0.72 0.17 25)" };

// Output formats: css (plain custom properties), tailwind (v4 @theme inline), shadcn (globals.css variables),
// dtcg (Design Tokens Community Group JSON) and design (a DESIGN.md starter).
/** Mode-independent tokens: fonts, radii, durations and easings (incl. the spring as linear()). */
function base(p) {
  const m = DATA.motion[p.motion], sp = spring(m.spring), f = p.fonts;
  return [
    `  --font-display: ${family(f.display)}, ${fallbackFor(f.display.id)};`,
    `  --font-body: ${family(f.body)}, ${fallbackFor(f.body.id)};`,
    f.mono ? `  --font-mono: ${family(f.mono)}, ${fallbackFor(f.mono.id)};` : `  --font-mono: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;`,
    `  --radius-sm: ${p.radius.sm}; --radius-md: ${p.radius.md}; --radius-lg: ${p.radius.lg};`,
    `  --dur-fast: ${m.fast}ms; --dur-base: ${m.base}ms; --dur-slow: ${m.slow}ms; --stagger: ${m.stagger}ms; --motion-distance: ${m.distance};`,
    `  --ease-out: ${m.ease};`,
    `  --ease-spring: ${sp.easing}; --dur-spring: ${sp.ms}ms;`,
  ].join("\n");
}
function css(p) {
  const sh = (mode) => shadows(p, mode).map((s, i) => `  --shadow-${i + 1}: ${s};`).join("\n");
  return `/* Vibeweave preset "${p.name}" (${p.style}) — generated by preset.mjs. Tune toward your brief. */
:root {
  color-scheme: light dark;
${base(p)}
${colorVars(p.light)}
  --color-danger: ${DANGER.light};
${sh("light")}
}
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"] {
  color-scheme: dark;
${colorVars(p.dark)}
  --color-danger: ${DANGER.dark};
${sh("dark")}
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
${colorVars(p.dark).replace(/^ {2}/gm, "    ")}
    --color-danger: ${DANGER.dark};
${sh("dark").replace(/^ {2}/gm, "    ")}
  }
}
body { background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); }
h1, h2, h3, .display { font-family: var(--font-display); }
:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
`;
}
function tailwind(p) {
  const raw = (c) => Object.entries({ ...c, focus: c.focus || c.accent }).map(([k, v]) => `  --${ROLE[k] || k}: ${v};`).join("\n");
  const roles = [...new Set(Object.keys({ ...p.light, focus: 1 }).map((k) => ROLE[k] || k))];
  return `/* Vibeweave preset "${p.name}" — Tailwind v4. Put after @import "tailwindcss"; */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
:root {
${raw(p.light)}
  --danger: ${DANGER.light};
${shadows(p, "light").map((s, i) => `  --shadow-${i + 1}-raw: ${s};`).join("\n")}
}
[data-theme="dark"] {
${raw(p.dark)}
  --danger: ${DANGER.dark};
${shadows(p, "dark").map((s, i) => `  --shadow-${i + 1}-raw: ${s};`).join("\n")}
}
@theme inline {
${roles.map((r) => `  --color-${r}: var(--${r});`).join("\n")}
  --color-danger: var(--danger);
${base(p)}
  --shadow-1: var(--shadow-1-raw); --shadow-2: var(--shadow-2-raw); --shadow-3: var(--shadow-3-raw);
}
/* utilities: bg-bg bg-surface text-text text-text-muted border-border bg-accent text-on-accent ring-focus font-display rounded-lg shadow-2 */
/* no-flash: add the inline <head> theme script from references/theming.md §4 */
`;
}
function shadcn(p) {
  const v = (c, d) => `  --background: ${c.bg};\n  --foreground: ${c.text};\n  --card: ${c.surface};\n  --card-foreground: ${c.text};\n  --popover: ${c.surface};\n  --popover-foreground: ${c.text};\n  --primary: ${c.accent};\n  --primary-foreground: ${c.onAccent};\n  --secondary: ${c.surface};\n  --secondary-foreground: ${c.text};\n  --muted: ${c.surface};\n  --muted-foreground: ${c.muted};\n  --accent: ${c.surface};\n  --accent-foreground: ${c.text};\n  --destructive: ${d};\n  --border: ${c.border};\n  --input: ${c.border};\n  --ring: ${c.focus || c.accent};`;
  return `/* Vibeweave preset "${p.name}" — shadcn/ui variables (replace the :root and .dark blocks in globals.css; keep its @theme inline mapping). */
:root {
  --radius: ${p.radius.md};
${v(p.light, DANGER.light)}
}
.dark {
${v(p.dark, DANGER.dark)}
}
/* fonts: map in @theme inline →  --font-sans: ${family(p.fonts.body)}, ${fallbackFor(p.fonts.body.id)};  --font-heading: ${family(p.fonts.display)}; */
`;
}
function dtcg(p) {
  const col = (c) => Object.fromEntries(Object.entries({ ...c, focus: c.focus || c.accent }).map(([k, v]) => [ROLE[k] || k, { $type: "color", $value: v }]));
  const m = DATA.motion[p.motion];
  return JSON.stringify({
    $description: `Vibeweave preset ${p.name} (${p.style})`,
    color: { light: col(p.light), dark: col(p.dark) },
    font: Object.fromEntries(fonts(p).map((f) => [f.role, { $type: "fontFamily", $value: [f.family, ...fallbackFor(f.id).split(", ").map((s) => s.replace(/"/g, ""))] }])),
    radius: Object.fromEntries(Object.entries(p.radius).map(([k, v]) => [k, { $type: "dimension", $value: { value: parseFloat(v), unit: "px" } }])),
    duration: Object.fromEntries(["fast", "base", "slow"].map((k) => [k, { $type: "duration", $value: { value: m[k], unit: "ms" } }])),
  }, null, 2) + "\n";
}
function design(p) {
  const row = (role, k) => `| ${role} | \`--color-${ROLE[k]}\` | ${p.light[k] || p.light.accent} | ${p.dark[k] || p.dark.accent} |`;
  const m = DATA.motion[p.motion];
  return `# DESIGN.md — <Product name>\n\n> Seeded from the Vibeweave preset **${p.name}** (${p.style}). Adjust to the brief, then treat this as the contract.\n
## 1. Visual Theme & Atmosphere
- **Feeling:** ${p.mood.join(", ")} · **Style family:** ${p.style}
- **Dials:** variance ${p.dials.variance}/10 · motion ${p.dials.motion}/10 · density ${p.dials.density}/10
- **Signature patterns:** ${p.patterns.map((x) => `\`${x}\``).join(", ")} (frontend-forge assets/patterns)

## 2. Color Palette & Roles
| Role | Token | Light | Dark |
|---|---|---|---|
${[["Background", "bg"], ["Surface", "surface"], ["Text", "text"], ["Muted text", "muted"], ["Border", "border"], ["Accent", "accent"], ["On accent", "onAccent"], ["Focus", "focus"]].map(([r, k]) => row(r, k)).join("\n")}

## 3. Typography Rules
- **Display:** ${p.fonts.display.family} (\`${pkg(p.fonts.display)}\`) · **Body:** ${p.fonts.body.family} (\`${pkg(p.fonts.body)}\`)${p.fonts.mono ? ` · **Mono:** ${p.fonts.mono.family}` : ""}

## 6. Depth & Elevation
- **Radius:** sm ${p.radius.sm} · md ${p.radius.md} · lg ${p.radius.lg} · **Shadow style:** ${p.shadow}

## 7. Motion
- **Personality:** ${p.motion} — fast ${m.fast}ms · base ${m.base}ms · slow ${m.slow}ms · ease \`${m.ease}\` · stagger ${m.stagger}ms · travel ${m.distance}
- **Reduced motion:** fades only; no parallax, loops or scroll-jacking

## 8. Do's and Don'ts
- ❌ ${p.avoid}
`;
}

if (!cmd || argv.includes("--help")) {
  const head = [];
  for (const l of readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(cmd ? 0 : 2);
}
if (cmd === "list") {
  const forT = (opt("for", "") || "").toLowerCase(), st = (opt("style", "") || "").toLowerCase();
  const rows = DATA.presets.filter((p) => (!forT || p.bestFor.some((b) => b.includes(forT)) || p.mood.some((m) => m.includes(forT)))
    && (!st || p.style.toLowerCase().includes(st) || p.id.includes(st)));
  console.log("ID                  STYLE                              MOOD                            BEST FOR");
  for (const p of rows) console.log(`${p.id.padEnd(19)} ${p.style.slice(0, 34).padEnd(34)} ${p.mood.join(", ").slice(0, 31).padEnd(31)} ${p.bestFor.slice(0, 5).join(", ")}`);
  console.log(`\n${rows.length} preset(s). Details: node preset.mjs show <id> · Apply: node preset.mjs apply <id> --format css|tailwind|shadcn|json|design --out <file>`);
} else if (cmd === "show") {
  const p = find(arg), m = DATA.motion[p.motion];
  console.log(`${p.name}  (${p.id}) — ${p.style}\n  mood: ${p.mood.join(", ")} · best for: ${p.bestFor.join(", ")}\n  dials: variance ${p.dials.variance} · motion ${p.dials.motion} · density ${p.dials.density}`);
  console.log(`  fonts: ${fonts(p).map((f) => `${f.role} ${f.family}`).join(" · ")}\n  radius: ${Object.values(p.radius).join(" / ")} · shadow: ${p.shadow} · motion: ${p.motion} (${m.fast}/${m.base}/${m.slow}ms, ${m.use})`);
  for (const mode of ["light", "dark"]) console.log(`  ${mode.padEnd(5)}: ${Object.entries(p[mode]).map(([k, v]) => `${k} ${rgbToHex(parseColor(v))}`).join("  ")}`);
  console.log(`  patterns: ${p.patterns.join(", ")}\n  avoid: ${p.avoid}`);
  console.log(`\n  install fonts: npm i ${[...new Set(fonts(p).map(pkg))].join(" ")}\n  then import: ${[...new Set(fonts(p).map((f) => `import "${pkg(f)}";`))].join(" ")}`);
} else if (cmd === "apply") {
  const p = find(arg), format = opt("format", "css");
  const out = { css, tailwind, shadcn, json: dtcg, design }[format];
  if (!out) fail(`unknown --format ${format} (css | tailwind | shadcn | json | design)`);
  const text = out(p), file = opt("out", null);
  if (file) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, text); console.log(`wrote ${file}`); } else process.stdout.write(text);
  if (file) console.log(`fonts: npm i ${[...new Set(fonts(p).map(pkg))].join(" ")}  (ask before installing)\nnext: verify pairs with contrast.mjs, then tune the accent and type toward the brief.`);
} else if (cmd === "check") {
  const problems = [];
  const need = (p, mode, a, b, min, label) => {
    const r = wcagRatio(parseColor(p[mode][a] || p[mode].accent), parseColor(p[mode][b]));
    if (r < min) problems.push(`${p.id} ${mode}: ${label} ${r.toFixed(2)}:1 < ${min}:1`);
  };
  for (const p of DATA.presets) for (const mode of ["light", "dark"]) {
    need(p, mode, "text", "bg", 4.5, "text/bg"); need(p, mode, "text", "surface", 4.5, "text/surface");
    need(p, mode, "muted", "bg", 4.5, "muted/bg"); need(p, mode, "muted", "surface", 4.5, "muted/surface");
    need(p, mode, "onAccent", "accent", 4.5, "on-accent/accent");
    // WCAG 1.4.11: a filled control is identifiable if its fill OR its border reaches 3:1 against the page.
    if (wcagRatio(parseColor(p[mode].border), parseColor(p[mode].bg)) < 3) need(p, mode, "accent", "bg", 3, "accent/bg (UI; border too faint to carry it)");
    need(p, mode, "focus", "bg", 3, "focus/bg");
    if (!DATA.motion[p.motion]) problems.push(`${p.id}: unknown motion personality ${p.motion}`);
  }
  if (argv.includes("--fonts")) {
    const ids = [...new Set(DATA.presets.flatMap((p) => fonts(p).map((f) => `${f.id}|${f.variable}`)))];
    for (const key of ids) {
      const [id, variable] = key.split("|");
      try {
        const r = await fetch(`https://api.fontsource.org/v1/fonts/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(20_000) });
        if (!r.ok) { problems.push(`font ${id}: not found on Fontsource (${r.status})`); continue; }
        const f = await r.json();
        if (String(!!f.variable) !== variable) problems.push(`font ${id}: variable is ${!!f.variable} on Fontsource, preset says ${variable}`);
      } catch (e) { problems.push(`font ${id}: could not check (${e.message})`); }
    }
  }
  console.log(problems.length ? `✖ ${problems.length} problem(s):\n  ${problems.join("\n  ")}` : `✔ ${DATA.presets.length} presets × 2 modes pass WCAG AA (text, muted, on-accent 4.5:1; accent and focus 3:1)${argv.includes("--fonts") ? "; all fonts exist on Fontsource with the right variable flag" : ""}`);
  process.exitCode = problems.length ? 1 : 0;
} else fail(`unknown command "${cmd}" (list | show | apply | check)`);
