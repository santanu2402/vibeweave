#!/usr/bin/env node
// Build-output weight report: JS / CSS / images / fonts / media with gzip + brotli sizes, the largest
// files, heavy libraries detected inside JS chunks, and concrete flags. Zero dependencies.
// Run it AFTER a production build (next build, vite build, astro build …).
//
// Usage: node bundle.mjs [dir] [--top 15] [--json] [--strict] [--budget-js 200] [--budget-css 60]
//   dir           build output; auto-detected when omitted (.next/static, dist, build, out, .output/public …)
//   --budget-js   total gzip KB of JS before warning (default 200 — tune per project)
//   --budget-css  total gzip KB of CSS before warning (default 60)
//   --strict      exit 1 when any "error" flag exists (useful in CI)
// Files are compressed in parallel on worker threads (same gzip -9 / brotli 11 settings, so the same numbers).
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, extname, relative, sep } from "node:path";
import { gzip, brotliCompress, constants } from "node:zlib";
import { promisify } from "node:util";
import { availableParallelism, cpus } from "node:os";

// zlib's async API runs on libuv's thread pool (4 threads unless set before first use): size it to the machine.
const CORES = typeof availableParallelism === "function" ? availableParallelism() : cpus().length;
process.env.UV_THREADPOOL_SIZE ||= String(Math.min(16, Math.max(4, CORES)));
const gzipAsync = promisify(gzip), brotliAsync = promisify(brotliCompress);

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const VALUE_FLAGS = ["--top", "--budget-js", "--budget-css"];
const json = argv.includes("--json");
const strict = argv.includes("--strict");
const TOP = Math.max(1, parseInt(opt("top", "15"), 10) || 15);
const MAX_COMPRESS_BYTES = 25 * 1024 * 1024; // larger files are reported at raw size instead of being compressed
const BUDGET_JS = parseFloat(opt("budget-js", "200")) * 1024;
const BUDGET_CSS = parseFloat(opt("budget-css", "60")) * 1024;

const CANDIDATES = [".next/static", ".output/public", ".svelte-kit/output/client", "dist", "build", "out", "public/build", "_site", ".vercel/output/static"];
let root = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
if (!root) {
  root = CANDIDATES.find((c) => existsSync(c) && statSync(c).isDirectory());
  if (!root) {
    console.error(`No build output found (looked for ${CANDIDATES.join(", ")}).\nRun the production build first, or pass the output folder: node bundle.mjs <dir>`);
    process.exit(2);
  }
}
if (!existsSync(root)) { console.error(`Path not found: ${root}`); process.exit(2); }

