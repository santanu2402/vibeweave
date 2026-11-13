#!/usr/bin/env node
// Mock backend for building and testing frontends before (or without) the real API.
// Zero dependencies (Node ≥ 18). In-memory; resets on restart.
//
//   node mock-api.mjs --init                         write a starter mocks.json
//   node mock-api.mjs [mocks.json] [--port 4010] [--host 127.0.0.1] [--delay 300|200-900] [--fail 0.05] [--openapi spec.json] [--quiet]
//
// What it serves:
//   • collections → full REST:  GET/POST /api/<col>   GET/PUT/PATCH/DELETE /api/<col>/:id
//       list query: ?field=value  ?q=text  ?_sort=field&_order=desc  ?_page=2&_limit=10  (X-Total-Count header)
//       "schemas": { "<col>": { "required": ["name"], "unique": ["email"] } } → 422 with field errors (test form error UI)
//   • routes → "METHOD /path/:param": response | [ { "when": {"body.email": "x"}, …response }, …fallback ]
//       response = { "status": 200, "body": …, "headers": {}, "delay": 1500 }   templates: {{uuid}} {{now}} {{params.id}} {{query.x}} {{body.x}}
//   • --openapi spec.json → every operation answers with its example (or a value generated from the schema)
//   • force a UI state from the client: header  x-mock-scenario: error | slow | empty | unauthorized | forbidden | notfound | invalid
//     (or query ?__scenario=empty) — deterministic loading / empty / error states for QA
//   Errors use RFC 9457 problem details (application/problem+json).
// Security: development tool only — never deploy it. It listens on loopback (127.0.0.1 and ::1) unless --host says
// otherwise, has open CORS, caps request bodies at 1 MB and drops __proto__/constructor/prototype keys from JSON bodies.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i === -1 ? fallback : argv[i + 1]; };
const VALUE_FLAGS = ["--port", "--host", "--delay", "--fail", "--openapi"];
const file = argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.includes(argv[i - 1]));
const port = parseInt(opt("port", process.env.PORT || "4010"), 10);
const hostFlag = opt("host", null);
const delaySpec = opt("delay", "0");
const failRate = parseFloat(opt("fail", "0"));
const quiet = argv.includes("--quiet");
const MAX_BODY = 1024 * 1024;
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error(`✖ invalid --port "${opt("port")}"`); process.exit(2); }

const STARTER = {
  base: "/api",
  collections: {
    studios: [
      { id: 1, name: "Clay Corner", city: "Austin", wheels: 8, rating: 4.8 },
      { id: 2, name: "Kiln & Co", city: "Denver", wheels: 5, rating: 4.6 },
    ],
    bookings: [],
  },
  schemas: { bookings: { required: ["studioId", "date", "email"], unique: [] } },
  routes: {
    "GET /api/me": { status: 200, body: { id: "u_1", name: "Ana Ortiz", email: "ana@example.com" } },
    "POST /api/login": [
      { when: { "body.password": "wrong" }, status: 401, body: { type: "about:blank", title: "Invalid email or password", status: 401 } },
      { status: 200, body: { token: "dev-token-{{uuid}}", user: { email: "{{body.email}}" } } },
    ],
    "GET /api/studios/:id/availability": { status: 200, delay: 600, body: { studioId: "{{params.id}}", slots: ["10:00", "13:00", "17:30"] } },
  },
};

if (argv.includes("--init")) {
  const target = resolve(file || "mocks.json");
  if (existsSync(target)) { console.error(`${target} already exists — not overwriting.`); process.exit(2); }
  writeFileSync(target, JSON.stringify(STARTER, null, 2) + "\n");
  console.log(`wrote ${target}\nrun: node mock-api.mjs ${file || "mocks.json"}`);
  process.exit(0);
}

/** Parse JSON without letting prototype-polluting keys through (JSON.parse reviver deletes them). */
const safeParse = (text) => JSON.parse(text, (k, v) => (UNSAFE_KEYS.has(k) ? undefined : v));

function readJsonFile(p, label) {
  try { return safeParse(readFileSync(resolve(p), "utf8")); }
  catch (e) { console.error(`✖ cannot read ${label} ${p}: ${e.message}`); process.exit(2); }
}

