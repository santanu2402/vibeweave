#!/usr/bin/env node
// Search 260+ open-source icon sets (~460k icons: Lucide, Phosphor, Tabler, Material Symbols, Remix, Heroicons,
// Simple Icons brand logos, animated line-md / svg-spinners …) through the Iconify API, customize them, and write
// them into the project as SVG files, framework components or a sprite — with license info for every icon.
// Zero dependencies (Node ≥ 18 fetch). Needs network access to the Iconify API (or a self-hosted mirror via --api).
//
// Usage: node icons.mjs get <prefix:name …> [options]              write icons into the project
//        node icons.mjs search <query> [--sets lucide,ph] [--limit 48]   find icons (prefix:name)
//        node icons.mjs sets [--filter <text>]                     list icon sets: prefix, size, license, style
//   options for get:
//     --out src/icons          output folder (default ./icons)
//     --format svg|react|vue|svelte|astro|sprite   (default svg)
//     --size 1em               width/height (1em scales with font-size; e.g. 24)
//     --color currentColor     replace currentColor (keep the default so CSS controls color)
//     --stroke 1.5             override stroke-width on stroke-based icons (Lucide, Tabler, line-md …)
//     --api <url>              Iconify API mirror (HTTPS; http only for localhost)
//     --dry                    print what would be written
// Examples:
//   node icons.mjs search "shopping cart" --sets lucide,ph,tabler
//   node icons.mjs get lucide:arrow-right ph:house-duotone line-md:loading-loop --format react --out src/components/icons --stroke 1.75
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--sets", "--limit", "--out", "--format", "--size", "--color", "--stroke", "--api", "--filter"];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const positional = argv.filter((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
const [cmd, ...args] = positional;
const API = opt("api", "https://api.iconify.design").replace(/\/$/, "");
const MAX_BYTES = 20 * 1024 * 1024;   // the full /collections listing is ~1 MB; cap anything far beyond that
const TIMEOUT_MS = 30_000;

class Fail extends Error { constructor(msg, code = 2) { super(msg); this.code = code; } }

/** Strip terminal control characters so API text can't inject escape sequences into the console. */
const clean = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
/** One-line, comment-safe metadata (set names, licenses, authors are embedded in generated file comments). */
const meta1 = (s) => clean(s).replace(/[\r\n]+|\p{Zl}|\p{Zp}/gu, " ").replace(/-->|\*\/|<!--/g, "").slice(0, 160);

/** GET an Iconify API path as JSON — HTTPS only (http allowed for a localhost mirror), with timeout and size cap. */
async function api(path) {
  let u;
  try { u = new URL(API + path); } catch { throw new Fail(`invalid --api URL ${API}`); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) throw new Fail(`refusing ${u.protocol}//${u.host} — use an HTTPS Iconify API (http only for localhost)`);
  let res;
  try { res = await fetch(u, { headers: { "user-agent": "vibeweave-icons" }, signal: AbortSignal.timeout(TIMEOUT_MS) }); }
  catch (e) { throw new Fail(`Cannot reach ${API} (${e.name === "TimeoutError" ? "timed out" : e.message}). Check the network, or pass --api <mirror> (e.g. https://api.simplesvg.com).`, 3); }
  if (!res.ok) throw new Fail(`${res.status} from ${API + path}`, 3);
  const chunks = []; let size = 0;
  for await (const chunk of res.body ?? []) { size += chunk.byteLength; if (size > MAX_BYTES) throw new Fail(`response from ${API} exceeds ${MAX_BYTES} bytes`, 3); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new Fail(`invalid JSON from ${API + path}`, 3); }
}

// Iconify metadata has no "animated" tag, so keep a curated list of sets whose SVGs animate (SMIL/CSS, no JS).
const ANIMATED = ["line-md", "svg-spinners", "meteocons", "eos-icons"];
// Markup that could execute code once the SVG is written into a project.
const UNSAFE_SVG = /<\s*(script|foreignObject|iframe|object|embed)\b|\son[a-z]+\s*=|javascript:|data:text\/html/i;
// Template syntax per component format: an SVG body containing it would become code in that framework.
const TEMPLATE_SYNTAX = { react: /[{}]/, svelte: /[{}]/, astro: /[{}]/, vue: /\{\{|\}\}/ };

// Set exitCode instead of process.exit(): exiting right after fetch() can trip a libuv assertion on Windows.
main().catch((e) => { console.error(e instanceof Fail ? `✖ ${e.message}` : e); process.exitCode = e.code || 1; });

