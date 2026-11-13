#!/usr/bin/env node
// Vibeweave self-test: runs every tool as a child process against the small fixtures in tests/fixtures/ and checks
// exit codes and key output — planted bugs must be found, clean pages must stay quiet. Zero dependencies.
// It serves tests/fixtures/ on 127.0.0.1 (random free port) for the browser tools and stops the server at the end.
//
// Usage: node tools/selftest.mjs [--jobs n] [--only a,b] [--verbose] [--network] [--require-browser]
//                                [--site <url>] [--keep] [--list] [--serve]          (npm test runs this)
//   --jobs n            tests run in parallel (default: CPUs/2, min 1); at most a third of them drive a browser at once
//                       (the browser tools are parallel inside) and the timing-sensitive vitals tests run alone
//   --only a,b          only tests whose tool or name starts with a or b (e.g. --only contrast,wiring), or a group:
//                       offline | browser | network
//   --verbose           print the commands and output of failing tests
//   --network           also run tests that need the internet (fonts, icons, fetch-ui, preset --fonts; default: skipped)
//   --require-browser   fail instead of skipping the browser tests when Playwright or a browser is missing
//   --site <url>        also check, on a running site, that wiring and responsive give identical findings
//                       sequentially (--concurrency 1) and concurrently (pages: the start URL and docs/)
//   --keep              keep the temp work folder (printed at the end)
//   --list              list the tests and exit · --serve: only serve the fixtures (prints the URL; Ctrl+C stops)
// Browser tests need Playwright (axe-core too, for the full qa scan), resolved like the tools resolve it: from the
// current folder, NODE_PATH or this repo. To use a Playwright install from another folder without touching the repo:
//   NODE_PATH=/path/to/dir/node_modules node tools/selftest.mjs --require-browser           (bash)
//   $env:NODE_PATH="C:\path\to\dir\node_modules"; node tools/selftest.mjs --require-browser   (PowerShell)
// (or run it from that folder: cd /path/to/dir && node <repo>/tools/selftest.mjs). The children get the same NODE_PATH.
// Report: <OS temp>/vibeweave-selftest-report.json. Exit code: 0 = everything passed or skipped, 1 = a failure, 2 = bad usage.
import { execFile } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { availableParallelism, cpus, tmpdir } from "node:os";
import { delimiter, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(ROOT, "tests", "fixtures");
const argv = process.argv.slice(2);
const FLAGS = new Set(["--jobs", "--only", "--verbose", "--network", "--require-browser", "--site", "--keep", "--list", "--serve", "--help", "-h"]);
const VALUE = new Set(["--jobs", "--only", "--site"]);
for (let i = 0; i < argv.length; i++) {
  if (!FLAGS.has(argv[i])) usage(`unknown argument "${argv[i]}"`);
  if (VALUE.has(argv[i]) && (argv[i + 1] == null || argv[i + 1].startsWith("--"))) usage(`${argv[i]} needs a value`);
  if (VALUE.has(argv[i])) i++;
}
const opt = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (argv.includes("--help") || argv.includes("-h")) { printHelp(); process.exit(0); }
const cores = typeof availableParallelism === "function" ? availableParallelism() : cpus().length;
const JOBS = opt("--jobs") ? parseInt(opt("--jobs"), 10) : Math.max(1, Math.floor(cores / 2));
if (!Number.isInteger(JOBS) || JOBS < 1 || JOBS > 64) usage("--jobs must be a whole number from 1 to 64");
const BROWSER_JOBS = Math.max(1, Math.floor(JOBS / 3));
const ONLY = (opt("--only") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const VERBOSE = argv.includes("--verbose"), NETWORK = argv.includes("--network"), REQUIRE_BROWSER = argv.includes("--require-browser");
const KEEP = argv.includes("--keep");
let SITE = opt("--site");
if (SITE) { try { const u = new URL(SITE); if (!/^https?:$/.test(u.protocol)) throw 0; SITE = u.href.replace(/\/?$/, "/"); } catch { usage(`--site must be an http(s) URL`); } }

function usage(msg) { console.error(`✖ ${msg}\nRun: node tools/selftest.mjs --help`); process.exit(2); }
function printHelp() {
  const head = [];
  for (const l of readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
}

// ── Paths of the tools under test ────────────────────────────────────────────
const S = (skill, file) => `skills/${skill}/scripts/${file}`;
const T = {
  contrast: S("frontend-forge", "contrast.mjs"), palette: S("frontend-forge", "palette.mjs"), preset: S("frontend-forge", "preset.mjs"),
  novelty: S("frontend-forge", "novelty.mjs"), fonts: S("frontend-forge", "fonts.mjs"), icons: S("frontend-forge", "icons.mjs"),
  fetchUi: S("frontend-forge", "fetch-ui.mjs"), audit: S("frontend-forge", "audit.mjs"), screenshot: S("frontend-forge", "screenshot.mjs"),
  qa: S("ui-test", "qa.mjs"), wiring: S("ui-test", "wiring.mjs"), responsive: S("ui-test", "responsive.mjs"),
  vitals: S("ui-optimize", "vitals.mjs"), bundle: S("ui-optimize", "bundle.mjs"), probe: S("ui-debug", "probe.mjs"),
  mockApi: S("ui-integrate", "mock-api.mjs"), endpoints: S("ui-integrate", "endpoints.mjs"), extract: S("visual-dna", "extract-tokens.mjs"),
  usage: "hooks/usage-report.mjs", installer: "bin/vibeweave.mjs", validate: "tools/validate.mjs",
  check: "bin/check.mjs", doctor: "bin/doctor.mjs", stats: "bin/stats.mjs", seo: S("ui-test", "seo.mjs"), coverage: "tools/coverage.mjs",
};
const BROWSER_TOOLS = [["screenshot", T.screenshot, "report.json"], ["responsive", T.responsive, "responsive.json"], ["wiring", T.wiring, "wiring.json"],
  ["vitals", T.vitals, "vitals.json"], ["probe", T.probe, "probe.json"], ["extract-tokens", T.extract, null]];

// ── Fixture server ───────────────────────────────────────────────────────────
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml",
  ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain", ".ts": "text/plain", ".tsx": "text/plain", ".map": "application/json" };
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
/** Static server for tests/fixtures: directory → index.html (redirects to the trailing slash), extensionless paths
 *  fall back to <path>.json (fake APIs), unknown paths → 404 with 404.html, /__slow?ms=N answers after N ms. */
function serveFixtures(dir) {
  const timers = new Set();
  const notFound = (res, head) => { const body = readFileSync(join(dir, "404.html")); res.writeHead(404, { "content-type": TYPES[".html"], "content-length": body.length }); res.end(head ? undefined : body); };
  const server = createServer((req, res) => {
    try {
      const u = new URL(req.url || "/", "http://127.0.0.1");
      const head = req.method === "HEAD";
      if (u.pathname === "/__slow") {
        const ms = Math.min(60_000, Math.max(0, Number(u.searchParams.get("ms")) || 30_000));
        const t = setTimeout(() => { timers.delete(t); if (!res.destroyed) { res.writeHead(200, { "content-type": "image/gif", "cache-control": "no-store" }); res.end(GIF); } }, ms);
        timers.add(t);
        res.on("close", () => { clearTimeout(t); timers.delete(t); });
        return;
      }
      let rel; try { rel = decodeURIComponent(u.pathname); } catch { return notFound(res, head); }
      let file = resolve(dir, "." + rel);
      const r = relative(dir, file);
      if (r.startsWith("..") || isAbsolute(r)) return notFound(res, head);
      let st = statOf(file);
      if (st?.isDirectory()) {
        if (!u.pathname.endsWith("/")) { res.writeHead(301, { location: u.pathname + "/" + u.search }); return res.end(); }
        file = join(file, "index.html"); st = statOf(file);
      }
      if (!st && !extname(file) && statOf(file + ".json")?.isFile()) { file += ".json"; st = statOf(file); }
      if (!st?.isFile()) return notFound(res, head);
      const body = readFileSync(file);
      res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream", "content-length": body.length, "cache-control": "no-store" });
      res.end(head ? undefined : body);
    } catch (e) { if (!res.headersSent) { res.writeHead(500); res.end(String(e.message)); } }
  });
  return new Promise((done, fail) => {
    server.on("error", fail);
    server.listen(0, "127.0.0.1", () => done({
      base: `http://127.0.0.1:${server.address().port}`,
      stop: () => new Promise((r) => { for (const t of timers) clearTimeout(t); server.closeAllConnections?.(); server.close(() => r()); }),
    }));
  });
}
function statOf(p) { try { return statSync(p); } catch { return null; } }

// ── Child processes ──────────────────────────────────────────────────────────
const BASE_ENV = { ...process.env };
for (const k of ["VIBEWEAVE_USAGE", "VIBEWEAVE_HISTORY", "CLAUDE_CONFIG_DIR", "NO_COLOR", "FORCE_COLOR"]) delete BASE_ENV[k];
let browserEnv = {};   // NODE_PATH for the browser tools, set once Playwright is located
/** Run `node <script> ...args` with an argument array (never a shell), a timeout and captured output. */
function runNode(ctx, script, args = [], o = {}) {
  const file = isAbsolute(script) ? script : join(ROOT, script);
  const timeout = o.timeout ?? ctx.runTimeout;
  return new Promise((done) => {
    const t0 = performance.now();
    const child = execFile(process.execPath, [file, ...args.map(String)], {
      cwd: o.cwd || ctx.dir, env: { ...BASE_ENV, ...(ctx.browser ? browserEnv : {}), ...(o.env || {}) }, timeout, killSignal: "SIGTERM",
      maxBuffer: 64 * 1024 * 1024, windowsHide: true, encoding: "utf8",
    }, (err, stdout, stderr) => {
      ctx.children.delete(child);
      const timedOut = !!err?.killed && err.code == null;
      const code = timedOut ? "timeout" : err ? (typeof err.code === "number" ? err.code : 1) : 0;
      const r = { code, stdout: String(stdout), stderr: String(stderr), out: `${stdout}\n${stderr}`, ms: Math.round(performance.now() - t0) };
      ctx.log.push(`$ node ${relative(ROOT, file) || file} ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}\n  → exit ${code} in ${r.ms} ms\n${indent(r.stdout, "  | ")}${r.stderr.trim() ? `\n${indent(r.stderr, "  ! ")}` : ""}`);
      done(r);
    });
    ctx.children.add(child);
    child.stdin.on("error", () => {});
    child.stdin.end(o.input ?? "");
  });
}
const indent = (s, p) => s.trimEnd().split("\n").slice(0, 400).map((l) => p + l).join("\n");

// ── Assertions ───────────────────────────────────────────────────────────────
class Skip extends Error {}
const skip = (why) => { throw new Skip(why); };
function ok(cond, msg) { if (!cond) throw new Error(msg); }
function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`.slice(0, 600)); }
function code(r, want, what) { if (r.code !== want) throw new Error(`${what}: expected exit ${want}, got ${r.code} — ${(r.stderr.trim() || r.stdout.trim()).split("\n").slice(-3).join(" | ").slice(0, 300)}`); }
function has(text, needle, what) { const hit = needle instanceof RegExp ? needle.test(text) : text.includes(needle); if (!hit) throw new Error(`${what}: output lacks ${needle}`); }
function lacks(text, needle, what) { const hit = needle instanceof RegExp ? needle.test(text) : text.includes(needle); if (hit) throw new Error(`${what}: output unexpectedly contains ${needle}`); }
function parse(text, what) { try { return JSON.parse(text); } catch { throw new Error(`${what}: output is not JSON — ${text.slice(0, 200)}`); } }
const readJson = (p, what) => { ok(existsSync(p), `${what}: ${p} was not written`); return parse(readFileSync(p, "utf8"), what); };
const isPng = (p) => existsSync(p) && readFileSync(p).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
/** Every file and folder under dir (relative paths). */
function walk(dir) {
  const out = [];
  const rec = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); out.push(relative(dir, p).split(sep).join("/")); if (e.isDirectory() && !e.isSymbolicLink()) rec(p); } };
  if (existsSync(dir)) rec(dir);
  return out;
}
/** A port nothing listens on: bind 0, read the port, close. */
const closedPort = () => new Promise((done) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => done(port)); }); });

// ── Test registry ────────────────────────────────────────────────────────────
const tests = [];
/** test(name, fn) or test(name, { needs: "browser"|"network"|"site", exclusive, timeout }, fn). Name = "<tool>: <what>". */
function test(name, o, fn) { if (typeof o === "function") { fn = o; o = {}; } tests.push({ name, tool: name.split(":")[0].trim(), needs: o.needs || "offline", exclusive: !!o.exclusive, timeout: o.timeout, fn }); }

// contrast ───────────────────────────────────────────────────────────────────
test("contrast: WCAG verdicts and APCA", async (c) => {
  const r = await c.run(T.contrast, ["#111827", "#ffffff", "#b8b8b8", "#ffffff"]);
  code(r, 0, "two pairs");
  has(r.stdout, "#111827 on #ffffff  →  17.74:1", "dark on white ratio");
  has(r.stdout, "#b8b8b8 on #ffffff  →  1.98:1", "light grey ratio");
  const lines = r.stdout.split("\n").filter((l) => l.includes("AA text"));
  ok(/AA text PASS/.test(lines[0]) && /AA text fail/.test(lines[1]), "AA text verdicts must be PASS then fail");
  const j = parse((await c.run(T.contrast, ["oklch(0.98 0 0)", "rgb(17 24 39)", "#777", "#fff", "--json"])).stdout, "--json");
  eq(j.length, 2, "json rows");
  ok(j[0].aaText && j[0].aaaText && j[0].apcaLc < 0, "light on dark: AA+AAA, negative APCA");
  ok(!j[1].aaText && j[1].aaLarge && j[1].ratio === 4.48, `#777 on #fff is 4.48:1 (large text only), got ${j[1].ratio}`);
});
test("contrast: bad input is rejected", async (c) => {
  const bad = await c.run(T.contrast, ["notacolor", "#fff"]);
  code(bad, 1, "unparseable color"); has(bad.stdout, "Unsupported color format", "error text");
  code(await c.run(T.contrast, ["#fff"]), 2, "odd number of colors");
  code(await c.run(T.contrast, []), 2, "no colors");
});

// palette ────────────────────────────────────────────────────────────────────
test("palette: 11-step scales with neutrals", async (c) => {
  const r = await c.run(T.palette, ["#0e7c86", "--neutral", "--format", "json"]);
  code(r, 0, "json palette");
  const j = parse(r.stdout, "palette json");
  for (const k of ["brand", "neutral"]) {
    eq(j[k].map((s) => s.step), [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950], `${k} steps`);
    ok(j[k].every((s) => /^#[0-9a-f]{6}$/.test(s.hex) && /^oklch\(/.test(s.oklch)), `${k}: hex + oklch per step`);
    const L = j[k].map((s) => parseFloat(s.oklch.slice(6)));
    ok(L.every((l, i) => i === 0 || l < L[i - 1]), `${k}: lightness must fall step by step`);
  }
  const tw = await c.run(T.palette, ["oklch(0.62 0.19 255)", "--format", "tailwind", "--name", "My Brand!"]);
  code(tw, 0, "tailwind"); has(tw.stdout, "--color-my-brand-500:", "sanitized name"); has(tw.stdout, "@theme {", "theme block");
  const css = await c.run(T.palette, ["#0f766e"]);
  has(css.stdout, "@supports (color: oklch(0 0 0))", "css fallback block"); has(css.stdout, "First step with ≥4.5:1 on white", "contrast notes");
});
test("palette: bad input is rejected", async (c) => {
  code(await c.run(T.palette, ["nope"]), 2, "bad color");
  code(await c.run(T.palette, ["#0e7c86", "--format", "xml"]), 2, "bad format");
  code(await c.run(T.palette, []), 2, "no color");
  const h = await c.run(T.palette, ["--help"]); code(h, 0, "--help"); has(h.stdout, "Usage:", "help text");
});

// preset ─────────────────────────────────────────────────────────────────────
test("preset: every preset passes WCAG AA", async (c) => {
  const r = await c.run(T.preset, ["check"]);
  code(r, 0, "check"); has(r.stdout, /✔ \d+ presets × 2 modes pass WCAG AA/, "check verdict");
});
test("preset: list, show and apply in every format", async (c) => {
  const list = await c.run(T.preset, ["list"]); code(list, 0, "list");
  const n = Number(list.stdout.match(/(\d+) preset\(s\)/)?.[1]); ok(n >= 20, `list shows the presets (got ${n})`);
  const f = await c.run(T.preset, ["list", "--for", "restaurant"]); ok(Number(f.stdout.match(/(\d+) preset\(s\)/)?.[1]) < n, "--for filters");
  const show = await c.run(T.preset, ["show", "swiss-signal"]); code(show, 0, "show"); has(show.stdout, "install fonts: npm i @fontsource", "font install line");
  for (const [format, needle] of [["css", ":root[data-theme=\"dark\"]"], ["tailwind", "@theme inline"], ["shadcn", "--primary-foreground"], ["design", "# DESIGN.md"]]) {
    const a = await c.run(T.preset, ["apply", "swiss-signal", "--format", format]); code(a, 0, `apply ${format}`); has(a.stdout, needle, `apply ${format}`);
  }
  const j = parse((await c.run(T.preset, ["apply", "swiss-signal", "--format", "json"])).stdout, "dtcg json");
  ok(j.color?.light?.accent?.$value && j.font?.display?.$type === "fontFamily", "DTCG tokens");
  const out = join(c.dir, "nested", "tokens.css");
  code(await c.run(T.preset, ["apply", "swiss-signal", "--out", out]), 0, "apply --out");
  ok(readFileSync(out, "utf8").includes("--ease-spring: linear("), "--out file has the spring easing");
});
test("preset: bad input is rejected", async (c) => {
  code(await c.run(T.preset, ["apply", "no-such-preset"]), 2, "unknown preset");
  code(await c.run(T.preset, ["apply", "swiss-signal", "--format", "xml"]), 2, "unknown format");
  code(await c.run(T.preset, ["frobnicate"]), 2, "unknown command");
  code(await c.run(T.preset, []), 2, "no command");
});

// novelty ────────────────────────────────────────────────────────────────────
test("novelty: ideas are brief-seeded and reproducible", async (c) => {
  const env = { VIBEWEAVE_HISTORY: join(c.dir, "history.jsonl") };
  const a = await c.run(T.novelty, ["ideas", "pottery studio booking", "--count", "2"], { env });
  code(a, 0, "ideas"); has(a.stdout, "A. Concept metaphor:", "first seed"); has(a.stdout, "B. Concept metaphor:", "second seed"); lacks(a.stdout, "C. Concept", "--count 2");
  const b = await c.run(T.novelty, ["ideas", "pottery studio booking", "--count", "2"], { env });
  eq(b.stdout, a.stdout, "same brief, same day, same history → same seeds");
  const other = await c.run(T.novelty, ["ideas", "fintech dashboard for nurses", "--count", "2"], { env });
  ok(other.stdout.split("\n").slice(3).join("\n") !== a.stdout.split("\n").slice(3).join("\n"), "a different brief gives different seeds");
  code(await c.run(T.novelty, ["ideas", "x", "--count", "99"], { env }), 0, "count is clamped, not an error");
});
test("novelty: check, record and history", async (c) => {
  const env = { VIBEWEAVE_HISTORY: join(c.dir, "history.jsonl") };
  const tokens = join(c.dir, "swiss.css");
  code(await c.run(T.preset, ["apply", "swiss-signal", "--out", tokens]), 0, "preset tokens");
  const close = await c.run(T.novelty, ["check", tokens], { env });
  code(close, 0, "check without --strict"); has(close.stdout, 'TOO CLOSE to preset "swiss-signal"', "preset copy is flagged");
  code(await c.run(T.novelty, ["check", tokens, "--strict"], { env }), 1, "--strict on a copy");
  const original = join(FIXTURES, "tokens", "original.css");
  const fresh = await c.run(T.novelty, ["check", original, "--strict"], { env });
  code(fresh, 0, "original tokens"); has(fresh.stdout, "✔ ORIGINAL", "original verdict");
  writeFileSync(env.VIBEWEAVE_HISTORY, "this line is corrupt\n[1,2]\n");
  code(await c.run(T.novelty, ["record", original, "--name", "Fixture Studio"], { env }), 0, "record");
  const hist = await c.run(T.novelty, ["history"], { env }); code(hist, 0, "history"); has(hist.stdout, "Fixture Studio", "recorded project listed");
  const again = await c.run(T.novelty, ["check", original], { env });
  has(again.stdout, 'TOO CLOSE to your past project "Fixture Studio"', "past projects count as prior art");
});
test("novelty: bad input is rejected", async (c) => {
  code(await c.run(T.novelty, ["check", join(c.dir, "missing.css")]), 2, "missing file");
  code(await c.run(T.novelty, ["check"]), 2, "no files");
  code(await c.run(T.novelty, ["frobnicate"]), 2, "unknown command");
});

// audit ──────────────────────────────────────────────────────────────────────
test("audit: finds the planted issues in the buggy fixture", async (c) => {
  const r = await c.run(T.audit, [join(FIXTURES, "buggy"), "--json"]);
  code(r, 0, "audit buggy");
  const rules = new Set(parse(r.stdout, "audit json").findings.map((f) => f.rule));
  for (const rule of ["img-alt", "zoom-disabled"]) ok(rules.has(rule), `expected rule ${rule}, got ${[...rules].join(", ")}`);
  code(await c.run(T.audit, [join(FIXTURES, "buggy"), "--strict"]), 1, "--strict with errors");
});
test("audit: quiet on the clean fixture", async (c) => {
  const r = await c.run(T.audit, [join(FIXTURES, "clean"), "--json"]);
  code(r, 0, "audit clean");
  const j = parse(r.stdout, "audit json");
  const loud = j.findings.filter((f) => f.sev !== "info");
  eq(loud.map((f) => `${f.rule} ${f.file}:${f.line}`), [], "no errors or warnings on the clean fixture");
  ok(j.filesScanned >= 2, "scanned the fixture files");
  code(await c.run(T.audit, [join(FIXTURES, "clean"), "--strict"]), 0, "--strict without errors");
  code(await c.run(T.audit, [join(c.dir, "missing")]), 2, "missing path");
});
test("audit: commented-out markup is ignored, line numbers stay exact", async (c) => {
  const p = join(c.dir, "site"); mkdirSync(p);
  writeFileSync(join(p, "index.html"), `<!doctype html>\n<!-- old shell:\n<html>\n<img src="a.png">\n-->\n<html lang="en"><body>\n<img src="b.png">\n</body></html>\n`);
  const j = parse((await c.run(T.audit, [p, "--json"])).stdout, "audit json");
  eq(j.findings.filter((f) => f.sev !== "info").map((f) => `${f.rule}:${f.line}`), ["img-alt:7"], "only the live <img> on line 7");
});

// bundle ─────────────────────────────────────────────────────────────────────
test("bundle: fixture dist totals and flags", async (c) => {
  const r = await c.run(T.bundle, [join(FIXTURES, "dist"), "--json"]);
  code(r, 0, "bundle");
  const j = parse(r.stdout, "bundle json");
  eq([j.totals.js?.files, j.totals.css?.files, j.totals.font?.files, j.totals.sourcemap?.files], [1, 1, 2, 1], "file counts by kind");
  ok(j.totals.js.gz > 0 && j.totals.js.br > 0, "compressed sizes");
  ok(j.flags.some((f) => /1 non-WOFF2 font file/.test(f.msg)), "legacy font flag");
  ok(j.flags.some((f) => /source map/.test(f.msg)), "source map flag");
  ok(!j.flags.some((f) => f.sev === "error"), "no error flags on the small fixture");
  const text = await c.run(T.bundle, [join(FIXTURES, "dist")]); has(text.stdout, "LARGEST", "text report");
});
test("bundle: heavy chunk, library detection and --strict", async (c) => {
  const dist = join(c.dir, "dist");
  cpSync(join(FIXTURES, "dist"), dist, { recursive: true });
  // ~260 KB of incompressible text + a GSAP signature → > 150 KB gzip (an "error") and a library hint.
  writeFileSync(join(dist, "assets", "vendor-9c1d.js"), `gsap.registerPlugin(ScrollTrigger);\nconst blob = "${randomBytes(195_000).toString("base64")}";\n`);
  const r = await c.run(T.bundle, [dist, "--json", "--strict"]);
  code(r, 1, "--strict with an oversized chunk");
  const j = parse(r.stdout, "bundle json");
  ok(j.flags.some((f) => f.sev === "error" && f.file === "assets/vendor-9c1d.js"), "oversized chunk is an error");
  ok(j.flags.some((f) => f.sev === "info" && f.msg.startsWith("gsap")), "gsap detected");
  eq(j.largest[0].file, "assets/vendor-9c1d.js", "largest file first");
  const auto = await c.run(T.bundle, [], { cwd: c.dir }); code(auto, 0, "auto-detect dist/"); has(auto.stdout, "Build output: dist", "auto-detected folder");
  code(await c.run(T.bundle, [join(c.dir, "nope")]), 2, "missing folder");
  code(await c.run(T.bundle, [], { cwd: join(c.dir, "dist", "img") }), 2, "nothing to detect");
});

// endpoints ──────────────────────────────────────────────────────────────────
test("endpoints: inventory of the fixture app", async (c) => {
  const r = await c.run(T.endpoints, [join(FIXTURES, "app-src"), "--json"]);
  code(r, 0, "endpoints");
  const j = parse(r.stdout, "endpoints json");
  const keys = j.endpoints.map((e) => `${e.method} ${e.path}`);
  for (const k of ["GET /api/studios", "GET /studios/:id", "POST /api/bookings", "DELETE /api/bookings/:bookingId", "GET /api/search", "GET /api/health"]) ok(keys.includes(k), `expected ${k} in ${keys.join(", ")}`);
  ok(!keys.some((k) => k.includes("only-in-tests")), "test files are skipped");
  ok(j.endpoints.find((e) => e.path === "/api/health").local, "the local route is matched");
  ok(j.endpoints.find((e) => e.method === "POST").sendsBody, "POST sends a body");
  ok(j.localRoutes.some((l) => l.path === "/api/health" && l.methods.includes("GET")), "local route listed");
  eq(j.serverActions.map((a) => a.name), ["saveDraft"], "server actions");
  ok(j.baseUrlEnv.includes("VITE_API_URL"), "base URL env var");
});
test("endpoints: contract, mocks-out, mocks compare and output confinement", async (c) => {
  const src = join(FIXTURES, "app-src");
  const r = await c.run(T.endpoints, [src, "--contract", "API-CONTRACT.md", "--mocks-out", "mocks/mocks.json"]);
  code(r, 0, "write files");
  ok(readFileSync(join(c.dir, "API-CONTRACT.md"), "utf8").includes("## POST /api/bookings"), "contract section");
  const mocks = readJson(join(c.dir, "mocks", "mocks.json"), "mocks-out");
  ok(mocks.routes["GET /api/studios"] && mocks.routes["DELETE /api/bookings/:bookingId"].status === 204, "generated routes");
  const cmp = await c.run(T.endpoints, [src, "--mocks", "mocks/mocks.json"]);
  has(cmp.stdout, "✓ every endpoint used has a mock", "compare");
  code(await c.run(T.endpoints, [src, "--contract", join(c.dir, "..", "escape.md")]), 2, "--contract outside the current folder");
  ok(!existsSync(join(c.dir, "..", "escape.md")), "nothing written outside");
  code(await c.run(T.endpoints, [join(c.dir, "missing")]), 2, "missing path");
});

// mock-api ───────────────────────────────────────────────────────────────────
/** Start mock-api on a random port; resolves with { url, stop }. */
function startMock(c, args) {
  return new Promise((done, fail) => {
    const child = execFile(process.execPath, [join(ROOT, T.mockApi), ...args, "--port", "0"], { cwd: c.dir, env: BASE_ENV, windowsHide: true, encoding: "utf8" });
    c.children.add(child);
    let out = "";
    const timer = setTimeout(() => fail(new Error(`mock-api did not start: ${out}`)), 60_000);
    child.stdout.on("data", (d) => {
      out += d;
      const m = out.match(/Mock API on (http:\/\/localhost:(\d+))/);
      if (m) { clearTimeout(timer); done({ url: `http://127.0.0.1:${m[2]}`, port: Number(m[2]), out: () => out,
        // Never wait forever: a mock that already exited resolves at once (its output goes to the test log).
        stop: () => new Promise((r) => { if (child.exitCode !== null || child.signalCode !== null) return r(); const t = setTimeout(r, 10_000); child.once("exit", () => { clearTimeout(t); r(); }); child.kill(); }) }); }
    });
    child.stderr.on("data", (d) => (out += d));
    child.once("exit", (ec) => { clearTimeout(timer); c.children.delete(child); c.log.push(`mock-api exited (${ec}):
${out}`); fail(new Error(`mock-api exited (${ec}): ${out}`)); });
  });
}
const req = (url, o = {}) => fetch(url, { ...o, signal: AbortSignal.timeout(30_000) });
/** A raw request whose declared body is too big; resolves with the status the server answers. */
function oversized(url) {
  return new Promise((done, fail) => {
    const r = httpRequest(url, { method: "POST", headers: { "content-type": "application/json", "content-length": String(2 * 1024 * 1024) } }, (res) => { res.resume(); done(res.statusCode); });
    let answered = false;
    r.on("response", () => { answered = true; });
    // After the answer, a reset/EPIPE on the rest of the upload is expected; before it, it means the 413 was lost.
    r.on("error", (e) => { if (!answered) fail(new Error(`connection ${e.code || e.message} before the 413 arrived`)); });
    r.setTimeout(30_000, () => { r.destroy(); fail(new Error("no answer to an oversized body")); });
    r.write(Buffer.alloc(64 * 1024, 32));
  });
}
test("mock-api: REST, validation, limits, CORS and prototype keys", async (c) => {
  const m = await startMock(c, ["--quiet"]);
  try {
    const list = await req(`${m.url}/api/studios`);
    eq(list.status, 200, "GET list"); ok((await list.json()).some((s) => s.name === "Clay Corner"), "starter data"); eq(list.headers.get("x-total-count"), "2", "X-Total-Count");
    const page = await req(`${m.url}/api/studios?_sort=rating&_order=desc&_page=1&_limit=1`);
    eq((await page.json()).map((s) => s.name), ["Clay Corner"], "sort + paginate");
    const invalid = await req(`${m.url}/api/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    eq(invalid.status, 422, "missing required fields"); eq(invalid.headers.get("content-type"), "application/problem+json", "problem details");
    eq((await invalid.json()).errors.map((e) => e.field).sort(), ["date", "email", "studioId"], "field errors");
    const created = await req(`${m.url}/api/bookings`, { method: "POST", headers: { "content-type": "application/json" },
      body: '{"studioId":1,"date":"2026-12-01","email":"ana@example.com","__proto__":{"polluted":true},"constructor":{"prototype":{"x":1}}}' });
    eq(created.status, 201, "valid POST"); ok(created.headers.get("location")?.endsWith("/api/bookings/1"), "Location header");
    const row = await created.json();
    ok(!Object.hasOwn(row, "__proto__") && !Object.hasOwn(row, "constructor") && row.polluted === undefined, "prototype keys dropped");
    eq((await (await req(`${m.url}/api/bookings/1`)).json()).email, "ana@example.com", "GET by id");
    eq((await req(`${m.url}/api/bookings/1`, { method: "PATCH", headers: { "content-type": "application/json" }, body: '{"date":"2026-12-02"}' })).status, 200, "PATCH");
    eq((await req(`${m.url}/api/bookings/1`, { method: "DELETE" })).status, 204, "DELETE");
    eq((await req(`${m.url}/api/bookings/1`)).status, 404, "deleted row is gone");
    const missing = await req(`${m.url}/api/nothing-here`); eq(missing.status, 404, "unknown path"); has((await missing.json()).title, "No mock for GET", "404 title");
    eq(await oversized(`${m.url}/api/bookings`), 413, "body over 1 MB");
    eq(await Promise.all(Array.from({ length: 5 }, () => oversized(`${m.url}/api/bookings`))), [413, 413, 413, 413, 413], "five oversized uploads at once all get their 413 (no connection reset)");
    eq((await req(`${m.url}/api/bookings`, { method: "POST", headers: { "content-type": "application/json" }, body: "{oops" })).status, 400, "malformed JSON");
    const local = await req(`${m.url}/api/studios`, { method: "OPTIONS", headers: { origin: "http://localhost:5173", "access-control-request-method": "POST" } });
    eq([local.status, local.headers.get("access-control-allow-origin"), local.headers.get("access-control-allow-credentials")], [204, "http://localhost:5173", "true"], "CORS for a local origin");
    const foreign = await req(`${m.url}/api/studios`, { headers: { origin: "https://evil.example" } });
    eq([foreign.headers.get("access-control-allow-origin"), foreign.headers.get("access-control-allow-credentials")], ["*", null], "no credentials for other origins");
    eq(await (await req(`${m.url}/api/studios`, { headers: { "x-mock-scenario": "empty" } })).json(), [], "empty scenario");
    eq((await req(`${m.url}/api/studios?__scenario=error`)).status, 500, "error scenario");
    const login = await req(`${m.url}/api/login`, { method: "POST", headers: { "content-type": "application/json" }, body: '{"email":"a@b.co","password":"wrong"}' });
    eq(login.status, 401, "route variant chosen by body");
    eq((await (await req(`${m.url}/api/studios/7/availability`)).json()).studioId, "7", "route params template");
    eq((await req(`${m.url}/api/%E0%A4%A`)).status, 400, "malformed URL encoding");
    eq((await (await req(`${m.url}/__mock`)).json()).collections.studios, 2, "inspect endpoint");
    const v6 = await fetch(`http://[::1]:${m.port}/api/studios`, { signal: AbortSignal.timeout(3000) }).then((r) => r.status, () => "no-ipv6");
    ok(v6 === 200 || v6 === "no-ipv6", `IPv6 loopback serves the same port (got ${v6})`);
  } finally { await m.stop(); }
});
test("mock-api: serves the mocks endpoints.mjs generated", async (c) => {
  code(await c.run(T.endpoints, [join(FIXTURES, "app-src"), "--mocks-out", "mocks.json"]), 0, "generate mocks");
  const m = await startMock(c, ["mocks.json", "--quiet"]);
  try {
    eq((await req(`${m.url}/api/studios`)).status, 200, "generated list route");
    eq((await req(`${m.url}/api/bookings/5`, { method: "DELETE" })).status, 204, "generated DELETE route");
    eq((await (await req(`${m.url}/studios/42`)).json()).id, "42", "params template");
  } finally { await m.stop(); }
});
test("mock-api: --init and bad flags", async (c) => {
  const init = await c.run(T.mockApi, ["--init"]); code(init, 0, "--init"); ok(readJson(join(c.dir, "mocks.json"), "--init").collections.studios, "starter file");
  code(await c.run(T.mockApi, ["--init"]), 2, "--init never overwrites");
  code(await c.run(T.mockApi, ["--port", "abc"]), 2, "bad --port");
  code(await c.run(T.mockApi, ["--port", "70000"]), 2, "out-of-range --port");
  writeFileSync(join(c.dir, "broken.json"), "{ not json");
  code(await c.run(T.mockApi, ["broken.json"]), 2, "unreadable mocks file");
  writeFileSync(join(c.dir, "badcol.json"), '{"collections":{"x":{}}}');
  code(await c.run(T.mockApi, ["badcol.json"]), 2, "collection that is not an array");
});

// usage-report ───────────────────────────────────────────────────────────────
/** A synthetic Claude Code project: transcript with duplicate message ids, a tool result, a corrupt line and a subagent. */
function fakeClaude(c) {
  const config = join(c.dir, "claude-config"), project = join(c.dir, "project");
  mkdirSync(project, { recursive: true });
  const key = realpathSync.native(project).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const dir = join(config, "projects", key);
  mkdirSync(join(dir, "s1", "subagents"), { recursive: true });
  const at = (s) => `2026-11-10T10:${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}.000Z`;
  const asst = (s, id, i, cr, cw, o, extra = {}) => JSON.stringify({ type: "assistant", timestamp: at(s), ...extra, message: { id, usage: { input_tokens: i, cache_read_input_tokens: cr, cache_creation_input_tokens: cw, output_tokens: o } } });
  writeFileSync(join(dir, "s1.jsonl"), [
    JSON.stringify({ type: "user", timestamp: at(0), message: { role: "user", content: "Build the landing page" } }),
    asst(5, "msg_1", 100, 1000, 200, 50), asst(5, "msg_1", 100, 1000, 200, 50),
    JSON.stringify({ type: "user", timestamp: at(6), message: { content: [{ type: "tool_result", content: "ok" }] } }),
    asst(10, "msg_2", 10, 1200, 0, 300), '{"type":"assistant", broken',
    JSON.stringify({ type: "user", timestamp: at(60), message: { content: [{ type: "text", text: "Now make it faster" }] } }),
    asst(80, "msg_3", 20, 2000, 100, 400), asst(125, "msg_4", 5, 2100, 0, 100),
  ].join("\n") + "\n");
  writeFileSync(join(dir, "s1", "subagents", "agent-a1.jsonl"), [asst(30, "sub_0", 1000, 0, 0, 1000, { isSidechain: true }), asst(90, "sub_1", 50, 500, 125, 80, { isSidechain: true })].join("\n") + "\n");
  return { config, project, transcript: join(dir, "s1.jsonl") };
}
const RUN_LINE = "Vibeweave · run 1m 05s · input 4.9k (new 300, cached 4.6k) · output 580 · 3 calls · 1 subagent";
const SESSION_LINE = "Session · 2m 05s · input 8.4k · output 1.9k";
test("usage-report: --last on a synthetic transcript", async (c) => {
  const f = fakeClaude(c);
  const r = await c.run(T.usage, ["--last", f.project], { env: { CLAUDE_CONFIG_DIR: f.config } });
  code(r, 0, "--last"); eq(r.stdout.trim().split("\n"), [RUN_LINE, SESSION_LINE], "report lines");
  const viaInstaller = await c.run(T.installer, ["usage", f.project], { env: { CLAUDE_CONFIG_DIR: f.config } });
  code(viaInstaller, 0, "npx vibeweave usage"); eq(viaInstaller.stdout.trim().split("\n"), [RUN_LINE, SESSION_LINE], "same via the installer");
  const none = await c.run(T.usage, ["--last", c.dir], { env: { CLAUDE_CONFIG_DIR: f.config } });
  code(none, 1, "no session for that folder"); has(none.stderr, "No Claude Code session found", "message");
});
test("usage-report: Stop-hook mode, quiet/off and bad input", async (c) => {
  const f = fakeClaude(c);
  const input = JSON.stringify({ transcript_path: f.transcript, cwd: f.project, session_id: "s1" });
  const log = join(f.project, ".vibeweave", "usage.jsonl");
  const r = await c.run(T.usage, [], { input });
  code(r, 0, "hook"); const msg = parse(r.stdout, "hook output").systemMessage;
  ok(msg.startsWith("Vibeweave · run ") && msg.includes("· output 580 · 3 calls · 1 subagent") && msg.endsWith("input 8.4k · output 1.9k"), `hook message: ${msg}`);
  const rows = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  eq([rows.length, rows[0].run.output, rows[0].subagents, rows[0].session], [1, 580, 1, "s1"], "usage.jsonl row");
  const quiet = await c.run(T.usage, [], { input, env: { VIBEWEAVE_USAGE: "quiet" } });
  eq([quiet.code, quiet.stdout], [0, ""], "quiet prints nothing"); eq(readFileSync(log, "utf8").trim().split("\n").length, 2, "quiet still logs");
  const off = await c.run(T.usage, [], { input, env: { VIBEWEAVE_USAGE: "off" } });
  eq([off.code, off.stdout], [0, ""], "off"); eq(readFileSync(log, "utf8").trim().split("\n").length, 2, "off does not log");
  for (const bad of ["not json", '{"transcript_path":"/nonexistent/x.jsonl"}', '{"transcript_path":42}', ""]) {
    const b = await c.run(T.usage, [], { input: bad }); eq([b.code, b.stdout], [0, ""], `never breaks the session (${bad || "empty"})`);
  }
});

// vibeweave installer ────────────────────────────────────────────────────────
const install = (c, args, o = {}) => c.run(T.installer, args, { cwd: c.dir, ...o });
test("vibeweave: --list and --help", async (c) => {
  const l = await install(c, ["--list"]); code(l, 0, "--list"); for (const ide of ["claude", "cursor", "copilot", "codex", "gemini", "kiro"]) has(l.stdout, `\n${ide}`, "--list");
  const h = await install(c, ["--help"]); code(h, 0, "--help"); has(h.stdout, "npx vibeweave --agent cursor,copilot", "help text");
});
test("vibeweave: --agent all installs, --uninstall leaves nothing", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(p);
  code(await install(c, ["--agent", "all", "--project", p]), 0, "install");
  for (const f of [".agents/skills/vibeweave/SKILL.md", ".claude/skills/ui-test/scripts/qa.mjs", ".claude/agents/qa-tester.md", ".codex/agents/qa-tester.toml",
    ".github/agents/qa-tester.agent.md", ".cursor/rules/vibeweave.mdc", ".kiro/steering/vibeweave.md", ".gemini/commands/vibeweave.toml", ".claude/hooks/vibeweave-usage.mjs"])
    ok(existsSync(join(p, f)), `installed ${f}`);
  ok(readFileSync(join(p, "AGENTS.md"), "utf8").includes("vibeweave:start"), "AGENTS.md block");
  ok(readJson(join(p, ".claude", "settings.local.json"), "settings").hooks.Stop.length === 1, "usage hook registered");
  code(await install(c, ["--agent", "all", "--project", p]), 0, "re-install over itself");
  eq(readJson(join(p, ".claude", "settings.local.json"), "settings").hooks.Stop.length, 1, "hook not duplicated");
  code(await install(c, ["--agent", "all", "--project", p, "--uninstall"]), 0, "uninstall");
  eq(walk(p), [], "nothing left after --uninstall");
});
test("vibeweave: keeps files it didn't create", async (c) => {
  const p = join(c.dir, "app");
  mkdirSync(join(p, ".claude", "agents"), { recursive: true }); mkdirSync(join(p, ".github", "workflows"), { recursive: true });
  writeFileSync(join(p, "AGENTS.md"), "# Team rules\nUse tabs.\n");
  writeFileSync(join(p, ".claude", "agents", "qa-tester.md"), "---\nname: qa-tester\ndescription: ours\n---\nOur own agent.\n");
  writeFileSync(join(p, ".claude", "settings.local.json"), '{\n  "permissions": { "allow": ["Bash(npm test)"] }\n}\n');
  writeFileSync(join(p, ".github", "workflows", "ci.yml"), "name: ci\n");
  const before = walk(p);
  const r = await install(c, ["--agent", "claude,codex", "--project", p]);
  code(r, 0, "install"); has(r.stdout, "▲ kept", "user file reported as kept");
  eq(readFileSync(join(p, ".claude", "agents", "qa-tester.md"), "utf8").includes("Our own agent."), true, "user agent untouched");
  code(await install(c, ["--agent", "claude,codex", "--project", p, "--uninstall"]), 0, "uninstall");
  eq(walk(p), before, "exactly the user's files remain");
  eq(readFileSync(join(p, "AGENTS.md"), "utf8"), "# Team rules\nUse tabs.\n", "AGENTS.md restored");
  eq(readJson(join(p, ".claude", "settings.local.json"), "settings"), { permissions: { allow: ["Bash(npm test)"] } }, "settings restored");
});
test("vibeweave: --dry-run writes nothing", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(p);
  const r = await install(c, ["--agent", "all", "--project", p, "--dry-run"]);
  code(r, 0, "dry run"); has(r.stdout, "would place", "dry-run wording"); has(r.stdout, "Dry run — nothing written.", "summary");
  eq(walk(p), [], "no files");
  const inRepo = await c.run(T.installer, ["--dry-run"], { cwd: ROOT });
  code(inRepo, 2, "refuses to install into its own repo"); has(inRepo.stderr, "inside the Vibeweave repo", "message");
});
test("vibeweave: --link then --uninstall keeps the sources", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(p);
  code(await install(c, ["--agent", "claude", "--skills", "vibeweave,ui-test", "--link", "--no-usage", "--project", p]), 0, "linked install");
  ok(existsSync(join(p, ".claude", "skills", "ui-test", "scripts", "wiring.mjs")), "link resolves");
  code(await install(c, ["--agent", "claude", "--skills", "vibeweave,ui-test", "--project", p, "--uninstall"]), 0, "uninstall");
  ok(existsSync(join(ROOT, "skills", "ui-test", "scripts", "wiring.mjs")) && existsSync(join(ROOT, "skills", "vibeweave", "SKILL.md")), "repo sources still there");
  eq(walk(p), [], "nothing left");
});
test("vibeweave: --global into a temporary home", async (c) => {
  const home = join(c.dir, "home"); mkdirSync(home);
  const env = { HOME: home, USERPROFILE: home };
  code(await install(c, ["--global", "--agent", "claude,cursor", "--skills", "vibeweave"], { env }), 0, "global install");
  ok(existsSync(join(home, ".claude", "skills", "vibeweave", "SKILL.md")) && existsSync(join(home, ".cursor", "skills", "vibeweave", "SKILL.md")), "global skills");
  ok(readJson(join(home, ".claude", "settings.json"), "global settings").hooks.Stop.length === 1, "global usage hook");
  code(await install(c, ["--global", "--agent", "claude,cursor", "--skills", "vibeweave", "--uninstall"], { env }), 0, "global uninstall");
  eq(walk(home), [], "home left clean");
});
test("vibeweave: bad flags are rejected", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(p);
  for (const [args, why] of [[["--agent", "nope"], "unknown IDE"], [["--skills", "nope"], "unknown skill"], [["--project", join(c.dir, "missing")], "missing project"],
    [["--agnet", "cursor"], "misspelt flag"], [["--agent"], "flag without a value"], [["install"], "stray argument"], [["--project"], "--project without a value"]]) {
    const r = await install(c, [...args, ...(args.includes("--project") ? [] : ["--project", p])]);
    code(r, 2, why);
  }
  eq(walk(p), [], "nothing written by rejected runs");
});