const config = file ? readJsonFile(file, "mocks file") : (argv.includes("--openapi") ? { base: "" } : STARTER);
const base = (config.base ?? "/api").replace(/\/$/, "");
const db = structuredClone(config.collections || {});
const schemas = config.schemas || {};
const nextId = {};
for (const [k, rows] of Object.entries(db)) {
  if (!Array.isArray(rows)) { console.error(`✖ collections.${k} must be an array`); process.exit(2); }
  nextId[k] = rows.reduce((m, r) => (typeof r?.id === "number" && r.id > m ? r.id : m), 0) + 1;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Routes: "GET /api/x/:id" → anchored regex + ordered param names.
const routes = Object.entries(config.routes || {}).flatMap(([key, spec]) => {
  const [method, path] = key.trim().split(/\s+/);
  if (!method || !path?.startsWith("/")) { console.error(`▲ skipped route "${key}" (expected "METHOD /path")`); return []; }
  const names = [];
  const pattern = path.replace(/\/$/, "").split(/(:[A-Za-z_]\w*)/).map((part) =>
    part.startsWith(":") ? (names.push(part.slice(1)), "([^/]+)") : escapeRe(part)).join("");
  return [{ method: method.toUpperCase(), path, re: new RegExp(`^${pattern}/?$`), names, spec }];
});

// OpenAPI (JSON): respond with examples, or a value synthesized from the schema.
if (opt("openapi", null)) {
  const spec = readJsonFile(opt("openapi"), "OpenAPI spec");
  const refOf = (s) => (s && s.$ref ? s.$ref.split("/").slice(1).reduce((o, k) => (o && Object.hasOwn(o, k) ? o[k] : undefined), spec) : s);
  const sample = (schema, depth = 0) => {
    schema = refOf(schema) || {};
    if (depth > 6) return null; // guards against recursive $ref cycles
    if (schema.example !== undefined) return schema.example;
    if (schema.examples?.length) return schema.examples[0];
    if (schema.enum) return schema.enum[0];
    if (schema.allOf) return Object.assign({}, ...schema.allOf.map((s) => sample(s, depth + 1)));
    if (schema.oneOf || schema.anyOf) return sample((schema.oneOf || schema.anyOf)[0], depth + 1);
    const t = Array.isArray(schema.type) ? schema.type[0] : schema.type || (schema.properties ? "object" : schema.items ? "array" : "string");
    if (t === "object") return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, v]) => [k, sample(v, depth + 1)]));
    if (t === "array") return [sample(schema.items, depth + 1)];
    if (t === "integer" || t === "number") return schema.minimum ?? 1;
    if (t === "boolean") return true;
    return { "date-time": new Date().toISOString(), date: new Date().toISOString().slice(0, 10), email: "user@example.com", uuid: randomUUID(), uri: "https://example.com" }[schema.format] || "string";
  };
  const prefix = (spec.servers?.[0]?.url || "").replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "");
  for (const [p, item] of Object.entries(spec.paths || {})) {
    for (const [m, op] of Object.entries(item || {})) {
      if (!/^(get|post|put|patch|delete)$/.test(m)) continue;
      const [code, resp] = Object.entries(op?.responses || {}).find(([c]) => /^2/.test(c)) || ["200", {}];
      const media = refOf(resp)?.content?.["application/json"];
      const body = media?.example ?? (media?.examples ? refOf(Object.values(media.examples)[0])?.value : undefined) ?? (media?.schema ? sample(media.schema) : code === "204" ? undefined : {});
      const names = [];
      const pattern = (prefix + p).split(/(\{[^}]+\})/).map((part) =>
        /^\{[^}]+\}$/.test(part) ? (names.push(part.slice(1, -1)), "([^/]+)") : escapeRe(part)).join("");
      routes.push({ method: m.toUpperCase(), path: prefix + p, re: new RegExp(`^${pattern}/?$`), names, spec: { status: parseInt(code, 10) || 200, body } });
    }
  }
}

