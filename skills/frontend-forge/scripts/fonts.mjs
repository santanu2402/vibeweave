#!/usr/bin/env node
// Find and set up web fonts from the Fontsource catalog (~2,100 open-source families incl. all of
// Google Fonts; ~570 variable): search by name, category, variable support and script coverage, then
// print install + loading code for Fontsource, next/font and plain CSS with a sensible fallback stack.
// Zero dependencies (Node ≥ 18 fetch). Needs network access to api.fontsource.org.
//
// Usage: node fonts.mjs search [query] [--category serif|sans-serif|display|monospace|handwriting]
//                              [--variable] [--subset latin-ext] [--axis opsz] [--limit 40]
//        node fonts.mjs info <font-id>       weights, styles, subsets, variable axes, license + setup snippets
// Examples:
//   node fonts.mjs search --category serif --variable --axis opsz
//   node fonts.mjs search grotesk --variable
//   node fonts.mjs info bricolage-grotesque
const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--category", "--subset", "--axis", "--limit"];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
const [cmd, ...rest] = positional;
const API = "https://api.fontsource.org/v1";
const MAX_BYTES = 20 * 1024 * 1024;   // the full /fonts catalog is a few MB
const FONT_ID = /^[a-z0-9-]+$/;       // Fontsource ids, e.g. "bricolage-grotesque"

class Fail extends Error { constructor(msg, code = 2) { super(msg); this.code = code; } }
/** Strip terminal control characters from API text before printing it. */
const clean = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
/** GET a Fontsource API path as JSON with a timeout and a response-size cap. */
async function api(path) {
  let res;
  try { res = await fetch(API + path, { headers: { "user-agent": "vibeweave-fonts" }, signal: AbortSignal.timeout(30_000) }); }
  catch (e) { throw new Fail(`cannot reach ${API} (${e.name === "TimeoutError" ? "timed out" : e.message})`, 3); }
  if (res.status === 404) throw new Fail(`not found: ${path} — search first: node fonts.mjs search <name>`, 1);
  if (!res.ok) throw new Fail(`${res.status} from ${API + path}`, 3);
  const chunks = []; let size = 0;
  for await (const chunk of res.body ?? []) { size += chunk.byteLength; if (size > MAX_BYTES) throw new Fail(`response from ${API} exceeds ${MAX_BYTES} bytes`, 3); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Fail(`invalid JSON from ${API + path}`, 3); }
}
// System font stacks per Fontsource category, placed after the web font so text renders before it loads.
const FALLBACK = {
  "sans-serif": 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  monospace: 'ui-monospace, "SFMono-Regular", "Cascadia Code", Menlo, Consolas, monospace',
  display: "system-ui, sans-serif", handwriting: "cursive, system-ui, sans-serif", other: "system-ui, sans-serif",
};
/** Weight list → "400" or "100–900". */
const range = (ws) => (ws.length ? (ws.length === 1 ? `${ws[0]}` : `${Math.min(...ws)}–${Math.max(...ws)}`) : "?");

main().catch((e) => { console.error(e instanceof Fail ? `✖ ${e.message}` : e); process.exitCode = e.code || 1; });