// fonts / icons / fetch-ui (offline parts always run; live APIs only with --network) ─────────────
test("fonts: input validation (offline)", async (c) => {
  const bad = await c.run(T.fonts, ["info", "Bad Id!"]); code(bad, 2, "invalid id"); has(bad.stderr, "invalid font id", "message");
  code(await c.run(T.fonts, ["frobnicate"]), 2, "unknown command");
  code(await c.run(T.fonts, ["info"]), 2, "missing id");
  code(await c.run(T.fonts, []), 2, "no command");
  const h = await c.run(T.fonts, ["search", "--help"]); code(h, 0, "--help"); has(h.stdout, "Usage:", "help");
});
test("icons: input validation (offline)", async (c) => {
  for (const [args, why] of [[["get", "Bad:Id"], "bad id"], [["get", "lucide:x", "--format", "png"], "bad format"], [["get", "lucide:x", "--size", '"><script>'], "attribute injection"],
    [["search"], "no query"], [["frobnicate"], "unknown command"], [["sets", "--api", "http://example.com"], "plain-http mirror"]]) code(await c.run(T.icons, args), 2, why);
  code(await c.run(T.icons, []), 2, "no command");
});
test("icons: get, search and sets against a local mirror", async (c) => {
  const api = ["--api", `${c.base}/iconify`];
  const out = join(c.dir, "icons");
  const r = await c.run(T.icons, ["get", "tst:star", "tst:heart", "tst:star-flipped", "--format", "react", "--stroke", "1.75", "--out", out, ...api]);
  code(r, 0, "get react");
  for (const f of ["StarIcon.tsx", "HeartIcon.tsx", "StarFlippedIcon.tsx", "index.ts", "ICONS.md"]) ok(existsSync(join(out, f)), `wrote ${f}`);
  const star = readFileSync(join(out, "StarIcon.tsx"), "utf8");
  ok(star.includes('strokeWidth="1.75"') && star.includes('strokeLinejoin="round"') && !star.includes("stroke-width"), "JSX attributes + --stroke");
  ok(readFileSync(join(out, "StarFlippedIcon.tsx"), "utf8").includes("scale(-1 1)"), "alias flip applied");
  has(readFileSync(join(out, "ICONS.md"), "utf8"), "| `tst:heart` | Fixture Line | MIT |", "license manifest");
  const evil = await c.run(T.icons, ["get", "tst:evil", "tst:braces", "tst:nope", "--format", "react", "--out", join(c.dir, "evil"), ...api]);
  code(evil, 1, "unsafe / missing icons"); has(evil.stderr, "refused", "unsafe markup refused"); has(evil.stderr, "not found: tst:nope", "missing icon");
  ok(!existsSync(join(c.dir, "evil", "EvilIcon.tsx")) && !existsSync(join(c.dir, "evil", "BracesIcon.tsx")), "refused icons not written");
  const svg = await c.run(T.icons, ["get", "tst:braces", "--format", "svg", "--out", join(c.dir, "svg"), ...api]); code(svg, 0, "braces are fine in plain SVG");
  const sprite = join(c.dir, "sprite");
  code(await c.run(T.icons, ["get", "tst:star", "--format", "sprite", "--out", sprite, ...api]), 0, "sprite 1");
  code(await c.run(T.icons, ["get", "tst:heart", "--format", "sprite", "--out", sprite, ...api]), 0, "sprite 2");
  const sp = readFileSync(join(sprite, "sprite.svg"), "utf8"); ok(sp.includes('id="star"') && sp.includes('id="heart"'), "sprite merges runs");
  const dry = await c.run(T.icons, ["get", "tst:star", "--dry", "--out", join(c.dir, "dry"), ...api]); code(dry, 0, "--dry"); ok(!existsSync(join(c.dir, "dry")), "--dry writes nothing");
  const s = await c.run(T.icons, ["search", "star", ...api]); code(s, 0, "search"); has(s.stdout, "tst:star  tst:star-flipped", "search results");
  const sets = await c.run(T.icons, ["sets", ...api]); code(sets, 0, "sets"); has(sets.stdout, "[attribution required]", "license note for CC-BY");
});
test("fetch-ui: refuses what it must not fetch (offline)", async (c) => {
  for (const [src, needle] of [["https://codepen.io/someone/pen/abcDEF", "terms forbid scraping"], ["https://21st.dev/x/y", "21st.dev blocks"],
    ["https://tailwindcss.com/plus/ui-blocks", "Tailwind Plus"], ["http://example.com/r/item.json", "only HTTPS"], ["ftp-ish-thing", "unrecognized source"], ["https://example.com/page", "isn't a supported source"]]) {
    const r = await c.run(T.fetchUi, [src, "--out", join(c.dir, "snips")]); code(r, 2, src); has(r.stderr, needle, src);
  }
  ok(!existsSync(join(c.dir, "snips")), "nothing written");
  code(await c.run(T.fetchUi, ["list", "nonamespace"]), 2, "list needs @namespace");
  code(await c.run(T.fetchUi, []), 2, "no source");
});
test("fetch-ui: loopback registry item, unsafe paths skipped", async (c) => {
  const out = join(c.dir, "snips");
  const r = await c.run(T.fetchUi, [`${c.base}/registry/spotlight.json`, "--out", out]);
  code(r, 0, "fetch"); has(r.stderr, "skipped ../../escape.tsx", "traversal skipped"); has(r.stderr, "skipped C:/Windows/evil.tsx", "drive path skipped");
  const dir = join(out, "shadcn-registry", "spotlight");
  eq(walk(out).sort(), ["shadcn-registry", "shadcn-registry/spotlight", "shadcn-registry/spotlight/SOURCE.md", "shadcn-registry/spotlight/spotlight-utils.ts", "shadcn-registry/spotlight/spotlight.tsx"], "written files");
  ok(readFileSync(join(dir, "spotlight-utils.ts"), "utf8").includes("export const clamp"), "same-origin file fetched");
  const src = readFileSync(join(dir, "SOURCE.md"), "utf8"); ok(src.includes("**License:** MIT") && src.includes("clsx"), "SOURCE.md");
  ok(!existsSync(join(c.dir, "escape.tsx")) && !existsSync(join(out, "escape.tsx")), "nothing outside --out");
  const j = parse((await c.run(T.fetchUi, [`${c.base}/registry/spotlight.json`, "--json"])).stdout, "--json");
  eq(j[0].files.filter((f) => f.skipped).length, 2, "two unsafe files reported");
  const p = await c.run(T.fetchUi, [`${c.base}/registry/spotlight.json`, "--print", "--out", join(c.dir, "p")]); has(p.stdout, "export function Spotlight()", "--print");
});
test("fonts: live info and search", { needs: "network", timeout: 120_000 }, async (c) => {
  const i = await c.run(T.fonts, ["info", "inter"]); code(i, 0, "info inter"); has(i.stdout, "npm i @fontsource-variable/inter", "install line");
  const s = await c.run(T.fonts, ["search", "grotesk", "--variable", "--limit", "5"]); code(s, 0, "search"); has(s.stdout, /match\(es\)/, "search summary");
});
test("icons: live search and get", { needs: "network", timeout: 120_000 }, async (c) => {
  const s = await c.run(T.icons, ["search", "arrow right", "--sets", "lucide"]); code(s, 0, "search"); has(s.stdout, "lucide:arrow-right", "result");
  const g = await c.run(T.icons, ["get", "lucide:arrow-right", "--out", join(c.dir, "icons")]); code(g, 0, "get"); ok(existsSync(join(c.dir, "icons", "arrow-right.svg")), "svg written");
});
test("fetch-ui: live shadcn/button", { needs: "network", timeout: 120_000 }, async (c) => {
  const r = await c.run(T.fetchUi, ["shadcn/button", "--out", join(c.dir, "snips")]); code(r, 0, "fetch"); ok(existsSync(join(c.dir, "snips", "shadcn-registry", "button", "button.tsx")), "button.tsx");
});
test("preset: fonts exist on Fontsource", { needs: "network", timeout: 180_000 }, async (c) => {
  const r = await c.run(T.preset, ["check", "--fonts"], { timeout: 170_000 }); code(r, 0, "check --fonts"); has(r.stdout, "all fonts exist on Fontsource", "verdict");
});