// RFC 9457 problem details: JSON Pointer + detail, with field + message duplicated for simpler client mapping.
const fieldError = (field, message) => ({ pointer: `#/${field}`, detail: message, field, message });
const problem = (status, title, extra = {}) => ({ status, headers: { "content-type": "application/problem+json" }, body: { type: "about:blank", title, status, ...extra } });

/** Read a dotted path ("body.user.email") using own properties only, so templates can't reach prototypes. */
const get = (obj, path) => path.split(".").reduce((o, k) => (o != null && typeof o === "object" && Object.hasOwn(o, k) ? o[k] : undefined), obj);

/** Expand {{uuid}} {{now}} {{params.x}} {{query.x}} {{body.x}} {{headers.x}} in a response template. A string that is
 *  exactly one placeholder keeps the value's type (number, object…); otherwise values are interpolated as text. */
const fill = (v, ctx) => {
  if (typeof v === "string") {
    const whole = v.match(/^\{\{([\w.-]+)\}\}$/);
    if (whole && !["uuid", "now"].includes(whole[1])) { const val = get(ctx, whole[1]); return val === undefined ? v : val; }
    return v.replace(/\{\{([\w.-]+)\}\}/g, (_, k) => (k === "uuid" ? randomUUID() : k === "now" ? new Date().toISOString() : String(get(ctx, k) ?? "")));
  }
  if (Array.isArray(v)) return v.map((x) => fill(x, ctx));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x, ctx)]));
  return v;
};

/** Delay for this response: a route's own delay wins, else --delay (fixed "300" or random range "200-900"). */
const delayMs = (override) => {
  if (override != null) return override;
  const [a, b] = delaySpec.split("-").map(Number);
  return b ? a + Math.random() * (b - a) : a || 0;
};

/** Apply a collection's schema (required / unique fields) → a 422 problem, or null when the row is valid. */
function validate(col, row, id) {
  const s = schemas[col];
  if (!s) return null;
  const errors = [];
  for (const f of s.required || []) if (row[f] === undefined || row[f] === null || row[f] === "") errors.push(fieldError(f, `${f} is required`));
  for (const f of s.unique || []) if (row[f] !== undefined && db[col].some((r) => r[f] === row[f] && String(r.id) !== String(id))) errors.push(fieldError(f, `${f} is already taken`));
  return errors.length ? problem(422, "Validation failed", { errors }) : null;
}

/** REST over an in-memory collection: list (filter, search, sort, paginate), create, read, replace, update, delete. */
function collection(method, parts, query, body) {
  const [col, id, ...rest] = parts;
  if (!col || !Object.hasOwn(db, col) || rest.length) return null;
  const rows = db[col];
  const idx = id === undefined ? -1 : rows.findIndex((r) => String(r.id) === id);
  if (id === undefined && method === "GET") {
    let out = rows.filter((r) => Object.entries(query).every(([k, v]) => k.startsWith("_") || k === "q" || String(r[k]) === v));
    if (query.q) out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(query.q.toLowerCase()));
    if (query._sort) { const k = query._sort, dir = query._order === "desc" ? -1 : 1; out = [...out].sort((a, b) => (a[k] > b[k] ? dir : a[k] < b[k] ? -dir : 0)); }
    const total = out.length;
    if (query._page || query._limit) {
      const lim = Math.max(1, parseInt(query._limit || "10", 10) || 10), page = Math.max(1, parseInt(query._page || "1", 10) || 1);
      out = out.slice((page - 1) * lim, page * lim);
    }
    return { status: 200, headers: { "x-total-count": String(total), "access-control-expose-headers": "X-Total-Count" }, body: out };
  }
  if (id === undefined && method === "POST") {
    if (!body || typeof body !== "object" || Array.isArray(body)) return problem(400, "Request body must be a JSON object");
    const row = { id: nextId[col]++, ...body };
    const invalid = validate(col, row);
    if (invalid) { nextId[col]--; return invalid; }
    rows.push(row);
    return { status: 201, headers: { location: `${base}/${col}/${row.id}` }, body: row };
  }
  if (id === undefined) return problem(405, `${method} not allowed on ${base}/${col}`);
  if (idx === -1) return problem(404, `${col} ${id} not found`);
  if (method === "GET") return { status: 200, body: rows[idx] };
  if (method === "PUT" || method === "PATCH") {
    if (!body || typeof body !== "object" || Array.isArray(body)) return problem(400, "Request body must be a JSON object");
    const row = method === "PUT" ? { ...body, id: rows[idx].id } : { ...rows[idx], ...body, id: rows[idx].id };
    const invalid = validate(col, row, rows[idx].id);
    if (invalid) return invalid;
    rows[idx] = row;
    return { status: 200, body: row };
  }
  if (method === "DELETE") { rows.splice(idx, 1); return { status: 204 }; }
  return problem(405, `${method} not allowed`);
}

