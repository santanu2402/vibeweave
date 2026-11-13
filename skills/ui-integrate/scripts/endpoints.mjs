#!/usr/bin/env node
// Inventory every API call the frontend makes — so the UI can be aligned with the backend and mocked.
// Static scan (regex heuristics) of fetch / axios / ky / ofetch / $fetch / useFetch / useSWR calls, local API
// routes (Next.js app/api/**/route.ts, pages/api, SvelteKit +server.ts, Astro endpoints) and server actions.
// Zero dependencies. Read-only except for the --contract / --mocks-out files, which must be inside the current folder.
//
// Usage: node endpoints.mjs [src=.] [--json] [--contract API-CONTRACT.md] [--mocks-out mocks.json] [--mocks mocks.json]
//   --contract   write a backend contract draft: one section per endpoint (request, responses, errors, used in)
//   --mocks-out  write a starter mocks.json for mock-api.mjs with a route for every endpoint used
//   --mocks      compare with an existing mocks.json and list endpoints that are used but not mocked
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import { join, relative, sep, extname, basename, resolve, isAbsolute, dirname } from "node:path";

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const argv = process.argv.slice(2);
const VALUE_FLAGS = ["--contract", "--mocks-out", "--mocks"];
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const root = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1])) || ".";
const json = argv.includes("--json");
const EXT = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".astro"]);
const SKIP = new Set(["node_modules", "dist", "build", "out", "coverage", ".next", ".nuxt", ".svelte-kit", ".output", ".vercel", ".turbo"]);
const MAX_FILE_BYTES = 800_000, MAX_FILES = 20_000;

const calls = [], localRoutes = [], actions = [], baseUrls = new Set();
let scanned = 0;

/** Resolve an output path and refuse anything outside the current folder or written through a symlink. */
function outputPath(p, flag) {
  const abs = resolve(p), cwd = process.cwd();
  const rel = relative(cwd, abs);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) { console.error(`✖ ${flag} must be a file inside the current folder (got ${p})`); process.exit(2); }
  if (existsSync(abs) && (lstatSync(abs).isSymbolicLink() || lstatSync(abs).isDirectory())) { console.error(`✖ ${flag} target ${p} is a directory or symlink — choose a regular file`); process.exit(2); }
  mkdirSync(dirname(abs), { recursive: true });
  return abs;
}
const contractOut = opt("contract", null) && outputPath(opt("contract"), "--contract");
const mocksOut = opt("mocks-out", null) && outputPath(opt("mocks-out"), "--mocks-out");

/** Line number of a character index, via a precomputed table of newline offsets (binary search). */
function lineIndex(text) {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return (idx) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; } return lo + 1; };
}