// browser tools: argument checks that need no browser ─────────────────────────
test("browser tools: usage and URL checks (offline)", async (c) => {
  for (const [name, script] of [...BROWSER_TOOLS, ["qa", T.qa]]) {
    code(await c.run(script, []), 2, `${name} without a URL`);
    code(await c.run(script, ["javascript:alert(1)"]), 2, `${name} javascript: URL`);
    const fileOk = name === "screenshot" || name === "extract-tokens";   // these two also open local files
    if (!fileOk) code(await c.run(script, ["file:///etc/passwd"]), 2, `${name} file: URL`);
  }
  code(await c.run(T.responsive, ["http://127.0.0.1:1/", "--widths", "abc"]), 2, "responsive bad --widths");
});
test("browser tools: clear exit 3 when Playwright is missing", async (c) => {
  for (const from of [join(ROOT, "skills", "ui-test", "scripts"), c.dir]) for (let d = from; ; d = dirname(d)) {
    if (["playwright", "playwright-core", join("@playwright", "test")].some((p) => existsSync(join(d, "node_modules", p)))) skip(`Playwright is installed in ${d}, so it can't be missing`);
    if (dirname(d) === d) break;
  }
  for (const [name, script] of [...BROWSER_TOOLS, ["qa", T.qa]]) {
    const r = await c.run(script, ["http://127.0.0.1:9/"], { env: { NODE_PATH: "" } });
    code(r, 3, name); has(r.stderr, "Playwright not found", name);
  }
});
test("repo: validate.mjs passes", { timeout: 900_000 }, async (c) => {
  const r = await c.run(T.validate, [], { cwd: ROOT, timeout: 600_000 });
  code(r, 0, "validate"); has(r.stdout, /✔ \d+ skills valid/, "skills line"); has(r.stdout, /✔ \d+ subagents valid/, "subagents line");
});