const SCENARIOS = {
  error: () => problem(500, "Internal Server Error (mock scenario)"),
  unauthorized: () => problem(401, "Authentication required (mock scenario)"),
  forbidden: () => problem(403, "You don't have access to this (mock scenario)"),
  notfound: () => problem(404, "Not found (mock scenario)"),
  invalid: () => problem(422, "Validation failed (mock scenario)", { errors: [fieldError("email", "Enter a valid email address")] }),
  empty: (method) => (method === "GET" ? { status: 200, headers: { "x-total-count": "0" }, body: [] } : { status: 204 }),
};

/** Read the request body up to MAX_BODY bytes; resolves null when it is larger (the rest is drained by the caller). */
const readBody = (req) => new Promise((done, fail) => {
  if (Number(req.headers["content-length"] || 0) > MAX_BODY) return done(null);
  const chunks = []; let size = 0, finished = false;
  req.on("data", (c) => {
    if (finished) return;
    size += c.length;
    if (size > MAX_BODY) { finished = true; done(null); } else chunks.push(c);
  });
  req.on("end", () => { if (!finished) { finished = true; done(Buffer.concat(chunks).toString("utf8")); } });
  req.on("error", (e) => { if (!finished) { finished = true; fail(e); } });
});

async function handler(req, res) {
  const started = Date.now();
  const method = (req.method || "GET").toUpperCase();
  let scenario = "";
  // CORS: credentialed access only for local dev origins (localhost, 127.0.0.1, [::1]) so a website you
  // happen to visit can't read the mock's data; any other origin gets a non-credentialed wildcard.
  const origin = String(req.headers.origin || "");
  const localOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
  const cors = { "access-control-allow-origin": localOrigin ? origin : "*", ...(localOrigin ? { "access-control-allow-credentials": "true" } : {}),
    "access-control-allow-headers": req.headers["access-control-request-headers"] || "content-type, authorization, x-mock-scenario",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", vary: "Origin", "x-content-type-options": "nosniff" };
  const send = (o) => {
    const headers = { ...cors, ...(o.body !== undefined ? { "content-type": "application/json" } : {}), ...(o.headers || {}) };
    res.writeHead(o.status, headers);
    res.end(o.body === undefined ? undefined : JSON.stringify(o.body));
    if (!quiet) console.log(`${method.padEnd(6)} ${String(req.url).slice(0, 200).padEnd(40)} ${o.status}  ${Date.now() - started}ms${scenario ? `  [scenario: ${scenario}]` : ""}`);
  };

  // A mock must never die on a bad request — report it as a problem response instead.
  try {
    if (method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url || "/", "http://localhost");
    const query = Object.fromEntries(url.searchParams);
    scenario = String(req.headers["x-mock-scenario"] || query.__scenario || "").toLowerCase();
    const path = url.pathname.replace(/\/$/, "") || "/";

    const raw = await readBody(req);
    if (raw === null) {
      // Keep reading (and discarding) what the client is still uploading: closing a socket with unread data sends a
      // TCP reset, which can wipe out the 413 before the client reads it (so no "Connection: close" here — Node would
      // destroy the socket right after the answer). A client that keeps streaming is cut off after 5 s or 16 MB, so
      // this can't be used to hold the mock open.
      let drained = 0;
      const cut = setTimeout(() => req.destroy(), 5000);
      req.on("data", (c) => { drained += c.length; if (drained > 16 * MAX_BODY) req.destroy(); });
      req.on("end", () => clearTimeout(cut));
      req.on("close", () => clearTimeout(cut));
      req.resume();
      return send({ ...problem(413, "Request body too large", { detail: `The mock accepts up to ${MAX_BODY} bytes.` }), headers: { "content-type": "application/problem+json" } });
    }
    let body;
    try { body = raw ? safeParse(raw) : undefined; } catch { return send(problem(400, "Malformed JSON body")); }

    let out = null, routeDelay = null;
    if (scenario === "slow") routeDelay = 3000;
    else if (Object.hasOwn(SCENARIOS, scenario)) out = SCENARIOS[scenario](method);
    if (!out && failRate > 0 && Math.random() < failRate) out = problem(503, "Service unavailable (random --fail)");

    try { decodeURIComponent(path); } catch { return send(problem(400, "Malformed URL encoding")); }
    const decode = decodeURIComponent;

    if (!out) for (const r of routes) {
      if (r.method !== method) continue;
      const m = path.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.names.map((n, i) => [n, decode(m[i + 1])]));
      const ctx = { params, query, body: body || {}, headers: req.headers };
      const variants = Array.isArray(r.spec) ? r.spec : [r.spec];
      const chosen = variants.find((v) => !v.when || Object.entries(v.when).every(([k, val]) => String(get(ctx, k)) === String(val))) || variants[variants.length - 1];
      out = { status: chosen.status || 200, headers: chosen.headers || {}, body: fill(chosen.body, ctx) };
      if (chosen.delay != null) routeDelay = chosen.delay;
      break;
    }
    if (!out && (path === base || path.startsWith(base + "/"))) out = collection(method, path.slice(base.length).split("/").filter(Boolean).map(decode), query, body);
    if (!out && path === "/__mock") out = { status: 200, body: { collections: Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length])), routes: routes.map((r) => `${r.method} ${r.path}`) } };
    if (!out) out = problem(404, `No mock for ${method} ${path}`, { hint: "add it to routes in mocks.json, or run endpoints.mjs --mocks-out to generate one" });

    const wait = delayMs(routeDelay);
    if (wait) await new Promise((r) => setTimeout(r, wait));
    send(out);
  } catch (e) {
    if (!res.headersSent) send(problem(500, "Mock server error", { detail: String(e?.message || e) }));
    else res.end();
  }
}