const KIND = {
  js: [".js", ".mjs", ".cjs"], css: [".css"], html: [".html", ".htm"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg", ".ico"],
  font: [".woff2", ".woff", ".ttf", ".otf", ".eot"],
  media: [".mp4", ".webm", ".mov", ".mp3", ".wav", ".ogg"],
  data: [".json", ".wasm", ".glb", ".gltf", ".lottie", ".riv"],
};
const kindOf = (ext) => Object.keys(KIND).find((k) => KIND[k].includes(ext)) || "other";
const COMPRESSIBLE = new Set(["js", "css", "html", "data"]);

// Signatures of libraries that are heavy enough to deserve a lazy import() when not needed on first paint.
const HEAVY = [
  { lib: "three.js", re: /WebGLRenderer|THREE\.REVISION|three\.module/ , hint: "dynamic import() the 3D section; render a poster first" },
  { lib: "lottie-web", re: /bodymovin|lottie-web|"assets":\[.*"layers"/, hint: "use @lottiefiles/dotlottie-web and lazy-load it" },
  { lib: "gsap", re: /GreenSock|gsap\.registerPlugin|_gsScope/, hint: "import only the plugins used; lazy-load ScrollTrigger sections" },
  { lib: "motion / framer-motion", re: /framer-motion|motion-dom|MotionConfigContext/, hint: "use LazyMotion + m components, or CSS for simple transitions" },
  { lib: "moment", re: /moment\.version|isMoment\b/, hint: "swap for date-fns or Intl.DateTimeFormat" },
  { lib: "lodash (full)", re: /lodash\.templateSettings|__lodash_hash_undefined__/, hint: "import per-method (lodash-es/debounce) or use native" },
  { lib: "chart.js / echarts / plotly", re: /Chart\.register|echarts\.init|Plotly\.newPlot/, hint: "lazy-load charts below the fold" },
  { lib: "highlight / prism / shiki", re: /hljs\.registerLanguage|Prism\.languages|shikiji|createHighlighter/, hint: "highlight at build time or load languages on demand" },
  { lib: "mapbox / leaflet", re: /mapboxgl\.|L\.map\(|leaflet/, hint: "load the map on interaction or when in view" },
  { lib: "icon pack (whole set)", re: /react-icons|@fortawesome\/fontawesome-svg-core/, hint: "import individual icons; check tree-shaking" },
  { lib: "@mui / antd", re: /@mui\/material|antd\/es/, hint: "check per-component imports and tree-shaking" },
];

const files = [];
/** Collect every file under the build folder. Symlinks are skipped so the walk never leaves the folder or loops. */
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.isSymbolicLink()) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== "cache") walk(p); continue; }
    if (!e.isFile()) continue;
    const ext = extname(e.name).toLowerCase();
    const size = statSync(p).size;
    if (ext === ".map") { files.push({ path: p, ext, kind: "sourcemap", size, gz: 0, br: 0 }); continue; }
    const kind = kindOf(ext);
    files.push({ path: p, ext, kind, size, gz: size, br: size, libs: [], compress: (COMPRESSIBLE.has(kind) || ext === ".svg") && size <= MAX_COMPRESS_BYTES });
  }
}
/** gzip + brotli sizes and library signatures for one file (runs on the thread pool). */
async function measure(f) {
  const buf = await readFile(f.path);
  const [gz, br] = await Promise.all([gzipAsync(buf, { level: 9 }), brotliAsync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })]);
  f.gz = gz.length; f.br = br.length;
  if (f.kind === "js" && f.size > 30_000) { const text = buf.toString("utf8"); f.libs = HEAVY.filter((h) => h.re.test(text)).map((h) => h.lib); }
}
/** Compress many files at once, bounded by CPU count and by the bytes held in memory (results keep the walk order). */
async function measureAll(list) {
  const MAX_INFLIGHT_BYTES = 256 * 1024 * 1024;
  let next = 0, inflight = 0;
  const waiters = [];
  const worker = async () => {
    while (next < list.length) {
      const f = list[next++];
      while (inflight > 0 && inflight + f.size > MAX_INFLIGHT_BYTES) await new Promise((r) => waiters.push(r));
      inflight += f.size;
      try { await measure(f); } finally { inflight -= f.size; waiters.splice(0).forEach((r) => r()); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(Number(process.env.UV_THREADPOOL_SIZE) || 4, list.length) }, worker));
}
const rootStat = statSync(root);
if (rootStat.isDirectory()) walk(root); else { console.error("Pass a directory."); process.exit(2); }
await measureAll(files.filter((f) => f.compress));
for (const f of files) delete f.compress;

const rel = (p) => relative(root, p).split(sep).join("/");
const kb = (n) => (n / 1024).toFixed(n < 10_240 ? 1 : 0) + " KB";
const totals = {};
for (const f of files) {
  const t = (totals[f.kind] ||= { files: 0, size: 0, gz: 0, br: 0 });
  t.files++; t.size += f.size; t.gz += f.gz; t.br += f.br;
}

const flags = [];
const flag = (sev, msg, file) => flags.push({ sev, msg, file: file ? rel(file) : undefined });
const js = files.filter((f) => f.kind === "js"), css = files.filter((f) => f.kind === "css");
const sum = (arr, k) => arr.reduce((a, f) => a + f[k], 0);