// stats ──────────────────────────────────────────────────────────────────────
test("stats: typical, 90th percentile, outliers and a damaged line", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(join(p, ".vibeweave"), { recursive: true });
  const runs = [[60, 10_000, 1000, 0], [70, 12_000, 1100, 1], [80, 11_000, 1200, 0], [90, 9_000, 1300, 0], [100, 13_000, 1400, 1], [600, 100_000, 5000, 0]];
  const lines = runs.map(([sec, input, output, subagents], i) => JSON.stringify({ at: `2026-11-0${i + 1}T10:00:00.000Z`, durationMs: sec * 1000, subagents, run: { input, cacheRead: 0, cacheWrite: 0, output, calls: 3 } }));
  writeFileSync(join(p, ".vibeweave", "usage.jsonl"), [...lines.slice(0, 3), '{"at": broken', "", ...lines.slice(3)].join("\n") + "\n");
  const r = await c.run(T.stats, [p, "--json"]); code(r, 0, "--json"); const j = parse(r.stdout, "stats");
  eq([j.runs, j.withSubagents, j.first, j.last], [6, 2, "2026-11-01", "2026-11-06"], "counts (the damaged line is skipped)");
  eq(j.typical, { ms: 80_000, input: 11_000, output: 1200 }, "typical = nearest-rank median");
  eq([j.worst90.ms, j.total.ms, j.total.input], [600_000, 1_000_000, 155_000], "90th percentile and totals");
  eq(j.outliers.map((o) => o.input), [100_000], "only the 100k run is an outlier (> 3× typical)");
  const t = await c.run(T.installer, ["stats", p]); code(t, 0, "npx vibeweave stats");
  has(t.stdout, "typical      1m 20s", "typical row"); has(t.stdout, "Unusually expensive runs", "outlier section");
  has(t.stdout, "Estimate for the next run like these: ~1m 20s and ~11k input tokens (up to 10m 00s / 100k)", "estimate");
  const none = await c.run(T.stats, [c.dir]); code(none, 1, "no log"); has(none.stderr, "No usage log", "message");
  code(await c.run(T.stats, [p, "--jsno"]), 2, "misspelt flag"); code(await c.run(T.stats, [p, c.dir]), 2, "two folders");
});