async function main() {
const PERMISSIVE = /^(MIT|ISC|Apache-2\.0|BSD-[23]-Clause|CC0-1\.0|OFL-1\.1|Unlicense|MPL-2\.0)$/i;
/** Short license verdict for a set: "" when permissive, otherwise what the user must check. */
const licenseNote = (lic) => !lic ? "unknown license — check before shipping"
  : PERMISSIVE.test(lic.spdx || "") ? "" : /CC-BY-4|CC-BY-3/i.test(lic.spdx || "") ? "attribution required"
  : /SA|GPL/i.test(lic.spdx || lic.title || "") ? "copyleft — check compatibility" : "check terms";

if (!cmd || cmd === "help" || argv.includes("--help")) {
  const head = [];
  for (const l of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  if (!cmd) process.exitCode = 2;
  return;
}

if (cmd === "sets") {
  const all = await api("/collections");
  const filter = (opt("filter", "") || "").toLowerCase();
  const match = (p, c) => filter === "animated" ? ANIMATED.includes(p)
    : `${p} ${c.name} ${c.category || ""} ${(c.tags || []).join(" ")}`.toLowerCase().includes(filter);
  const rows = Object.entries(all || {}).filter(([p, c]) => c && typeof c === "object" && !c.hidden && (!filter || match(p, c))).sort((a, b) => (b[1].total || 0) - (a[1].total || 0));
  console.log("PREFIX               ICONS  GRID  LICENSE        CATEGORY / NAME");
  for (const [p, c] of rows) {
    const note = licenseNote(c.license);
    console.log(clean(`${p.padEnd(20)} ${String(c.total).padStart(6)}  ${String(c.height || "-").padStart(4)}  ${String(c.license?.spdx || c.license?.title || "?").slice(0, 13).padEnd(13)}  ${String(c.category || "").padEnd(16)} ${c.name}${note ? `  [${note}]` : ""}`));
  }
  console.log(`\n${rows.length} sets, ${rows.reduce((a, [, c]) => a + (c.total || 0), 0).toLocaleString()} icons. Browse visually: https://icon-sets.iconify.design`);
  console.log("Filters: a set name or category (logos, programming, emoji, flags, material, multicolor) · \"animated\" for sets that animate on their own");
  return;
}

if (cmd === "search") {
  const query = args.join(" ");
  if (!query) throw new Fail("Usage: node icons.mjs search <query> [--sets lucide,ph] [--limit 48]");
  const sets = opt("sets", "");
  const limit = Math.min(999, Math.max(32, parseInt(opt("limit", "48"), 10) || 48));
  const res = await api(`/search?query=${encodeURIComponent(query)}&limit=${limit}${sets ? `&prefixes=${encodeURIComponent(sets)}` : ""}`);
  const by = {};
  for (const id of Array.isArray(res?.icons) ? res.icons : []) { const [p, n] = String(id).split(":"); if (p && n) (by[p] ||= []).push(n); }
  for (const [p, names] of Object.entries(by)) {
    const c = res.collections?.[p];
    const note = c ? licenseNote(c.license) : "";
    console.log(clean(`\n${p} — ${c?.name || ""} (${c?.license?.spdx || "?"}${note ? `, ${note}` : ""})`));
    console.log(clean("  " + names.map((n) => `${p}:${n}`).join("  ")));
  }
  console.log(`\n${Object.values(by).flat().length} result(s). Preview: https://icon-sets.iconify.design/?query=${encodeURIComponent(query)}`);
  console.log(`Then: node icons.mjs get <prefix:name …> --format react --out src/components/icons`);
  return;
}

if (cmd !== "get") throw new Fail(`Unknown command "${cmd}". Use: sets | search | get`);
// Icon ids double as file names, so they are restricted to lowercase letters, digits and dashes.
const ids = args.flatMap((a) => a.split(",")).filter(Boolean);
if (!ids.length || ids.some((id) => !/^[a-z0-9-]+:[a-z0-9-]+$/.test(id)))
  throw new Fail("Usage: node icons.mjs get <prefix:name …>   (ids look like lucide:arrow-right — find them with the search command)");
const format = opt("format", "svg");
if (!["svg", "react", "vue", "svelte", "astro", "sprite"].includes(format)) throw new Fail(`Unknown --format ${format}`);
const outDir = resolve(opt("out", "icons"));
const size = opt("size", "1em");
const color = opt("color", null);
const stroke = opt("stroke", null);
const dry = argv.includes("--dry");
// These values are written into SVG attributes, so they must not be able to close the attribute.
for (const [flag, v] of [["--size", size], ["--color", color], ["--stroke", stroke]])
  if (v != null && !/^[\w.#%(),/\s-]+$/.test(v)) throw new Fail(`invalid ${flag} value "${v}"`);

const byPrefix = {};
for (const id of ids) { const [p, n] = id.split(":"); (byPrefix[p] ||= new Set()).add(n); }
const metaAll = (await api(`/collections?prefixes=${Object.keys(byPrefix).join(",")}`)) || {};
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const icons = [], missing = [], rejected = [];
for (const [prefix, names] of Object.entries(byPrefix)) {
  const data = (await api(`/${prefix}.json?icons=${[...names].join(",")}`)) || {};
  const meta = metaAll[prefix] || {};
  for (const name of names) {
    // Aliases point at a parent icon, optionally rotated/flipped.
    let icon = data.icons?.[name], alias = data.aliases?.[name], t = {};
    if (!icon && alias) { t = alias; icon = data.icons?.[alias.parent]; }
    if (!icon || typeof icon.body !== "string") { missing.push(`${prefix}:${name}`); continue; }
    if (UNSAFE_SVG.test(icon.body) || (TEMPLATE_SYNTAX[format] && TEMPLATE_SYNTAX[format].test(icon.body))) { rejected.push(`${prefix}:${name}`); continue; }
    const w = num(icon.width ?? t.width ?? data.width, 16), h = num(icon.height ?? t.height ?? data.height, 16);
    let body = icon.body;
    const rotate = ((num(icon.rotate, 0) + num(t.rotate, 0)) % 4 + 4) % 4, hFlip = !!icon.hFlip !== !!t.hFlip, vFlip = !!icon.vFlip !== !!t.vFlip;
    if (rotate || hFlip || vFlip) {
      const tr = [];
      if (hFlip || vFlip) tr.push(`translate(${hFlip ? w : 0} ${vFlip ? h : 0}) scale(${hFlip ? -1 : 1} ${vFlip ? -1 : 1})`);
      if (rotate) tr.push(`rotate(${rotate * 90} ${w / 2} ${h / 2})`);
      body = `<g transform="${tr.join(" ")}">${body}</g>`;
    }
    if (stroke && /stroke-width=/.test(body)) body = body.replace(/stroke-width="[\d.]+"/g, `stroke-width="${stroke}"`);
    if (color) body = body.replaceAll("currentColor", color);
    icons.push({ id: `${prefix}:${name}`, prefix, name, body, viewBox: `${num(icon.left, 0)} ${num(icon.top, 0)} ${w} ${h}`,
      license: meta.license ? { spdx: meta1(meta.license.spdx), title: meta1(meta.license.title) } : undefined,
      author: meta.author ? { name: meta1(meta.author.name), url: meta1(meta.author.url) } : undefined, set: meta1(meta.name) });
  }
}
if (missing.length) { console.error(`✖ not found: ${missing.join(", ")} (check spelling with the search command)`); process.exitCode = 1; }
if (rejected.length) { console.error(`✖ refused (markup that could run code${TEMPLATE_SYNTAX[format] ? ` or ${format} template syntax` : ""}): ${rejected.join(", ")} — try --format svg or sprite`); process.exitCode = 1; }
if (!icons.length) return;

const pascal = (s) => s.replace(/(^|[-_:])([a-z0-9])/g, (_, __, c) => c.toUpperCase());
// Prefix the component/file name with the set only when two sets contribute the same icon name.
const names = new Map(icons.map((i) => [i.name, (icons.filter((x) => x.name === i.name).length)]));
for (const i of icons) i.component = `${names.get(i.name) > 1 ? pascal(i.prefix) : ""}${pascal(i.name)}Icon`;
for (const i of icons) i.file = names.get(i.name) > 1 ? `${i.prefix}-${i.name}` : i.name;

/** Convert SVG attribute syntax to JSX: class → className, kebab-case → camelCase (except aria-/data-), style string → object. */
const jsx = (body) => body
  .replace(/\s(class)=/g, " className=")
  .replace(/\s([a-z]+(?:-[a-z]+)+)=/g, (m, attr) => (/^(aria|data)-/.test(attr) ? m : " " + attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "="))
  .replace(/\s(xlink|xml):([a-z]+)=/g, (_, ns, a) => ` ${ns}${a[0].toUpperCase()}${a.slice(1)}=`)
  .replace(/\sstyle="([^"]*)"/g, (_, css) => ` style={{${css.split(";").filter((d) => d.includes(":")).map((d) => { const [k, ...v] = d.split(":"); return `${JSON.stringify(k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()))}: ${JSON.stringify(v.join(":").trim())}`; }).join(", ")}}}`);
const svgOpen = (i, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${i.viewBox}"${extra}>`;
const lic = (i) => i.license?.spdx || i.license?.title || "license?";

const files = [];
for (const i of icons) {
  const header = `<!-- ${i.id} · ${i.set} · ${lic(i)} -->`;
  if (format === "svg") files.push([`${i.file}.svg`, `${svgOpen(i)}${i.body}</svg>\n`]);
  if (format === "react") files.push([`${i.component}.tsx`, `// ${i.id} · ${i.set} · ${lic(i)}\nimport type { SVGProps } from "react";\n\nexport function ${i.component}(props: SVGProps<SVGSVGElement>) {\n  return (\n    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${i.viewBox}" aria-hidden="true" focusable="false" {...props}>\n      ${jsx(i.body)}\n    </svg>\n  );\n}\n`]);
  if (format === "vue") files.push([`${i.component}.vue`, `${header}\n<template>\n  ${svgOpen(i, ' aria-hidden="true" focusable="false"')}${i.body}</svg>\n</template>\n`]);
  if (format === "svelte") files.push([`${i.component}.svelte`, `${header}\n<script>\n  let { ...rest } = $props();\n</script>\n\n${svgOpen(i, ' aria-hidden="true" focusable="false" {...rest}')}${i.body}</svg>\n`]);
  if (format === "astro") files.push([`${i.component}.astro`, `---\n// ${i.id} · ${i.set} · ${lic(i)}\nconst props = Astro.props;\n---\n${svgOpen(i, ' aria-hidden="true" focusable="false" {...props}')}${i.body}</svg>\n`]);
}
if (format === "sprite") {
  // Merge with an existing sprite so repeated runs add icons instead of replacing the file.
  const spritePath = join(outDir, "sprite.svg");
  const existing = existsSync(spritePath) ? readFileSync(spritePath, "utf8") : "";
  const kept = [...existing.matchAll(/<symbol id="([^"]+)"[\s\S]*?<\/symbol>/g)].filter((m) => !icons.some((i) => i.file === m[1])).map((m) => m[0]);
  const symbols = icons.map((i) => `<symbol id="${i.file}" viewBox="${i.viewBox}">${i.body}</symbol>`);
  files.push(["sprite.svg", `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${[...kept, ...symbols].join("\n")}\n</svg>\n`]);
}
if (["react", "vue", "svelte", "astro"].includes(format)) {
  const ext = { react: "", vue: ".vue", svelte: ".svelte", astro: ".astro" }[format];
  const indexPath = join(outDir, "index.ts");
  const lines = new Set(existsSync(indexPath) ? readFileSync(indexPath, "utf8").split("\n").filter(Boolean) : []);
  for (const i of icons) lines.add(format === "react" ? `export { ${i.component} } from "./${i.component}";` : `export { default as ${i.component} } from "./${i.component}${ext}";`);
  files.push(["index.ts", [...lines].sort().join("\n") + "\n"]);
}
// License manifest: one line per icon, merged across runs — the attribution trail for anything that needs credit.
const manifestPath = join(outDir, "ICONS.md");
const prev = existsSync(manifestPath) ? readFileSync(manifestPath, "utf8").split("\n").filter((l) => l.startsWith("| `")) : [];
const rows = new Map(prev.map((l) => [l.split("`")[1], l]));
for (const i of icons) rows.set(i.id, `| \`${i.id}\` | ${i.set} | ${lic(i).replace("license?", "?")} | ${i.author?.name || ""} ${i.author?.url ? `(${i.author.url})` : ""} | ${licenseNote(i.license) || "ok"} |`);
files.push(["ICONS.md", `# Icons\n\nFetched from the Iconify API with \`icons.mjs\`. Keep this file: it records each icon's source and license.\n\n| Icon | Set | License | Author | Note |\n|---|---|---|---|---|\n${[...rows.values()].sort().join("\n")}\n`]);

if (!dry) mkdirSync(outDir, { recursive: true });
for (const [f, content] of files) { if (!dry) writeFileSync(join(outDir, f), content); console.log(`${dry ? "would write" : "wrote"} ${join(outDir, f)}`); }
const needs = icons.filter((i) => licenseNote(i.license));
if (needs.length) console.log(`\n▲ license attention: ${needs.map((i) => `${i.id} (${i.license?.spdx || "?"}: ${licenseNote(i.license)})`).join(", ")}`);
if (format === "react") console.log(`\nUse: import { ${icons[0].component} } from "./icons";  <${icons[0].component} className="size-5" aria-hidden />  (add aria-label + role="img" when the icon carries meaning alone)`);
if (format === "sprite") console.log(`\nUse: <svg width="24" height="24" aria-hidden="true"><use href="/sprite.svg#${icons[0].file}" /></svg>  (serve sprite.svg from public/)`);
}