if (sum(js, "gz") > BUDGET_JS) flag("warn", `Total JS is ${kb(sum(js, "gz"))} gzip across ${js.length} files (budget ${kb(BUDGET_JS)}). Not all of it loads on first paint — check the largest chunks below.`);
if (sum(css, "gz") > BUDGET_CSS) flag("warn", `Total CSS is ${kb(sum(css, "gz"))} gzip (budget ${kb(BUDGET_CSS)}). Purge unused styles or split per route.`);
for (const f of js) {
  if (f.gz > 150 * 1024) flag("error", `JS chunk ${kb(f.gz)} gzip — split it (route-level code splitting, dynamic import()).`, f.path);
  else if (f.gz > 80 * 1024) flag("warn", `JS chunk ${kb(f.gz)} gzip — a candidate for splitting.`, f.path);
}
const libHits = new Map();
for (const f of js) for (const lib of f.libs || []) libHits.set(lib, [...(libHits.get(lib) || []), f]);
for (const [lib, hits] of libHits) {
  const h = HEAVY.find((x) => x.lib === lib);
  flag("info", `${lib} found in ${hits.length} chunk(s) (${hits.slice(0, 3).map((f) => rel(f.path)).join(", ")}) — ${h.hint}.`);
}
for (const f of files.filter((f) => f.kind === "image")) {
  if ([".png", ".jpg", ".jpeg", ".gif"].includes(f.ext) && f.size > 300 * 1024) flag("warn", `${kb(f.size)} ${f.ext.slice(1).toUpperCase()} — serve AVIF/WebP at the displayed size (framework image component or sharp/squoosh).`, f.path);
  if (f.ext === ".gif" && f.size > 100 * 1024) flag("warn", `Animated GIF ${kb(f.size)} — use a muted looping <video> (MP4/WebM) instead; often 5–10× smaller.`, f.path);
  if (f.ext === ".svg" && f.size > 60 * 1024) flag("info", `SVG ${kb(f.size)} — run it through SVGO or simplify paths.`, f.path);
}
const fonts = files.filter((f) => f.kind === "font");
if (fonts.length > 8) flag("warn", `${fonts.length} font files shipped. Use ≤ 2 families, variable fonts, and subset (latin) — each file is a request on the critical path.`);
const legacyFonts = fonts.filter((f) => f.ext !== ".woff2");
if (legacyFonts.length) flag("warn", `${legacyFonts.length} non-WOFF2 font file(s) (${[...new Set(legacyFonts.map((f) => f.ext))].join(", ")}). Ship WOFF2 only — every modern browser supports it.`);
for (const f of files.filter((f) => f.kind === "media" && f.size > 5 * 1024 * 1024)) flag("warn", `Media file ${kb(f.size)} — compress, offer a poster, and lazy-load or stream it.`, f.path);
for (const f of files.filter((f) => f.kind === "data" && [".glb", ".gltf"].includes(f.ext) && f.size > 2 * 1024 * 1024)) flag("warn", `3D model ${kb(f.size)} — compress with gltf-transform (Draco/Meshopt + KTX2 textures).`, f.path);
const maps = files.filter((f) => f.kind === "sourcemap");
if (maps.length) flag("info", `${maps.length} source map(s) in the output. Fine if intended; they expose source code when deployed publicly.`);

const order = { error: 0, warn: 1, info: 2 };
flags.sort((a, b) => order[a.sev] - order[b.sev]);
const largest = files.filter((f) => f.kind !== "sourcemap").sort((a, b) => b.size - a.size).slice(0, TOP);

if (json) {
  console.log(JSON.stringify({
    root, totals, flags,
    largest: largest.map((f) => ({ file: rel(f.path), kind: f.kind, size: f.size, gzip: f.gz, brotli: f.br, libs: f.libs })),
  }, null, 2));
} else {
  console.log(`Build output: ${root}\n`);
  console.log("TYPE       FILES        RAW       GZIP     BROTLI");
  for (const [k, t] of Object.entries(totals).sort((a, b) => b[1].size - a[1].size)) {
    const compressed = COMPRESSIBLE.has(k) || k === "image";
    console.log(`${k.padEnd(10)} ${String(t.files).padStart(5)} ${kb(t.size).padStart(10)} ${(compressed ? kb(t.gz) : "—").padStart(10)} ${(compressed ? kb(t.br) : "—").padStart(10)}`);
  }
  console.log(`\nLARGEST ${largest.length}`);
  for (const f of largest) {
    const comp = COMPRESSIBLE.has(f.kind) ? `  (${kb(f.gz)} gz)` : "";
    console.log(`  ${kb(f.size).padStart(9)}${comp.padEnd(16)} ${rel(f.path)}${f.libs?.length ? `  ← ${f.libs.join(", ")}` : ""}`);
  }
  const icon = { error: "✖", warn: "▲", info: "·" };
  console.log(flags.length ? `\nFLAGS` : "\n✓ no flags");
  for (const f of flags) console.log(`  ${icon[f.sev]} ${f.file ? f.file + " — " : ""}${f.msg}`);
  console.log("\nSizes are of files on disk; what a visitor downloads depends on the route. Pair with vitals.mjs for real page weight.");
}
process.exit(strict && flags.some((f) => f.sev === "error") ? 1 : 0);