// doctor ─────────────────────────────────────────────────────────────────────
test("doctor: empty project, installed project, outdated install, bad input", async (c) => {
  const home = join(c.dir, "home"), p = join(c.dir, "app"); mkdirSync(home); mkdirSync(p);
  const env = { HOME: home, USERPROFILE: home, NODE_PATH: "" };
  const empty = await c.run(T.doctor, ["--project", p], { env, cwd: p }); code(empty, 0, "warnings only");
  has(empty.stdout, /✔ Node\.js \d+/, "node"); has(empty.stdout, "Vibeweave isn't installed in this project or for this user", "not installed"); has(empty.stdout, "→ run: npx vibeweave", "fix line");
  code(await install(c, ["--agent", "claude", "--skills", "vibeweave", "--project", p], { env }), 0, "install");
  const installed = await c.run(T.installer, ["doctor", "--project", p], { env, cwd: p }); code(installed, 0, "npx vibeweave doctor");
  has(installed.stdout, "Vibeweave installed: project .claude/skills", "found the install"); has(installed.stdout, "time-and-token hook installed", "hook");
  const skill = join(p, ".claude", "skills", "vibeweave", "SKILL.md");
  writeFileSync(skill, readFileSync(skill, "utf8").replace(/version:\s*"?[\d.]+"?/, 'version: "0.0.1"'));
  const old = await c.run(T.doctor, ["--project", p], { env, cwd: p }); code(old, 0, "outdated is a warning"); has(old.stdout, "has Vibeweave v0.0.1", "outdated install named");
  code(await c.run(T.doctor, ["--project", join(c.dir, "missing")], { env }), 2, "missing folder");
  code(await c.run(T.doctor, ["--projcet", p], { env }), 2, "misspelt flag"); code(await c.run(T.doctor, ["--project"], { env }), 2, "--project without a value");
});

// coverage ───────────────────────────────────────────────────────────────────
test("coverage: everything is reachable; a planted orphan is caught", async (c) => {
  const copy = join(c.dir, "repo");
  for (const d of ["skills", "agents", "adapters"]) cpSync(join(ROOT, d), join(copy, d), { recursive: true });
  mkdirSync(join(copy, "tools")); cpSync(join(ROOT, T.coverage), join(copy, T.coverage));
  const clean = await c.run(join(copy, T.coverage), []); code(clean, 0, "the shipped guidance reaches everything"); has(clean.stdout, /\d+\/\d+ files and \d+\/\d+ subagents are reachable/, "summary");
  writeFileSync(join(copy, "skills", "ui-test", "references", "planted-orphan.md"), "# Nobody links here\n");
  const orphan = await c.run(join(copy, T.coverage), []); code(orphan, 1, "orphan found"); has(orphan.out, "planted-orphan.md", "the orphan is named");
});