/** Turn a URL expression into a normalized path: `${API}/studios/${id}` → /studios/:id ; strips query strings. */
function normalize(raw) {
  let s = raw.trim();
  const quote = s[0];
  if (!/^[`'"]/.test(quote)) return null;
  s = s.slice(1, s.lastIndexOf(quote) > 0 ? s.lastIndexOf(quote) : undefined);
  s = s.replace(/^\$\{[^}]*(?:API|BASE|URL|HOST|ORIGIN|ENDPOINT)[^}]*\}/i, "");          // ${API_URL}/x → /x
  s = s.replace(/^https?:\/\/[^/]+/, "");                                                     // absolute → path
  s = s.replace(/\$\{([^}]+)\}/g, (_, e) => `:${(e.match(/[A-Za-z_]\w*(?=\W*$)/) || ["param"])[0]}`); // ${user.id} → :id
  s = s.split("?")[0].split("#")[0];
  if (!s.startsWith("/")) return null;                                                        // not an API path (asset, relative file)
  if (/\.(png|jpe?g|svg|webp|avif|gif|css|js|woff2?|ico|json|txt|xml)$/i.test(s) && !/\/api\//.test(s)) return null;
  return s.replace(/\/+$/, "") || "/";
}

/** The argument list of a call starting at `from` (index of the callee), with balanced parentheses and
 *  string awareness — so options from a neighbouring call (e.g. another fetch's method) never leak in. */
function argsOf(text, from) {
  const open = text.indexOf("(", from);
  if (open < 0) return "";
  let depth = 0, quote = null;
  for (let i = open; i < Math.min(text.length, open + 2000); i++) {
    const ch = text[i];
    if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return text.slice(open + 1, i);
  }
  return text.slice(open + 1, open + 300);
}

// A string literal, including template literals with ${…} (whose contents may hold quotes). The alternatives are
// mutually exclusive, so matching stays linear even on hostile input (no catastrophic backtracking).
const STR = String.raw`[\x60'"](?:[^\x60'"$]|\$(?!\{)|\$\{[^}]*\})*[\x60'"]`;
const FETCH_RE = new RegExp(String.raw`\b(fetch|\$fetch|ofetch|ky|useFetch|useLazyFetch|useSWR|useSWRMutation|useSWRInfinite)\s*(?:<[^>]*>)?\(\s*(${STR})`, "g");
const CLIENT_RE = new RegExp(String.raw`\b(axios|api|apiClient|client|http|ky|instance|request|\$axios)\.(get|post|put|patch|delete|head)\s*(?:<[^>]*>)?\(\s*(${STR})`, "g");

function scan(file) {
  const text = readFileSync(file, "utf8");
  const lineAt = lineIndex(text);
  const rel = relative(root, file).split(sep).join("/");
  for (const m of text.matchAll(/(?:process\.env|import\.meta\.env)\.((?:NEXT_PUBLIC_|VITE_|PUBLIC_|NUXT_PUBLIC_)?\w*(?:API|BACKEND|BASE_URL|SERVER)\w*)/g)) baseUrls.add(m[1]);
  for (const m of text.matchAll(FETCH_RE)) {
    const path = normalize(m[2]);
    if (!path) continue;
    const args = argsOf(text, m.index);
    const method = (args.match(/method\s*:\s*[`'"](\w+)[`'"]/i)?.[1] || (/useSWRMutation/.test(m[1]) ? "POST" : "GET")).toUpperCase();
    calls.push({ method, path, client: m[1], file: rel, line: lineAt(m.index), body: /\bbody\s*:/.test(args) });
  }
  for (const m of text.matchAll(CLIENT_RE)) {
    const path = normalize(m[3]);
    if (path) calls.push({ method: m[2].toUpperCase(), path, client: m[1], file: rel, line: lineAt(m.index), body: ["post", "put", "patch"].includes(m[2]) });
  }
  // File-based API routes: Next.js app router / SvelteKit, then Next.js pages/api and Astro endpoints.
  if (/(^|\/)app\/(.+\/)?route\.(t|j)sx?$/.test(rel) || /(^|\/)routes\/(.+\/)?\+server\.(t|j)s$/.test(rel)) {
    const route = "/" + rel.replace(/^.*?(app|routes)\//, "").replace(/\/?(route|\+server)\.\w+$/, "").split("/").filter((p) => !/^\(.*\)$/.test(p)).join("/");
    const methods = [...text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map((x) => x[1]);
    localRoutes.push({ path: route.replace(/\[\.\.\.(\w+)\]/g, ":$1*").replace(/\[(\w+)\]/g, ":$1"), methods: methods.length ? methods : ["?"], file: rel });
  } else if (/(^|\/)pages\/api\//.test(rel) || (/(^|\/)src\/pages\//.test(rel) && /\.(t|j)s$/.test(rel) && /export\s+(const|async function|function)\s+(GET|POST)/.test(text))) {
    const route = "/" + rel.replace(/^.*?pages\//, "").replace(/\.\w+$/, "").replace(/\/index$/, "");
    localRoutes.push({ path: route.replace(/\[(\w+)\]/g, ":$1"), methods: [...text.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((x) => x[1]).concat(/export default/.test(text) ? ["ANY"] : []), file: rel });
  }
  // Server actions: functions exported from a "use server" file.
  if (/^\s*["']use server["']/m.test(text)) {
    for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*async/g)) actions.push({ name: m[1] || m[2], file: rel, line: lineAt(m.index) });
  }
}

/** Walk source files; symlinks are skipped so the scan can't loop or leave the project. */
function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (scanned >= MAX_FILES || e.isSymbolicLink()) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith(".")) walk(p); continue; }
    if (!e.isFile() || !EXT.has(extname(e.name)) || /\.(test|spec|stories)\.\w+$/.test(e.name) || /\.d\.ts$/.test(e.name)) continue;
    try { if (statSync(p).size < MAX_FILE_BYTES) { scanned++; scan(p); } } catch {}
  }
}
if (!existsSync(root)) { console.error(`Path not found: ${root}`); process.exit(2); }
statSync(root).isDirectory() ? walk(root) : scan(root);

// Group by METHOD + path.
const endpoints = new Map();
for (const c of calls) {
  const key = `${c.method} ${c.path}`;
  const e = endpoints.get(key) || { method: c.method, path: c.path, usedIn: [], clients: new Set(), sendsBody: false };
  e.usedIn.push(`${c.file}:${c.line}`); e.clients.add(c.client); e.sendsBody ||= c.body;
  endpoints.set(key, e);
}

/** Route pattern ("/users/:id", "/files/:path*") → anchored RegExp; literal parts are escaped. */
const pathRe = (p) => new RegExp("^" + p.split(/(:\w+\*?)/).map((part) =>
  /^:\w+\*$/.test(part) ? ".+" : /^:\w+$/.test(part) ? "[^/]+" : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("") + "$");
for (const e of endpoints.values()) {
  e.local = localRoutes.find((r) => pathRe(r.path).test(e.path.replace(/:\w+/g, "x")) && (r.methods.includes(e.method) || r.methods.includes("ANY") || r.methods.includes("?")));
}

let unmocked = null;
if (opt("mocks", null)) {
  let mocks;
  try { mocks = JSON.parse(readFileSync(opt("mocks"), "utf8")); } catch (err) { console.error(`✖ cannot read ${opt("mocks")}: ${err.message}`); process.exit(2); }
  const mb = (mocks.base ?? "/api").replace(/\/$/, "");
  const mockRoutes = Object.keys(mocks.routes || {}).flatMap((k) => { const [m, p] = k.trim().split(/\s+/); return m && p ? [{ m: m.toUpperCase(), re: pathRe(p.replace(/\/$/, "")) }] : []; });
  unmocked = [...endpoints.values()].filter((e) => {
    const sample = e.path.replace(/:\w+/g, "1");
    if (mockRoutes.some((r) => r.m === e.method && r.re.test(sample))) return false;
    const seg = sample.startsWith(mb + "/") ? sample.slice(mb.length).split("/").filter(Boolean) : null;
    return !(seg && mocks.collections && Object.hasOwn(mocks.collections, seg[0]) && seg.length <= 2);
  });
}
const list = [...endpoints.values()].sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

if (mocksOut) {
  const out = { base: "", collections: {}, schemas: {}, routes: {} };
  for (const e of list) {
    const status = e.method === "POST" ? 201 : e.method === "DELETE" ? 204 : 200;
    const isList = e.method === "GET" && !/:\w+$/.test(e.path);
    const idParam = e.path.match(/:(\w+)$/)?.[1];
    const sample = { id: idParam ? `{{params.${idParam}}}` : 1, TODO: "replace with realistic sample data" };
    out.routes[`${e.method} ${e.path}`] = status === 204 ? { status } : { status, body: isList ? [{ id: 1, TODO: "replace with realistic sample data" }] : sample };
  }
  writeFileSync(mocksOut, JSON.stringify(out, null, 2) + "\n");
}
if (contractOut) {
  const md = [`# API contract (draft)\n`, `Generated by \`endpoints.mjs\` from the frontend's calls on ${new Date().toISOString().slice(0, 10)}. The backend team fills in`,
    `shapes; both sides agree before building. Errors use RFC 9457 problem details (\`application/problem+json\`).`,
    baseUrls.size ? `\nBase URL env vars in use: ${[...baseUrls].map((v) => `\`${v}\``).join(", ")}\n` : "",
    `| Method | Path | Used in | Status |`, `|---|---|---|---|`,
    ...list.map((e) => `| ${e.method} | \`${e.path}\` | ${e.usedIn.length} place(s) | ${e.local ? "implemented locally" : "needs backend"} |`), ""];
  for (const e of list) md.push(`## ${e.method} ${e.path}`, `- **Used in:** ${e.usedIn.join(", ")}`, `- **Auth:** <public | user | admin>`,
    ...(e.path.includes(":") ? [`- **Path params:** ${[...e.path.matchAll(/:(\w+)/g)].map((x) => `\`${x[1]}\` <type>`).join(", ")}`] : []),
    ...(e.method === "GET" ? [`- **Query:** <filters, sort, pagination (page/limit or cursor)>`] : []),
    ...(e.sendsBody || ["POST", "PUT", "PATCH"].includes(e.method) ? [`- **Request body:** \`{ <field>: <type> }\` — validation rules: <…>`] : []),
    `- **Success:** \`${e.method === "POST" ? 201 : e.method === "DELETE" ? 204 : 200}\` \`{ <shape> }\``,
    `- **Errors:** 400 malformed · 401 not signed in · 403 not allowed · 404 not found · 409 conflict · 422 field errors \`{ errors: [{ field, message }] }\` · 429 rate limited · 5xx`,
    `- **UI states this drives:** loading · empty · error · success${e.method !== "GET" ? " · optimistic / pending" : ""}`, "");
  writeFileSync(contractOut, md.join("\n"));
}