// Listen on both loopback addresses by default (so "localhost" works whether it resolves to IPv4 or IPv6);
// an explicit --host binds exactly that address. --port 0 picks a free port: the first address decides it, the
// second binds the same one, and the banner prints the real port.
const isLoopback = (h) => /^(127\.\d+\.\d+\.\d+|::1|localhost)$/i.test(h);
const hosts = hostFlag ? [hostFlag] : ["127.0.0.1", "::1"];
if (hostFlag && !isLoopback(hostFlag))
  console.warn(`▲ listening on ${hostFlag}: other machines on the network can reach this mock (open CORS, no auth). Use only on a trusted network.`);
/** Bind one address; resolves with the bound port, or null when an optional address (IPv6 loopback) is unavailable. */
const listenOn = (h, p) => new Promise((done) => {
  const srv = createServer(handler);
  srv.on("error", (e) => {
    if (!hostFlag && h === "::1") return done(null); // no IPv6 loopback here — IPv4 still serves
    console.error(`✖ cannot listen on ${h}:${p} (${e.code || e.message})`);
    process.exit(1);
  });
  srv.listen(p, h, () => done(srv.address().port));
});
const actualPort = await listenOn(hosts[0], port);
for (const h of hosts.slice(1)) await listenOn(h, actualPort);
const shown = hostFlag && !isLoopback(hostFlag) ? (hostFlag.includes(":") ? `[${hostFlag}]` : hostFlag) : "localhost";
console.log(`Mock API on http://${shown}:${actualPort}${base}  (${Object.keys(db).length} collections, ${routes.length} routes${opt("openapi") ? " incl. OpenAPI" : ""})`);
console.log(`Inspect: http://${shown}:${actualPort}/__mock · Force a state: header "x-mock-scenario: error|slow|empty|unauthorized|invalid"`);
if (!file && !opt("openapi")) console.log("Using the built-in sample data. Create your own with: node mock-api.mjs --init");