// seo (no browser) ───────────────────────────────────────────────────────────
/** A real PNG of the given size (one flat colour), for share-image measurement. */
function png(w, h) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; return x >>> 0; });
  const crc = (b) => { let x = 0xffffffff; for (const v of b) x = crcTable[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.alloc(1 + w * 3, 40); row[0] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}
test("seo: a complete page passes; planted problems are found", async (c) => {
  const root = join(c.dir, "site"); mkdirSync(root);
  writeFileSync(join(root, "404.html"), "<!doctype html><html lang=\"en\"><title>Not found</title>");
  const srv = await serveFixtures(root);
  try {
    const B = srv.base;
    writeFileSync(join(root, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${B}/sitemap.xml\n`);
    writeFileSync(join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${B}/</loc></url><url><loc>${B}/small.html</loc></url></urlset>\n`);
    writeFileSync(join(root, "og.png"), png(1200, 630)); writeFileSync(join(root, "small.png"), png(600, 315));
    const page = (img, extra = "") => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fixture bakery — fresh bread every morning</title><meta name="description" content="A fixture page with every tag a crawler and a link unfurler need, used by the Vibeweave self-test.">
<link rel="canonical" href="${B}/${extra}"><link rel="icon" href="/favicon.svg"><meta property="og:type" content="website"><meta property="og:url" content="${B}/${extra}">
<meta property="og:title" content="Fixture bakery"><meta property="og:description" content="Fresh bread every morning."><meta property="og:image" content="${B}/${img}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="A loaf on a table"><meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Bakery","name":"Fixture bakery"}</script></head><body><h1>Fixture bakery</h1></body></html>`;
    writeFileSync(join(root, "index.html"), page("og.png"));
    writeFileSync(join(root, "small.html"), page("small.png", "small.html"));
    writeFileSync(join(root, "bad.html"), `<!doctype html><html><head><meta property="og:image" content="/missing.png"><script type="application/ld+json">{"@context": broken}</script></head><body><h1>One</h1><h1>Two</h1></body></html>`);

    const good = await c.run(T.seo, ["--max-time", "60", `${B}/`, "--json", "--out", c.dir]);   // --max-time before the URL on purpose
    code(good, 0, "complete page"); const g = parse(good.stdout, "good");
    eq([g.verdict, g.findings.map((x) => `${x.check}: ${x.msg}`)], ["PASS", []], "nothing to report");
    const bad = await c.run(T.seo, [`${B}/`, "--pages", "/bad.html,small.html", "--json", "--strict", "--out", c.dir]);
    code(bad, 1, "--strict with errors"); const b = parse(bad.stdout, "bad");
    const at = (path, sev) => new Set(b.findings.filter((x) => x.page === path && x.sev === sev).map((x) => x.check));
    for (const check of ["lang", "viewport", "title", "description", "open-graph", "share-image", "json-ld"]) ok(at("/bad.html", "error").has(check), `bad.html: ${check} error`);
    for (const check of ["canonical", "h1", "favicon", "twitter", "sitemap"]) ok(at("/bad.html", "warn").has(check), `bad.html: ${check} warning`);
    ok(b.findings.some((x) => x.page === "/bad.html" && /404/.test(x.msg)), "the 404 share image is reported");
    const small = b.findings.filter((x) => x.page === "/small.html").map((x) => x.msg).join("\n");
    has(small, "og:image is 600×315 — use at least 1200×630", "small share image"); has(small, "say 1200×630 but the image is 600×315", "declared size mismatch");
    eq(at("/", "error").size + at("/", "warn").size, 0, "the good page stays clean next to bad ones");
    eq(b.verdict, "FAIL", "verdict"); ok(existsSync(join(c.dir, "seo.json")), "report written");
  } finally { await srv.stop(); }
});
test("seo: bad input, refused connection and --max-time", async (c) => {
  for (const [args, why] of [[[], "no URL"], [["http://127.0.0.1:1/", "--bogus"], "unknown flag"], [["http://127.0.0.1:1/", "--pages"], "--pages without a value"],
    [["http://127.0.0.1:1/", "http://127.0.0.1:2/"], "two URLs"], [["javascript:alert(1)"], "javascript: URL"]]) code(await c.run(T.seo, [...args, "--out", c.dir]), 2, why);
  const port = await closedPort();
  const refused = await c.run(T.seo, [`http://127.0.0.1:${port}/`, "--json", "--strict", "--out", c.dir]);
  code(refused, 1, "refused is an error under --strict"); eq(parse(refused.stdout, "refused").findings.find((x) => x.check === "http")?.sev, "error", "page load error reported");
  const slow = await c.run(T.seo, [`${c.base}/__slow?ms=60000`, "--max-time", "10", "--out", c.dir]);
  code(slow, 124, "stopped by --max-time"); has(slow.stderr, "INCOMPLETE — not verified", "INCOMPLETE line"); lacks(slow.out, "Verdict: PASS", "never a pass");
});

// ship (H. ship it) — secrets are assembled at run time so this repo never contains one ───────────
test("ship: check finds secrets, key files and leftovers; prepare leaves them out; publish refuses", async (c) => {
  const p = join(c.dir, "app"); mkdirSync(join(p, "src"), { recursive: true }); mkdirSync(join(p, "node_modules", "x"), { recursive: true });
  const fakeKey = ["AK", "IA", "ABCDEFGHIJKLMNOP"].join(""), fakeGh = ["gh", "p_", "a".repeat(36)].join("");
  writeFileSync(join(p, "package.json"), JSON.stringify({ name: "app", version: "1.0.0", scripts: { build: "vite build" } }));
  writeFileSync(join(p, "src", "main.js"), `const k = "${fakeKey}";\nconsole.log("debug");\n// TODO tidy\nfetch("http://localhost:3000/api");\n`);
  writeFileSync(join(p, "src", "config.js"), `export const token = "${fakeGh}";\n`);
  writeFileSync(join(p, ".env"), "SECRET=1\n"); writeFileSync(join(p, ".env.example"), "SECRET=\n");
  writeFileSync(join(p, "MEMORY.md"), "# memory\n"); writeFileSync(join(p, "REQUIREMENTS.md"), "# req\n");
  writeFileSync(join(p, "node_modules", "x", "index.js"), `"${fakeKey}"`);
  const S = "skills/vibeweave/scripts/ship.mjs";
  const r = await c.run(S, ["check", p, "--json"]); code(r, 1, "errors"); const j = parse(r.stdout, "check");
  const kinds = (k) => j.findings.filter((f) => f.kind === k).map((f) => f.file);
  eq(kinds("secret").sort(), ["src/config.js", "src/main.js"], "both planted tokens found; node_modules not scanned");
  eq(kinds("secret-file"), [".env"], ".env flagged, .env.example kept");
  ok(j.findings.some((f) => f.kind === "leftover" && /console\.log/.test(f.msg)) && j.findings.some((f) => /localhost/.test(f.msg)), "leftovers");
  ok(j.findings.some((f) => f.kind === "repo-file" && /README/.test(f.msg)) && j.findings.some((f) => /\.gitignore/.test(f.msg)), "missing README and .gitignore");
  lacks(r.stdout, fakeKey, "the secret itself is never printed in full");
  const out = join(c.dir, "app-github");
  const prep = await c.run(S, ["prepare", p, "--out", out, "--license", "mit", "--owner", "Test Owner"]);
  code(prep, 1, "prepared copy still has the in-code secrets (errors)");
  for (const f of [".env", "MEMORY.md", "REQUIREMENTS.md", "node_modules"]) ok(!existsSync(join(out, f)), `${f} left out`);
  ok(existsSync(join(out, ".env.example")) && existsSync(join(out, ".gitignore")) && readFileSync(join(out, "LICENSE"), "utf8").includes("Test Owner"), ".env.example kept, .gitignore and LICENSE written");
  const pub = await c.run(S, ["publish", out, "--repo", "demo", "--public"]); code(pub, 2, "no --yes"); has(pub.stderr, "--yes only after they approve", "consent message");
  const pub2 = await c.run(S, ["publish", out, "--repo", "demo", "--public", "--yes"]); code(pub2, 1, "secrets block publishing"); has(pub2.stderr, "refusing to publish: a secret", "refusal");
  writeFileSync(join(out, "src", "main.js"), "export const ok = true;\n"); writeFileSync(join(out, "src", "config.js"), "export const token = import.meta.env.VITE_TOKEN;\n");
  writeFileSync(join(out, "README.md"), Array.from({ length: 12 }, (_, i) => `Line ${i}`).join("\n"));
  writeFileSync(join(out, "package-lock.json"), "{}");
  const clean = await c.run(S, ["check", out, "--json"]); code(clean, 0, "clean copy passes"); eq(parse(clean.stdout, "clean").counts.error || 0, 0, "0 errors");
  code(await c.run(S, ["publish", out, "--repo", "bad name!", "--public", "--yes"]), 2, "invalid repo name");
  code(await c.run(S, ["prepare", p, "--out", out]), 2, "refuses a non-empty --out without --force");
  code(await c.run(S, ["frobnicate"]), 2, "unknown command");
  const dry = await c.run(S, ["install", "gh"]);   // never installs without --yes
  ok([0, 1, 2].includes(dry.code), `install without --yes (exit ${dry.code})`); lacks(dry.out, "Installing gh:", "nothing is installed without --yes");
  if (dry.code === 2) has(dry.stdout, "Would run:", "shows the exact command");
  code(await c.run(S, ["install", "node"]), 2, "only git and gh are installable");
  const gh = await c.run(S, ["gh", "--json"], { env: { PATH: "", Path: "" } });
  ok([2, 3].includes(gh.code), `gh with an empty PATH reports what's missing (exit ${gh.code})`); ok(parse(gh.stdout, "gh").next.length > 0, "next steps listed");
});

// check (argument handling needs no browser) ─────────────────────────────────
test("check: bad input and a server that isn't running", async (c) => {
  for (const [args, why] of [[[], "no URL"], [["http://127.0.0.1:1/", "--bogus"], "unknown flag"], [["http://127.0.0.1:1/", "--runs"], "--runs without a value"],
    [["http://127.0.0.1:1/", "--max-time", "abc"], "bad --max-time"], [["http://127.0.0.1:1/", "http://127.0.0.1:2/"], "two URLs"],
    [["http://127.0.0.1:1/", "--device", "tablet"], "unknown --device"]]) code(await c.run(T.check, [...args, "--out", c.dir]), 2, why);
  const port = await closedPort();
  const t0 = performance.now();
  const r = await c.run(T.installer, ["check", `http://127.0.0.1:${port}/`, "--out", c.dir]);
  code(r, 1, "nothing listening"); has(r.stderr, "is the server running at that URL?", "hint");
  ok(performance.now() - t0 < 30_000, "fails fast instead of running five tools"); ok(!existsSync(join(c.dir, "SCORECARD.md")), "no scorecard for a run that never started");
});

// browser tools against the fixtures ─────────────────────────────────────────
// Generous safety nets: a loaded machine slows browsers a lot, and a run cut short must fail loudly, not hang.
const B = { needs: "browser", timeout: 900_000 };
const MT = ["--max-time", "400", "--nav-timeout", "120"];   // tools that take --nav-timeout
const MTQ = ["--max-time", "400"];                           // qa and vitals (their own navigation timeouts)
test("screenshot: buggy page", B, async (c) => {
  const out = join(c.dir, "shots");
  const r = await c.run(T.screenshot, [`${c.base}/buggy/`, "--widths", "375,1280", "--out", out, ...MT]);
  code(r, 0, "screenshot"); has(r.stdout, "HORIZONTAL OVERFLOW", "overflow flagged");
  const rep = readJson(join(out, "report.json"), "report");
  eq(rep.viewports.map((v) => v.width), [375, 1280], "widths in order");
  const [m, d] = rep.viewports;
  ok(m.horizontalOverflow && !d.horizontalOverflow, "overflow only at 375px");
  ok(m.overflowingElements.some((o) => o.el.startsWith("div.promo")), "the promo box is named");
  ok(m.imagesMissingAlt.some((s) => s.endsWith("/buggy/logo.svg")), "missing alt");
  ok(m.brokenImages.some((s) => s.endsWith("/missing.png")), "broken image");
  ok(m.consoleErrors.some((e) => e.includes("planted: widget failed")), "console error");
  ok(m.failedRequests.some((f) => f.startsWith("404 ") && f.endsWith("/missing.png")), "failed request");
  ok(isPng(join(out, "light-375.png")) && isPng(join(out, "light-1280.png")), "PNG files");
});
test("screenshot: clean page", B, async (c) => {
  const out = join(c.dir, "shots");
  const r = await c.run(T.screenshot, [`${c.base}/clean/`, "--widths", "375,768,1280", "--out", out, "--dark", ...MT]);
  code(r, 0, "screenshot"); eq(r.stdout.split("✓ no automatic issues found").length - 1, 3, "no issues at any width");
  for (const v of readJson(join(out, "report.json"), "report").viewports) {
    eq([v.horizontalOverflow, v.consoleErrors, v.failedRequests, v.brokenImages, v.imagesMissingAlt, v.smallTapTargets, v.h1Count], [false, [], [], [], [], [], 1], `clean @${v.width}`);
  }
  ok(isPng(join(out, "dark-768.png")), "dark screenshots");
});
test("responsive: buggy page (findings, width order, --strict)", B, async (c) => {
  const r = await c.run(T.responsive, [`${c.base}/buggy/`, "--widths", "1280,375,768,320", "--json", "--strict", "--out", c.dir, ...MT]);
  code(r, 1, "--strict with errors");
  const j = parse(r.stdout, "json"); eq(j.verdict, "FAIL", "verdict");
  const over = j.issues.filter((i) => i.sev === "error" && i.msg.startsWith("horizontal overflow"));
  eq(over.map((i) => i.w).sort((a, b) => a - b), [320, 375], "overflow at 320 and 375 only");
  ok(over.every((i) => i.msg.includes("div.promo")), "root cause named");
  eq(readJson(join(c.dir, "responsive.json"), "report").rows.map((x) => x.width), [1280, 375, 768, 320], "rows keep --widths order");
});
test("responsive: real overlap and cut-off text caught; wrapped inline text, tilted cards, scroll reveals, scrollers, .sr-only and decorative layers quiet", B, async (c) => {
  const r = await c.run(T.responsive, [`${c.base}/overlap/`, "--widths", "375,1280", "--json", "--out", c.dir, ...MT]);
  code(r, 0, "responsive"); const j = parse(r.stdout, "json");
  const loud = j.issues.filter((i) => i.sev !== "info");
  const kind = (m) => /^overlapping text: .*span\.badge "NEW LABEL ON TOP"/.test(m) ? "label" : /^text cut off: p\.price "€14 \/ 250 g" runs past the edge of div /.test(m) ? "cut" : m;
  eq(loud.map((i) => [i.w, i.sev, kind(i.msg)]), [[375, "error", "label"], [375, "error", "cut"], [1280, "error", "label"], [1280, "error", "cut"]], "the planted label and the cut-off price, at both widths");
  lacks(JSON.stringify(j.issues), /strong "|li "T-0|sr-only|atmosphere|deck|caption|rail item|MEDIUM ROAST/, "no false positives");
});
test("responsive: clean page passes at every default width", B, async (c) => {
  const r = await c.run(T.responsive, [`${c.base}/clean/`, "--json", "--strict", "--out", c.dir, ...MT]);
  code(r, 0, "clean"); const j = parse(r.stdout, "json");
  eq([j.verdict, j.counts.error || 0, j.counts.warn || 0], ["PASS", 0, 0], "verdict"); eq(readJson(join(c.dir, "responsive.json"), "report").rows.length, 13, "13 widths");
});
/** The parts of a report that are findings (no timings). */
const findingsOf = (rep) => JSON.stringify({ verdict: rep.verdict, counts: rep.counts, issues: rep.issues, pages: rep.pages?.map((p) => [p.path, p.status, p.deadButtons, p.consoleErrors, p.outgoingLinks]) });
test("responsive: --concurrency 1 and 4 give identical findings", B, async (c) => {
  for (const site of ["buggy", "clean"]) {
    const run = async (n) => { const out = join(c.dir, `${site}-${n}`); const r = await c.run(T.responsive, [`${c.base}/${site}/`, "--concurrency", n, "--out", out, ...MT]); code(r, 0, `${site} -c ${n}`); return readJson(join(out, "responsive.json"), "report"); };
    const a = await run(1), b = await run(4);
    eq(findingsOf(b), findingsOf(a), `${site}: findings`);
    eq(JSON.stringify(b.rows), JSON.stringify(a.rows), `${site}: every measurement`);
  }
});
/** The planted wiring problems of tests/fixtures/buggy, and nothing that would mean the crawl escaped the site. */
function assertBuggyWiring(j, what) {
  const find = (sev, kind, re) => j.issues.some((i) => i.sev === sev && i.kind === kind && re.test(`${i.where} ${i.msg}`));
  ok(find("error", "broken-link", /\/buggy\/missing\.html returns 404/), `${what}: broken link`);
  ok(find("error", "dead-button", /"Get the guide"/), `${what}: dead button`);
  ok(!j.issues.some((i) => i.kind === "dead-button" && /Show cone chart/.test(i.msg)), `${what}: the working toggle is not dead`);
  ok(find("warn", "missing-anchor", /#nowhere/), `${what}: missing anchor`);
  ok(find("warn", "placeholder-link", /href="#"/), `${what}: placeholder link`);
  ok(find("warn", "dead-end", /^\/buggy\/about\.html /), `${what}: dead end`);
  ok(find("warn", "broken-image", /missing\.png/), `${what}: broken image`);
  ok(find("warn", "console", /planted: widget failed/), `${what}: console error`);
  eq(j.pages.map((p) => [p.path, p.status]), [["/buggy", 200], ["/buggy/about.html", 200], ["/buggy/missing.html", 404]], `${what}: crawled pages (relative links resolved against /buggy/)`);
  eq(j.verdict, "FAIL", `${what}: verdict`);
}
test("wiring: buggy site", B, async (c) => {
  const r = await c.run(T.wiring, [`${c.base}/buggy/`, "--json", "--strict", "--max-pages", "10", "--out", c.dir, ...MT]);
  code(r, 1, "--strict with errors");
  assertBuggyWiring(parse(r.stdout, "json"), "default run");
});
test("wiring: clean site passes", B, async (c) => {
  const r = await c.run(T.wiring, [`${c.base}/clean/`, "--json", "--out", c.dir, ...MT]);
  code(r, 0, "wiring"); const j = parse(r.stdout, "json");
  eq(j.issues.filter((i) => i.sev !== "info").map((i) => `${i.kind}: ${i.msg}`), [], "no errors or warnings");
  eq(j.pages.map((p) => [p.path, p.status, p.deadButtons.length]), [["/clean", 200, 0], ["/clean/about.html", 200, 0]], "pages");
  eq(j.verdict, "PASS", "verdict");
});
test("wiring: a one-page site with in-page navigation is not a dead end", B, async (c) => {
  const r = await c.run(T.wiring, [`${c.base}/onepage/`, "--json", "--out", c.dir, ...MT]);
  code(r, 0, "wiring"); const j = parse(r.stdout, "json");
  eq(j.issues.filter((i) => i.sev !== "info").map((i) => `${i.kind}: ${i.msg}`), [], "no errors or warnings");
  ok(j.issues.some((i) => i.sev === "info" && i.kind === "one-page"), "noted as a one-page site");
  eq(j.verdict, "PASS", "verdict");
});
test("wiring: --concurrency 1 (sequential) and 2 (default) give identical findings", B, async (c) => {
  for (const site of ["buggy", "clean"]) {
    const run = async (n) => { const out = join(c.dir, `${site}-${n}`); const r = await c.run(T.wiring, [`${c.base}/${site}/`, "--concurrency", n, "--out", out, ...MT]); code(r, 0, `${site} -c ${n}`); return readJson(join(out, "wiring.json"), "report"); };
    const a = await run(1), b = await run(2);
    eq(findingsOf(b), findingsOf(a), `${site}: -c 2 vs -c 1`);
  }
});
test("wiring: --fast finds the same problems; --full keeps full fidelity", B, async (c) => {
  // --fast never downloads images, so the browser's own "Failed to load resource" console line for a broken image is
  // missing (the image is still reported, via HEAD). Everything else must match exactly.
  const problems = (rep) => rep.issues.map((i) => `${i.sev}|${i.kind}|${i.where}|${i.kind === "console" ? "" : i.msg}`);
  for (const site of ["buggy", "clean"]) {
    const run = async (extra) => { const out = join(c.dir, `${site}${extra.join("")}`); const r = await c.run(T.wiring, [`${c.base}/${site}/`, ...extra, "--out", out, ...MT]); code(r, 0, `${site} ${extra.join(" ")}`); return readJson(join(out, "wiring.json"), "report"); };
    const full = await run(["--full"]), fast = await run(["--fast"]);
    eq(problems(fast), problems(full), `${site}: --fast vs --full`);
    if (site === "buggy") {
      assertBuggyWiring(fast, "--fast"); assertBuggyWiring(full, "--full");
      ok(full.issues.some((i) => i.kind === "console" && i.msg.startsWith("2 console error(s)")), "--full loads images (the 404 is logged by the browser too)");
    }
  }
});
test("vitals: buggy page (CLS, long task, failed request)", { ...B, exclusive: true }, async (c) => {
  const r = await c.run(T.vitals, [`${c.base}/buggy/`, "--runs", "1", "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "vitals"); const j = parse(r.stdout, "json");
  ok(j.medians.cls > 0.1, `CLS from the late banner (got ${j.medians.cls})`);
  ok(j.medians.tbt >= 150, `TBT from the 320 ms task (got ${j.medians.tbt})`);
  const msgs = j.opportunities.map((o) => o.msg).join("\n");
  has(msgs, "Layout shift during load from:", "CLS opportunity"); has(msgs, /TBT \d+ms over \d+ long task/, "TBT opportunity"); has(msgs, /Failed request: 404 .*missing\.png/, "failed request");
  eq(j.profile, "mobile (4× CPU, slow 4G)", "default profile is throttled mobile");
});
test("vitals: clean page has no opportunities", { ...B, exclusive: true }, async (c) => {
  const r = await c.run(T.vitals, [`${c.base}/clean/`, "--runs", "1", "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "vitals"); const j = parse(r.stdout, "json");
  eq([j.grades.lcp, j.grades.cls, j.grades.tbt, j.grades.fcp], ["good", "good", "good", "good"], "grades");
  eq(j.opportunities.filter((o) => o.sev !== "info").map((o) => o.msg), [], "no warnings or errors");
});
test("probe: buggy page at 375px", B, async (c) => {
  const r = await c.run(T.probe, [...MT, `${c.base}/buggy/`, "--width", "375", "--json", "--out", c.dir]);   // --max-time before the URL on purpose
  code(r, 0, "probe"); const j = parse(r.stdout, "json");
  eq(j.url, `${c.base}/buggy/`, "the URL (not the --max-time value) is probed");
  ok(j.docWidth > j.viewport, "document wider than the viewport");
  ok(j.overflow.some((o) => o.el.startsWith("div.promo") && o.why.some((w) => w.includes("520px wide"))), "overflow root cause");
  ok(j.console.some((m) => m.text.includes("planted: widget failed")), "console error");
  ok(j.brokenImages.some((s) => s.endsWith("/missing.png")) && j.failedRequests.some((f) => f.startsWith("404 ")), "broken image + failed request");
});
test("probe: element mode and selector errors", B, async (c) => {
  const r = await c.run(T.probe, [`${c.base}/buggy/`, "--selector", ".promo", "--width", "375", "--out", c.dir, ...MT]);
  code(r, 0, "element mode"); has(r.stdout, "ELEMENT div.promo", "element"); has(r.stdout, /box 520×\d+/, "box size");
  const bad = await c.run(T.probe, [`${c.base}/buggy/`, "--selector", "[[[", "--out", c.dir, ...MT]); code(bad, 1, "invalid selector"); has(bad.stdout, "Invalid CSS selector", "message");
  const none = await c.run(T.probe, [`${c.base}/buggy/`, "--selector", ".nope", "--out", c.dir, ...MT]); code(none, 1, "no match"); has(none.stdout, "No element matches", "message");
});
test("probe: clean page has nothing suspicious", B, async (c) => {
  const r = await c.run(T.probe, [`${c.base}/clean/`, "--out", c.dir, ...MT]);
  code(r, 0, "probe"); has(r.stdout, "✓ nothing suspicious found", "verdict");
  const j = readJson(join(c.dir, "probe.json"), "report");
  for (const k of ["console", "failedRequests", "overflow", "sticky", "fixedTrapped", "zIndexNoEffect", "textSpill", "brokenImages", "fontFallback"]) eq(j[k], [], k);
});
test("extract-tokens: clean page", B, async (c) => {
  const r = await c.run(T.extract, [`${c.base}/clean/`, "--out", c.dir, ...MT]);
  code(r, 0, "extract"); has(r.stdout, "# Design DNA (measured)", "summary");
  const j = readJson(join(c.dir, "dna-127.0.0.1.json"), "dna");
  eq(j.cssVariables["--color-accent"], "#0f5f68", "CSS variable"); ok(j.colors.text.some((x) => x.value === "#1f2937"), "text color");
  ok(j.colors.background.some((x) => x.value === "#ffffff"), "background color"); ok(j.typography.samplesByRole.h1?.fontSize === "32px", "h1 sample");
  ok(j.shape.radii.some((x) => x.value === "8px"), "radius"); eq(j.meta.lang, "en", "lang");
  ok(isPng(join(c.dir, "dna-127.0.0.1-1440.png")) && isPng(join(c.dir, "dna-127.0.0.1-390.png")), "screenshots");
});
test("extract-tokens: buggy page", B, async (c) => {
  const r = await c.run(T.extract, [`${c.base}/buggy/`, "--out", c.dir, "--max-elements", "100", ...MT]);
  code(r, 0, "extract"); const j = readJson(join(c.dir, "dna-127.0.0.1.json"), "dna");
  ok(j.colors.text.some((x) => x.value === "#b8b8b8"), "the faint text color is measured"); ok(j.elementsAnalyzed > 10 && j.elementsAnalyzed <= 100, "element cap");
});
test("qa: buggy page", B, async (c) => {
  const r = await c.run(T.qa, [`${c.base}/buggy/`, "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "qa"); const j = parse(r.stdout, "json");
  if (j.checks.axe?.engine === "axe-core") {
    for (const rule of ["color-contrast", "image-alt", "meta-viewport"]) ok(j.findings.some((f) => f.check === "axe" && f.msg.startsWith(`${rule}:`)), `axe ${rule}`);
  } else ok(j.findings.some((f) => f.msg === "image without alt"), "built-in: image without alt");
  eq(j.verdict, "FAIL", "verdict");
});
test("qa: clean page passes", B, async (c) => {
  const r = await c.run(T.qa, [`${c.base}/clean/`, "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "qa"); const j = parse(r.stdout, "json");
  eq(j.findings.filter((f) => f.sev !== "info").map((f) => `${f.check}: ${f.msg}`), [], "no errors or warnings");
  eq(j.verdict, "PASS", "verdict");
});
test("qa: a collapsed menu is not a focus trap; a real trap is caught", B, async (c) => {
  const trapMsg = (j) => j.findings.filter((f) => f.check === "keyboard" && f.msg.startsWith("possible focus trap"));
  const menu = await c.run(T.qa, [`${c.base}/keyboard/menu.html`, "--json", "--out", join(c.dir, "menu"), ...MTQ]);
  code(menu, 0, "qa menu"); const m = parse(menu.stdout, "menu json");
  eq(trapMsg(m).length, 0, "links inside a hidden menu are not counted as reachable"); eq(m.checks.keyboard.focusable, 5, "reachable focusables");
  const trap = await c.run(T.qa, [`${c.base}/keyboard/trap.html`, "--json", "--out", join(c.dir, "trap"), ...MTQ]);
  code(trap, 0, "qa trap"); const t = parse(trap.stdout, "trap json");
  eq(trapMsg(t).length, 1, "the planted trap is reported"); eq(t.verdict, "FAIL", "verdict");
});
test("qa: custom radios judged by their visible stand-in — ring on the label passes, no ring is caught", B, async (c) => {
  const r = await c.run(T.qa, [`${c.base}/keyboard/custom.html`, "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "qa"); const j = parse(r.stdout, "json");
  const kb = j.findings.filter((f) => f.check === "keyboard");
  eq(kb.filter((f) => /invisible element/.test(f.msg)).length, 0, "transparent inputs with a visible stand-in aren't 'invisible'");
  const noRing = kb.filter((f) => /no visible focus indicator/.test(f.msg)).map((f) => f.where);
  eq(noRing.map((w) => (w.match(/(good|bad)-\w+/) || [w])[0]).sort(), ["bad-dos", "bad-uno"], "only the ring-less group is reported");
});
test("qa: a pause control that never resumes is caught; one that pauses and plays is quiet", B, async (c) => {
  const run = async (page) => { const r = await c.run(T.qa, [`${c.base}/pause/${page}`, "--json", "--only", "motion", "--out", join(c.dir, page || "index"), ...MTQ]); code(r, 0, `qa ${page || "index"}`); return parse(r.stdout, "json"); };
  const bad = await run(""), good = await run("ok.html");
  const msgs = (j) => j.findings.filter((f) => f.check === "motion").map((f) => f.msg);
  ok(msgs(bad).some((m) => /stops the motion but doesn't start it again: 1 → 0 → 0/.test(m)), `never resumes (got ${JSON.stringify(msgs(bad))})`);
  eq(msgs(good), [], "pause and play both work: no motion findings");
  eq([good.checks.motion.normal.roundTrip?.paused, good.checks.motion.normal.roundTrip?.resumed > 0], [0, true], "round trip measured");
});
test("qa: a scroll reveal that never fires at the end of the page is caught; tooltips are left alone", B, async (c) => {
  const r = await c.run(T.qa, [`${c.base}/reveal/`, "--json", "--only", "nojs", "--out", c.dir, ...MTQ]);
  code(r, 0, "qa"); const j = parse(r.stdout, "json");
  const late = j.findings.filter((f) => f.check === "reveal");
  eq(late.length, 1, "one reveal finding"); has(late[0].where, "#never", "names the row that never revealed");
  ok(!late[0].where.includes("#good") && !late[0].where.includes("tooltip"), "the revealed paragraph and the tooltip are not reported");
  eq(j.checks.nojs.invisibleAfterScroll, 1, "count");
});
test("vitals: a startup script that forces layout before first paint is named", { ...B, exclusive: true }, async (c) => {
  // Five runs: Chrome can miss a startup task in any one run (observer installed mid-task); vitals merges the runs.
  const r = await c.run(T.vitals, [`${c.base}/forced/`, "--runs", "5", "--json", "--out", c.dir, ...MTQ]);
  code(r, 0, "vitals"); const j = parse(r.stdout, "json");
  ok(j.forcedLayoutBeforeFcp?.length > 0, `forced layout measured (got ${JSON.stringify(j.forcedLayoutBeforeFcp)})`);
  has(j.opportunities.map((o) => o.msg).join("\n"), "forced style/layout before first paint", "opportunity names the cause");
});
for (const [name, script, reportFile] of BROWSER_TOOLS) {
  test(`${name}: --max-time on a slow page is INCOMPLETE (exit 124)`, B, async (c) => {
    const extra = name === "vitals" ? ["--runs", "2"] : name === "responsive" ? ["--widths", "375,1280"] : [];
    const r = await c.run(script, [`${c.base}/slow/`, "--max-time", "3", "--out", c.dir, ...extra]);
    code(r, 124, "stopped by --max-time"); has(r.out, "INCOMPLETE — not verified:", "what was not verified"); lacks(r.out, /Verdict: PASS|✓ no automatic|✓ nothing suspicious/, "never a pass");
    const file = reportFile || readdirSync(c.dir).find((f) => /^dna-.*\.json$/.test(f));
    ok(file, "partial report written");
    const j = readJson(join(c.dir, file), "partial report");
    eq([j.incomplete, j.verdict], [true, "INCOMPLETE"], "report marked INCOMPLETE");
    ok(Array.isArray(j.notVerified) && j.notVerified.length, "notVerified listed");
  });
  test(`${name}: a network error is reported, never swallowed`, B, async (c) => {
    const port = await closedPort();
    const r = await c.run(script, [`http://127.0.0.1:${port}/timeout-check`, "--out", c.dir, ...(name === "vitals" ? MTQ : MT)]);   // "timeout" in the URL must not look like a timeout
    code(r, 1, "connection refused"); has(r.stderr, "ERR_CONNECTION_REFUSED", "the real error"); has(r.stderr, "is the server running", "hint");
  });
}
test("probe: a page that never goes idle is measured after --nav-timeout", B, async (c) => {
  const r = await c.run(T.probe, [`${c.base}/longpoll/`, "--nav-timeout", "2", "--json", "--out", c.dir, ...MT]);
  code(r, 0, "probe"); const j = parse(r.stdout, "json"); ok(j.docWidth > 0 && Array.isArray(j.overflow), "page measured");
  const s = await c.run(T.responsive, [`${c.base}/longpoll/`, "--widths", "375", "--nav-timeout", "2", "--json", "--out", c.dir, ...MT]);
  code(s, 0, "responsive"); eq(parse(s.stdout, "json").verdict, "PASS", "measured once loaded");
});
test("wiring: a page that never goes idle is crawled once loaded (resets don't stall)", B, async (c) => {
  const t0 = performance.now();
  const r = await c.run(T.wiring, [`${c.base}/longpoll/`, "--nav-timeout", "3", "--json", "--out", c.dir, ...MT]);
  code(r, 0, "wiring"); const j = parse(r.stdout, "json");
  eq(j.pages.map((p) => [p.path, p.status, p.deadButtons]), [["/longpoll", 200, []]], "the page was analysed and its button works");
  // One idle timeout for the first visit; the reset after the click waits for "load" only (it would add another 3 s+).
  ok(!j.issues.some((i) => i.kind === "dead-button" || i.kind === "broken-page"), "no false dead button or broken page");
  ok(performance.now() - t0 < 120_000, "finished without stalling on every reset");
});

test("check: one scorecard for the clean fixture (wiring, SEO, QA ×2, responsive, vitals)", B, async (c) => {
  const out = join(c.dir, "review");
  const r = await c.run(T.check, [`${c.base}/clean/`, "--runs", "1", "--out", out, "--max-time", "400"], { timeout: 850_000 });
  const j = readJson(join(out, "scorecard.json"), "scorecard");
  eq(j.rows.map((x) => x.check.split(" (")[0]), ["Wiring", "SEO & share previews", "QA desktop 1280", "QA mobile 390", "Responsive sweep", "Core Web Vitals"], "every check, in order");
  for (const row of j.rows) ok(["PASS", "CONCERNS", "FAIL"].includes(row.verdict), `${row.check}: a real verdict (got ${row.verdict})`);
  eq(j.rows.filter((x) => ["Wiring", "QA desktop 1280", "QA mobile 390", "Responsive sweep"].includes(x.check.split(" (")[0])).map((x) => x.verdict), ["PASS", "PASS", "PASS", "PASS"], "the clean fixture passes wiring, QA and responsive");
  ok(/^LCP \d+\.\d\d s · CLS \d\.\d{3} · TBT \d+ ms$/.test(j.rows[5].numbers), `vitals numbers read from vitals.json (got "${j.rows[5].numbers}")`);
  const worst = j.rows.some((x) => x.verdict === "FAIL") ? "FAIL" : j.rows.some((x) => x.verdict === "CONCERNS") ? "CONCERNS" : "PASS";
  eq(j.overall, worst, "overall = worst row"); code(r, j.overall === "PASS" ? 0 : 1, "exit code follows the overall verdict");
  has(readFileSync(join(out, "SCORECARD.md"), "utf8"), `**Overall: ${j.overall}**`, "SCORECARD.md");
});

// Optional: a real site, sequential vs concurrent ─────────────────────────────
test("site: wiring --concurrency 1 vs 2 identical", { needs: "site", timeout: 900_000 }, async (c) => {
  const run = async (n) => { const out = join(c.dir, `w${n}`); const r = await c.run(T.wiring, [SITE, "--concurrency", n, "--max-pages", "10", "--out", out, "--max-time", "880", "--nav-timeout", "120"], { timeout: 890_000 }); code(r, 0, `-c ${n}`); return readJson(join(out, "wiring.json"), "report"); };
  const a = await run(1), b = await run(2);
  ok(a.pages.length >= 2, `crawled ${a.pages.map((p) => p.path).join(", ")}`);
  eq(findingsOf(b), findingsOf(a), "findings");
});
test("site: responsive --concurrency 1 vs 4 identical (/ and docs/)", { needs: "site", timeout: 900_000 }, async (c) => {
  for (const page of ["", "docs/"]) {
    const run = async (n) => { const out = join(c.dir, `r${n}${page.replace("/", "")}`); const r = await c.run(T.responsive, [SITE + page, "--concurrency", n, "--out", out, "--max-time", "880", "--nav-timeout", "120"], { timeout: 890_000 }); code(r, 0, `${page || "/"} -c ${n}`); return readJson(join(out, "responsive.json"), "report"); };
    const a = await run(1), b = await run(4);
    eq(findingsOf(b), findingsOf(a), `${page || "/"} findings`);
  }
});

// ── Runner ───────────────────────────────────────────────────────────────────
const selected = tests.filter((t) => !ONLY.length || ONLY.some((f) => t.tool.toLowerCase() === f || t.name.toLowerCase().startsWith(f) || t.needs === f));
if (argv.includes("--list")) { for (const t of tests) console.log(`${t.needs.padEnd(8)} ${t.name}`); process.exit(0); }
if (!selected.length) usage(`--only ${ONLY.join(",")} matches no test (see --list)`);

/** Find Playwright the way the tools do (cwd, NODE_PATH, then this repo) and check that a browser launches. */
async function browserSetup(workDir) {
  let found = null;
  for (const base of [process.cwd(), ROOT]) {
    const r = createRequire(join(base, "noop.js"));
    for (const id of ["playwright", "playwright-core", "@playwright/test"]) { try { found = { id, path: r.resolve(id) }; break; } catch {} }
    if (found) break;
  }
  if (!found) return { ok: false, why: "Playwright not found (cwd, NODE_PATH, repo) — install it or point NODE_PATH at a node_modules that has it" };
  const i = found.path.lastIndexOf(`${sep}node_modules${sep}`);
  const nodeModules = found.path.slice(0, i + `${sep}node_modules`.length);
  browserEnv = { NODE_PATH: [nodeModules, process.env.NODE_PATH].filter(Boolean).join(delimiter) };
  let axe = false; try { createRequire(join(process.cwd(), "noop.js")).resolve("axe-core/axe.min.js"); axe = true; } catch { try { createRequire(join(nodeModules, "noop.js")).resolve("axe-core/axe.min.js"); axe = true; } catch {} }
  const probe = `import { createRequire } from "node:module"; import { pathToFileURL } from "node:url";
const pw = await import(pathToFileURL(createRequire(process.cwd() + "/noop.js").resolve(${JSON.stringify(found.id)})).href);
const chromium = pw.chromium || pw.default?.chromium; const errs = [];
for (const channel of [undefined, "chrome", "msedge"]) { try { const b = await chromium.launch(channel ? { channel } : {}); console.log(channel || "bundled chromium", b.version()); await b.close(); process.exit(0); } catch (e) { errs.push(String(e.message).split("\\n")[0]); } }
console.error(errs.join(" | ")); process.exit(3);`;
  const r = await new Promise((done) => execFile(process.execPath, ["--input-type=module", "-e", probe], { cwd: workDir, env: { ...BASE_ENV, ...browserEnv }, timeout: 60_000, windowsHide: true, encoding: "utf8" },
    (err, stdout, stderr) => done({ ok: !err, out: String(stdout).trim(), err: String(stderr).trim() })));
  if (!r.ok) return { ok: false, why: `no browser could be launched: ${r.err.slice(0, 300) || "timed out"} — run: npx playwright install chromium` };
  return { ok: true, playwright: found.path, nodeModules, browser: r.out, axe };
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), "vibeweave-selftest-"));
  const server = await serveFixtures(FIXTURES);
  if (argv.includes("--serve")) {
    console.log(`Serving ${FIXTURES} at ${server.base}/  (buggy/, clean/, slow/, longpoll/, iconify/, registry/) — Ctrl+C stops`);
    process.on("SIGINT", async () => { await server.stop(); rmSync(work, { recursive: true, force: true }); process.exit(0); });
    return;
  }
  const t0 = performance.now();
  const needBrowser = selected.some((t) => t.needs === "browser" || t.needs === "site");
  const browser = needBrowser ? await browserSetup(work) : { ok: false, why: "not needed" };
  if (needBrowser && !browser.ok && REQUIRE_BROWSER) console.error(`✖ --require-browser: ${browser.why}`);
  let siteOk = false;
  if (SITE && selected.some((t) => t.needs === "site")) siteOk = await fetch(SITE, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok, () => false);
  console.log(`Vibeweave self-test · ${selected.length} test(s) · ${JOBS} job(s), ${BROWSER_JOBS} with a browser · fixtures ${server.base}/ · node ${process.version}`);
  if (needBrowser) console.log(browser.ok ? `browser: ${browser.browser} · Playwright ${relative(ROOT, browser.playwright).startsWith("..") ? browser.playwright : relative(ROOT, browser.playwright)}${browser.axe ? " · axe-core" : " · no axe-core (qa uses built-in checks)"}` : `browser tests: ${REQUIRE_BROWSER ? "FAIL" : "SKIP"} — ${browser.why}`);

  const skipReason = (t) => t.needs === "network" && !NETWORK ? "needs --network"
    : t.needs === "site" && !SITE ? "needs --site <url>"
    : t.needs === "site" && !siteOk ? `${SITE} is not reachable`
    : (t.needs === "browser" || t.needs === "site") && !browser.ok && !REQUIRE_BROWSER ? "no browser (Playwright)" : null;
  const results = new Array(selected.length);
  let slug = 0;
  async function runOne(t, i) {
    const why = skipReason(t);
    if (why) { results[i] = { name: t.name, status: "SKIP", ms: 0, message: why }; return; }
    if ((t.needs === "browser" || t.needs === "site") && !browser.ok) { results[i] = { name: t.name, status: "FAIL", ms: 0, message: browser.why }; return; }
    const dir = join(work, `${String(++slug).padStart(3, "0")}-${t.tool.replace(/[^a-z0-9-]+/gi, "-")}`);
    mkdirSync(dir, { recursive: true });
    const ctx = { dir, base: server.base, browser: t.needs === "browser" || t.needs === "site", log: [], children: new Set(), runTimeout: t.needs === "offline" ? 120_000 : 450_000 };
    ctx.run = (script, args, o) => runNode(ctx, script, args, o);
    const started = performance.now();
    let timer;
    try {
      const limit = t.timeout ?? (t.needs === "offline" ? 300_000 : 900_000);
      await Promise.race([t.fn(ctx), new Promise((_, fail) => { timer = setTimeout(() => fail(new Error(`timed out after ${limit / 1000}s`)), limit); })]);
      results[i] = { name: t.name, status: "PASS", ms: Math.round(performance.now() - started) };
    } catch (e) {
      results[i] = e instanceof Skip ? { name: t.name, status: "SKIP", ms: Math.round(performance.now() - started), message: e.message }
        : { name: t.name, status: "FAIL", ms: Math.round(performance.now() - started), message: String(e?.message || e), log: ctx.log };
    } finally {
      clearTimeout(timer);
      for (const ch of ctx.children) ch.kill();
    }
  }
  // Scheduler: up to JOBS tests at once, of which at most BROWSER_JOBS drive a browser (each browser tool already
  // works in parallel inside); an "exclusive" test (timing-sensitive: vitals) runs with nothing else. The next test
  // started is the first pending one that fits, so light offline tests fill the gaps.
  const pending = selected.map((t, i) => i).sort((a, b) => (selected[a].exclusive - selected[b].exclusive) || ((selected[b].needs !== "offline") - (selected[a].needs !== "offline")) || a - b);
  const running = new Set();
  let exclusiveRunning = false, browsersRunning = 0;
  const heavy = (t) => !skipReason(t) && (t.needs === "browser" || t.needs === "site");
  while (pending.length || running.size) {
    const k = pending.findIndex((i) => { const t = selected[i];
      return !exclusiveRunning && running.size < JOBS && (!t.exclusive || skipReason(t) || running.size === 0) && (!heavy(t) || browsersRunning < BROWSER_JOBS); });
    if (k === -1) { await Promise.race(running); continue; }
    const i = pending.splice(k, 1)[0], t = selected[i];
    const isExclusive = t.exclusive && !skipReason(t), isHeavy = heavy(t);
    if (isExclusive) exclusiveRunning = true;
    if (isHeavy) browsersRunning++;
    const p = runOne(t, i).finally(() => { running.delete(p); if (isExclusive) exclusiveRunning = false; if (isHeavy) browsersRunning--; });
    running.add(p);
  }
  await server.stop();

  const wall = performance.now() - t0;
  const fmt = (ms) => (ms ? `${(ms / 1000).toFixed(2)}s` : "—").padStart(8);
  console.log(`\nRESULT     TIME  TEST`);
  for (const r of results) console.log(`${r.status.padEnd(6)} ${fmt(r.ms)}  ${r.name}${r.status === "SKIP" ? `  (${r.message})` : r.status === "FAIL" ? `\n                 ✖ ${r.message}` : ""}`);
  const n = (s) => results.filter((r) => r.status === s).length;
  const reportPath = join(tmpdir(), "vibeweave-selftest-report.json");
  writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform} ${process.arch}`, jobs: JOBS,
    fixtures: server.base, browser: needBrowser ? browser : null, site: SITE, wallMs: Math.round(wall), totals: { tests: results.length, passed: n("PASS"), failed: n("FAIL"), skipped: n("SKIP") },
    results: results.map(({ log, ...r }) => (r.status === "FAIL" ? { ...r, log } : r)) }, null, 2));
  if (VERBOSE) for (const r of results.filter((x) => x.status === "FAIL" && x.log?.length)) console.log(`\n── ${r.name} ──\n${r.log.join("\n")}`);
  console.log(`\n${results.length} tests: ${n("PASS")} passed, ${n("FAIL")} failed, ${n("SKIP")} skipped · ${(wall / 1000).toFixed(1)}s wall, ${JOBS} job(s) · report ${reportPath}`);
  if (n("FAIL") && !VERBOSE) console.log("Re-run with --verbose to see the commands and output of the failing tests.");
  if (KEEP) console.log(`work folder kept: ${work}`); else rmSync(work, { recursive: true, force: true, maxRetries: 3 });
  process.exitCode = n("FAIL") ? 1 : 0;
}
main().catch((e) => { console.error(`✖ self-test crashed: ${e?.stack || e}`); process.exit(1); });