if (json) {
  console.log(JSON.stringify({ root, endpoints: list.map((e) => ({ ...e, clients: [...e.clients], local: e.local?.file || null })), localRoutes, serverActions: actions, baseUrlEnv: [...baseUrls], unmocked: unmocked?.map((e) => `${e.method} ${e.path}`) ?? null }, null, 2));
} else {
  console.log(`API calls found in ${root}: ${list.length} endpoint(s) from ${calls.length} call site(s)\n`);
  console.log("METHOD  PATH                                     USED  WHERE");
  for (const e of list) console.log(`${e.method.padEnd(7)} ${e.path.slice(0, 40).padEnd(40)} ${String(e.usedIn.length).padStart(4)}  ${e.usedIn[0]}${e.usedIn.length > 1 ? ` +${e.usedIn.length - 1}` : ""}${e.local ? "  (local route)" : ""}`);
  if (localRoutes.length) { console.log(`\nLOCAL API ROUTES (${localRoutes.length})`); for (const r of localRoutes) console.log(`  ${r.methods.join(",").padEnd(16)} ${r.path}  ${r.file}`); }
  if (actions.length) { console.log(`\nSERVER ACTIONS (${actions.length})`); for (const a of actions) console.log(`  ${a.name}()  ${a.file}:${a.line}`); }
  if (baseUrls.size) console.log(`\nBASE URL ENV VARS: ${[...baseUrls].join(", ")}`);
  if (unmocked) console.log(unmocked.length ? `\nNOT MOCKED (${unmocked.length}): ${unmocked.map((e) => `${e.method} ${e.path}`).join(" · ")}` : "\n✓ every endpoint used has a mock");
  if (contractOut) console.log(`\nwrote ${opt("contract")}`);
  if (mocksOut) console.log(`wrote ${opt("mocks-out")} — run: node mock-api.mjs ${basename(opt("mocks-out"))}`);
  if (scanned >= MAX_FILES) console.log(`\n▲ stopped after ${MAX_FILES} files — point it at the source folder (e.g. src/) for a full scan.`);
  console.log("\nRegex heuristics: dynamic URLs built far from the call (e.g. url = base + path) are not resolved — grep for them.");
}
