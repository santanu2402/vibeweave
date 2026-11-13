#!/usr/bin/env node
// Generate a perceptually even 11-step color scale (50–950) in OKLCH from one brand color,
// with sRGB hex fallbacks, optional hue-tinted neutrals, and contrast notes.
//
// Usage: node palette.mjs <color> [--name brand] [--neutral] [--format css|tailwind|json]
//   node palette.mjs "#0f766e" --name teal --neutral
//   node palette.mjs "oklch(0.62 0.19 255)" --format tailwind
import { parseColor, rgbToOklch, oklchToRgb, rgbToHex, fmtOklch, wcagRatio } from "./color-utils.mjs";
import { readFileSync } from "node:fs";

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const opts = { name: "brand", format: "css", neutral: false };
const positional = [];
for (const args = process.argv.slice(2); args.length; ) {
  const a = args.shift();
  if (a === "--neutral") opts.neutral = true;
  else if (a === "--name" || a === "--format") opts[a.slice(2)] = args.shift();
  else positional.push(a);
}
const input = positional[0];
if (!input || !["css", "tailwind", "json"].includes(opts.format)) {
  console.error(`Usage: node palette.mjs <color> [--name brand] [--neutral] [--format css|tailwind|json]`);
  process.exit(2);
}

// The name becomes part of CSS custom property names (--color-<name>-500), so keep it a valid identifier.
const name = String(opts.name || "brand").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
const { format } = opts;
const withNeutral = opts.neutral;

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// Lightness targets tuned so 500 sits mid-range, 600+ carry white text, 50–200 work as tints.
const L = [0.975, 0.945, 0.89, 0.815, 0.725, 0.635, 0.545, 0.46, 0.385, 0.32, 0.25];
// Chroma envelope: full chroma in the middle, tapering at the extremes (where sRGB can't hold it).
const C_SCALE = [0.12, 0.22, 0.42, 0.68, 0.9, 1, 0.98, 0.9, 0.78, 0.66, 0.52];

let base;
try { base = rgbToOklch(parseColor(input)); } catch (e) { console.error(`✖ ${e.message}`); process.exit(2); }
// Keep vivid inputs vivid; give near-gray inputs enough chroma to read as a hue.
const peakC = Math.max(base.c, 0.04);

/** Build the 11 steps at fixed lightness targets; chroma follows the envelope and is gamut-mapped into sRGB. */
function buildScale(hue, chromaPeak, envelope) {
  return STEPS.map((step, i) => {
    const target = { l: L[i], c: chromaPeak * envelope[i], h: hue };
    const rgb = oklchToRgb(target);
    const actual = rgbToOklch(rgb); // post gamut-mapping
    return { step, oklch: fmtOklch({ l: target.l, c: actual.c, h: hue }), hex: rgbToHex(rgb), rgb };
  });
}

const brand = buildScale(base.h, peakC, C_SCALE);
// Neutrals: same hue, whisper of chroma — reads as "designed gray", not dead gray.
const neutral = withNeutral ? buildScale(base.h, Math.min(0.018, peakC * 0.12), C_SCALE.map(() => 1)) : null;

// Closest step to the input, so the user knows where their exact brand color lands.
const nearest = L.reduce((best, l, i) => (Math.abs(l - base.l) < Math.abs(L[best] - base.l) ? i : best), 0);

const white = { r: 1, g: 1, b: 1 };
const firstOnWhite = brand.find((s) => wcagRatio(s.rgb, white) >= 4.5);
const darkest = brand[brand.length - 1];
const lastOnDark = [...brand].reverse().find((s) => wcagRatio(s.rgb, darkest.rgb) >= 4.5);

/** Render a scale as CSS (hex fallbacks + @supports OKLCH), a Tailwind v4 @theme block, or JSON. */
function emit(scale, label) {
  if (format === "json") return scale.map(({ step, oklch, hex }) => ({ step, oklch, hex }));
  if (format === "tailwind") {
    return [`@theme {`, ...scale.map((s) => `  --color-${label}-${s.step}: ${s.oklch}; /* ${s.hex} */`), `}`].join("\n");
  }
  return [
    `:root {`,
    `  /* ${label}: sRGB fallbacks first, OKLCH for browsers that support it (all evergreen browsers do) */`,
    ...scale.map((s) => `  --color-${label}-${s.step}: ${s.hex};`),
    `}`,
    `@supports (color: oklch(0 0 0)) {`,
    `  :root {`,
    ...scale.map((s) => `    --color-${label}-${s.step}: ${s.oklch};`),
    `  }`,
    `}`,
  ].join("\n");
}

if (format === "json") {
  console.log(JSON.stringify({ input, base: fmtOklch(base), [name]: emit(brand, name), ...(neutral ? { neutral: emit(neutral, "neutral") } : {}) }, null, 2));
} else {
  console.log(`/* Input ${input} = ${fmtOklch(base)} — closest step: ${name}-${STEPS[nearest]} */`);
  console.log(emit(brand, name));
  if (neutral) console.log("\n" + emit(neutral, "neutral"));
  console.log(`\n/* Contrast notes:`);
  console.log(`   - First step with ≥4.5:1 on white (safe for text/buttons with white label): ${firstOnWhite ? `${name}-${firstOnWhite.step}` : "none"}`);
  console.log(`   - Lightest step readable on ${name}-950 (≥4.5:1): ${lastOnDark ? `${name}-${lastOnDark.step}` : "none"}`);
  console.log(`   - Use 50–200 for tinted surfaces, 500–700 for accents/buttons, 800–950 for text on tints.`);
  console.log(`   - If you need the exact brand color, use it as-is for the logo/hero and let the scale do the UI work. */`);
}