async function main() {
  if (!cmd || argv.includes("--help")) {
    console.log(`Usage:\n  node fonts.mjs search [query] [--category <c>] [--variable] [--subset <s>] [--axis <tag>] [--limit 40]\n  node fonts.mjs info <font-id>`);
    if (!cmd) process.exitCode = 2;
    return;
  }
  if (cmd === "search") {
    const q = rest.join(" ").toLowerCase();
    const cat = opt("category", null), subset = opt("subset", null), axis = opt("axis", null);
    const limit = parseInt(opt("limit", "40"), 10) || 40;
    let fonts = await api("/fonts");
    // Keep only well-formed records so a malformed API entry can't crash the table below.
    fonts = (Array.isArray(fonts) ? fonts : []).filter((f) => f && FONT_ID.test(f.id) && typeof f.family === "string" && Array.isArray(f.weights) && Array.isArray(f.subsets) && Array.isArray(f.styles));
    fonts = fonts.filter((f) => f.category !== "icons" && (!q || `${f.id} ${f.family}`.toLowerCase().includes(q))
      && (!cat || f.category === cat) && (!argv.includes("--variable") || f.variable) && (!subset || f.subsets.includes(subset)));
    if (axis) {
      const keep = [];
      for (const f of fonts.filter((f) => f.variable).slice(0, 120)) {   // axis data needs one request per font, so cap the scan
        try { const v = await api(`/variable/${f.id}`); if (v.axes?.[axis]) keep.push({ ...f, axes: Object.keys(v.axes) }); } catch {}
        if (keep.length >= limit) break;
      }
      fonts = keep;
    }
    // Prefer variable fonts with broad weight ranges, then alphabetical — no popularity data in the API.
    fonts.sort((a, b) => (b.variable - a.variable) || (b.weights.length - a.weights.length) || a.family.localeCompare(b.family));
    console.log("ID                          FAMILY                      CATEGORY     VAR  WEIGHTS    STYLES          SUBSETS  LICENSE");
    for (const f of fonts.slice(0, limit))
      console.log(clean(`${f.id.padEnd(27)} ${f.family.slice(0, 27).padEnd(27)} ${String(f.category || "").padEnd(12)} ${(f.variable ? "yes" : "-").padEnd(4)} ${range(f.weights).padEnd(10)} ${f.styles.join(",").padEnd(15)} ${String(f.subsets.length).padStart(4)}     ${f.license}${f.axes ? `  axes: ${f.axes.join(",")}` : ""}`));
    console.log(`\n${fonts.length} match(es)${fonts.length > limit ? ` — showing ${limit}` : ""}. Preview: https://fontsource.org/fonts/<id> · Details + setup: node fonts.mjs info <id>`);
    return;
  }
  if (cmd !== "info") throw new Fail(`unknown command "${cmd}" (search | info)`);
  const id = rest[0];
  if (!id) throw new Fail("Usage: node fonts.mjs info <font-id>");
  if (!FONT_ID.test(id)) throw new Fail(`invalid font id "${id}" — ids are lowercase with dashes, e.g. bricolage-grotesque`);
  const f = await api(`/fonts/${id}`);
  if (!f || !FONT_ID.test(f.id) || typeof f.family !== "string" || !Array.isArray(f.weights) || !Array.isArray(f.styles) || !Array.isArray(f.subsets))
    throw new Fail(`unexpected response for ${id} from ${API}`, 3);
  // Family names are pasted into generated CSS/JS strings, so keep only characters a font name needs.
  f.family = clean(f.family).replace(/["'\\<>`$]/g, "");
  const axes = f.variable ? (await api(`/variable/${id}`).catch(() => null))?.axes || null : null;
  const fallback = FALLBACK[f.category] || FALLBACK.other;
  const pkg = f.variable ? `@fontsource-variable/${f.id}` : `@fontsource/${f.id}`;
  const cssFamily = f.variable ? `"${f.family} Variable"` : `"${f.family}"`;
  const nextName = f.family.replace(/[^A-Za-z0-9]+/g, "_");
  const nonLatin = f.subsets.filter((s) => !/^latin/.test(s));

  console.log(`${f.family}  (${f.id})`);
  console.log(`  category: ${f.category} · source: ${f.type === "google" ? "Google Fonts" : "other"} · license: ${f.license}${f.version ? ` · version ${f.version}` : ""}`);
  console.log(`  weights: ${f.weights.join(", ")} · styles: ${f.styles.join(", ")}`);
  console.log(`  subsets: ${f.subsets.join(", ")}`);
  if (axes) console.log(`  variable axes: ${Object.entries(axes).map(([k, a]) => `${k} ${a.min}–${a.max} (default ${a.default})`).join(" · ")}`);
  console.log(`  preview: https://fontsource.org/fonts/${f.id}${f.type === "google" ? ` · https://fonts.google.com/specimen/${f.family.replace(/ /g, "+")}` : ""}`);

  console.log(`\n── Fontsource (self-hosted, any framework) ──`);
  console.log(`npm i ${pkg}`);
  console.log(f.variable ? `import "${pkg}";              // all axes; or "${pkg}/wght.css" for weight only` : `import "${pkg}/400.css";  import "${pkg}/700.css";   // only the weights you use`);
  console.log(`--font-display: ${cssFamily}, ${fallback};`);

  if (f.type === "google") {
    console.log(`\n── Next.js (next/font/google — self-hosts at build time, adds a metric-matched fallback) ──`);
    console.log(`import { ${nextName} } from "next/font/google";`);
    console.log(`const display = ${nextName}({ subsets: ["${f.defSubset || "latin"}"], ${f.variable ? (axes && Object.keys(axes).some((k) => !["wght", "ital"].includes(k)) ? `axes: [${Object.keys(axes).filter((k) => !["wght", "ital"].includes(k)).map((k) => `"${k}"`).join(", ")}], ` : "") : `weight: ["400", "700"], `}display: "swap", variable: "--font-display" });`);
    console.log(`// <html className={display.variable}> … then in CSS: font-family: var(--font-display), ${fallback};`);
  }
  console.log(`\n── Tailwind v4 ──\n@theme { --font-display: ${cssFamily}, ${fallback}; }   /* → class "font-display" */`);
  console.log(`\nNotes:`);
  console.log(`  · Load only the weights/axes and subsets you use${nonLatin.length ? ` (this family also ships ${nonLatin.length} non-latin subset(s))` : ""}; preload only the above-the-fold file, with crossorigin.`);
  console.log(`  · Avoid layout shift on swap: next/font does it automatically; elsewhere use fontaine or Capsize to generate size-adjust/ascent-override fallbacks.`);
  if (axes?.opsz) console.log(`  · Has optical sizing (opsz): set font-optical-sizing: auto, or tune opsz per text size for display vs body.`);
  if (f.license !== "OFL-1.1" && f.license !== "Apache-2.0") console.log(`  · License ${f.license}: check the terms before shipping.`);
}
