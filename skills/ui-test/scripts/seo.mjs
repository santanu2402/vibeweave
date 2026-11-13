#!/usr/bin/env node
// SEO and share-preview check: title, description, canonical, lang, viewport, h1, Open Graph / Twitter cards (image fetched and measured), JSON-LD, robots.txt and sitemap.
// Usage: node seo.mjs <url> [--pages /docs/,/pricing] [--json] [--strict] [--out .design-review] [--max-time 300]
//
// Zero dependencies, no browser: reads the HTML the server sends (what crawlers and link unfurlers see).
// Findings: ERROR = missing or broken (no title, invalid JSON-LD, share image 404) · WARN = weak (length out of
// range, small share image, page missing from the sitemap) · INFO = advice. --strict exits 1 on any ERROR.
// A share image hosted on a domain that isn't deployed yet is reported as a WARN, not an error.
// --max-time: budget for the whole run (default 300 s); a run it stops prints INCOMPLETE and exits 124.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// --help / -h: print the header comment above and exit.
if (process.argv.slice(2).some((a) => a === "--help" || a === "-h")) {
  const head = [];
  for (const line of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!line.startsWith("//")) break; head.push(line.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n"));
  process.exit(0);
}

const USAGE = "Usage: node seo.mjs <url> [--pages /docs/,/pricing] [--json] [--strict] [--out .design-review] [--max-time 300]";
const argv = process.argv.slice(2);
const VALUE_FLAGS = new Set(["--pages", "--out", "--max-time"]), BOOL_FLAGS = new Set(["--json", "--strict"]);
const values = {};
let target;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) {
    if (argv[i + 1] == null || argv[i + 1].startsWith("--")) { console.error(`✖ ${a} needs a value\n${USAGE}`); process.exit(2); }
    values[a] = argv[++i];
  } else if (BOOL_FLAGS.has(a)) values[a] = true;
  else if (a.startsWith("--")) { console.error(`✖ unknown option ${a}\n${USAGE}`); process.exit(2); }
  else if (target) { console.error(`✖ unexpected argument ${a} (one URL; more pages go in --pages)\n${USAGE}`); process.exit(2); }
  else target = a;
}
const flag = (name) => values[name];
if (!target) { console.error(USAGE); process.exit(2); }
// Whole-run budget: a run stopped by it is INCOMPLETE (exit 124), never a pass.
const budget = Math.min(Math.max(Number(flag("--max-time")) || 300, 10), 7200);
setTimeout(() => { console.error(`INCOMPLETE — not verified: the SEO check stopped after ${budget}s (--max-time); the server is too slow or unreachable`); process.exit(124); }, budget * 1000).unref();
let start;
try { start = new URL(/^https?:\/\//i.test(target) ? target : `http://${target}`); } catch { console.error(`✖ not a URL: ${target}`); process.exit(2); }
if (!/^https?:$/.test(start.protocol)) { console.error("✖ only http(s) URLs are supported"); process.exit(2); }
const pages = [start.href, ...(flag("--pages") || "").split(",").map((p) => p.trim().replace(/^[A-Za-z]:[\/](?:.*?[\/])?Git[\/]/i, "/")).filter(Boolean).map((p) => new URL(p, start).href)];
const outDir = resolve(flag("--out") || ".design-review");
const json = !!flag("--json"), strict = !!flag("--strict");

/** fetch with a timeout and a size cap; returns { ok, status, type, buf } or { error }. A connection the server
 *  closed just as it was reused (keep-alive race: ECONNRESET, "other side closed") is retried once, as browsers do. */
async function get(url, opts = {}) {
  const r = await getOnce(url, opts);
  return r.error && /ECONNRESET|EPIPE|UND_ERR_SOCKET|ECONNABORTED/.test(r.error) ? getOnce(url, opts) : r;
}
async function getOnce(url, { method = "GET", max = 5_000_000 } = {}) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { error: "not http(s)" };
    const res = await fetch(u, { method, redirect: "follow", signal: AbortSignal.timeout(30_000), headers: { "user-agent": "VibeweaveSEO/1 (+https://github.com/santanu2402/vibeweave)" } });
    const type = res.headers.get("content-type") || "";
    if (method === "HEAD") return { ok: res.ok, status: res.status, type, size: Number(res.headers.get("content-length")) || 0 };
    const reader = res.body?.getReader();
    const chunks = []; let size = 0;
    while (reader) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > max) { reader.cancel(); return { error: `larger than ${Math.round(max / 1e6)} MB` }; } chunks.push(value); }
    return { ok: res.ok, status: res.status, type, buf: Buffer.concat(chunks), finalUrl: res.url };
  } catch (e) { return { error: String(e.cause?.code || e.name || e.message) }; }
}

/** Width × height from PNG / JPEG / GIF / WebP headers (enough to judge a share image). */
function imageSize(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF") return [b.readUInt16LE(6), b.readUInt16LE(8)];
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const kind = b.toString("ascii", 12, 16);
    if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i + 9 < b.length;) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1], len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + len;
    }
  }
  return null;
}

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").trim();
const attr = (tag, name) => decode(tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(2).find((x) => x !== undefined) ?? "");
const metaTags = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
const meta = (html, key) => { for (const t of metaTags(html)) { const k = attr(t, "property") || attr(t, "name"); if (k.toLowerCase() === key) return attr(t, "content"); } return ""; };
const clean = (s) => String(s).replace(/[\u0000-\u001f\u007f-\u009f]/g, "").slice(0, 160);

const findings = [];
const add = (sev, page, check, msg) => findings.push({ sev, page: new URL(page).pathname, check, msg: clean(msg) });

// Site-wide: robots.txt and sitemap
const robots = await get(new URL("/robots.txt", start).href, { max: 500_000 });
const robotsText = robots.ok ? robots.buf.toString("utf8") : "";
if (!robots.ok) add("warn", start.href, "robots", `robots.txt not found (${robots.status || robots.error}) — add one with a Sitemap line`);
const sitemapUrl = robotsText.match(/^\s*sitemap:\s*(\S+)/im)?.[1];
let sitemapPaths = null;
for (const url of [sitemapUrl && new URL(new URL(sitemapUrl).pathname, start).href, new URL("/sitemap.xml", start).href].filter(Boolean)) {
  const sm = await get(url, { max: 10_000_000 });
  if (sm.ok) { sitemapPaths = new Set([...sm.buf.toString("utf8").matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => { try { return new URL(decode(m[1])).pathname; } catch { return ""; } })); break; }
}
if (!sitemapPaths) add("warn", start.href, "sitemap", "no sitemap.xml found (robots.txt Sitemap line or /sitemap.xml)");
if (robotsText && /^\s*disallow:\s*\/\s*$/im.test(robotsText)) add("warn", start.href, "robots", "robots.txt disallows everything (Disallow: /) — intended only for staging");

for (const page of pages) {
  const res = await get(page);
  if (res.error || !res.ok) { add("error", page, "http", `could not load the page: ${res.error || `HTTP ${res.status}`}`); continue; }
  if (!/html/i.test(res.type)) { add("error", page, "http", `served as ${res.type || "unknown type"}, not HTML`); continue; }
  const html = res.buf.toString("utf8");
  const head = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] || html;
  const noindex = /noindex/i.test(meta(head, "robots"));

  const lang = attr(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang");
  if (!lang) add("error", page, "lang", "<html> has no lang attribute (screen readers and search engines need it)");
  if (!meta(head, "viewport")) add("error", page, "viewport", "no <meta name=\"viewport\"> — the page won't scale on phones");

  const title = decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
  if (!title) add("error", page, "title", "missing <title>");
  else if (title.length > 60) add("warn", page, "title", `title is ${title.length} characters — results truncate around 60: "${title}"`);
  else if (title.length < 15) add("warn", page, "title", `title is only ${title.length} characters — say what the page is: "${title}"`);

  const desc = meta(head, "description");
  if (!desc) add(noindex ? "info" : "error", page, "description", "missing meta description");
  else if (desc.length > 160) add("warn", page, "description", `description is ${desc.length} characters — snippets truncate around 155–160`);
  else if (desc.length < 50) add("warn", page, "description", `description is only ${desc.length} characters — aim for 50–160`);

  const canonicalTag = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => /\brel\s*=\s*["']?canonical/i.test(t));
  const canonical = canonicalTag ? attr(canonicalTag, "href") : "";
  if (!canonical && !noindex) add("warn", page, "canonical", "no <link rel=\"canonical\"> — duplicates (query strings, trailing slashes) split ranking");
  if (canonical) { try { const c = new URL(canonical, page); if (new URL(page).pathname !== c.pathname) add("info", page, "canonical", `canonical points to a different path: ${c.pathname}`); } catch { add("error", page, "canonical", `canonical is not a valid URL: ${canonical}`); } }

  const h1s = (html.match(/<h1\b/gi) || []).length;
  if (h1s === 0) add("warn", page, "h1", "no <h1> on the page");
  else if (h1s > 1) add("warn", page, "h1", `${h1s} <h1> elements — use one per page`);

  const icon = [...head.matchAll(/<link\b[^>]*>/gi)].some((m) => /\brel\s*=\s*["'][^"']*icon/i.test(m[0]));
  if (!icon) add("warn", page, "favicon", "no <link rel=\"icon\">");

  // Open Graph + Twitter
  for (const key of ["og:title", "og:description", "og:image", "og:url", "og:type"]) if (!meta(head, key) && !noindex) add(key === "og:image" || key === "og:title" ? "error" : "warn", page, "open-graph", `missing <meta property="${key}">`);
  if (!meta(head, "twitter:card") && !noindex) add("warn", page, "twitter", "missing <meta name=\"twitter:card\"> (summary_large_image for a big preview)");
  const ogImage = meta(head, "og:image");
  if (ogImage) {
    let imgUrl; try { imgUrl = new URL(ogImage, page); } catch { add("error", page, "share-image", `og:image is not a valid URL: ${ogImage}`); }
    if (imgUrl) {
      if (!/^https?:\/\//i.test(ogImage)) add("warn", page, "share-image", "og:image should be an absolute URL — many unfurlers ignore relative ones");
      if (!meta(head, "og:image:alt")) add("info", page, "share-image", "add og:image:alt (described to screen-reader users in some apps)");
      // Measure the image; a production-domain image that isn't deployed yet can be measured from this host instead.
      let img = await get(imgUrl.href, { max: 8_000_000 });
      let note = "";
      if ((img.error || !img.ok) && imgUrl.host !== new URL(page).host) {
        const local = await get(new URL(imgUrl.pathname, page).href, { max: 8_000_000 });
        if (local.ok) { img = local; note = ` (measured from ${new URL(page).host}; ${imgUrl.host} unreachable — not deployed yet?)`; }
      }
      if (img.error || !img.ok) add(imgUrl.host === new URL(page).host ? "error" : "warn", page, "share-image", `og:image can't be fetched (${img.error || `HTTP ${img.status}`}): ${imgUrl.href}`);
      else {
        if (!/^image\//i.test(img.type)) add("error", page, "share-image", `og:image is served as ${img.type || "unknown type"}, not an image`);
        const size = imageSize(img.buf);
        if (img.buf.length > 5_000_000) add("warn", page, "share-image", `og:image is ${(img.buf.length / 1e6).toFixed(1)} MB — keep it under 5 MB (1 MB is safer)${note}`);
        if (size) {
          const [w, h] = size;
          if (w < 1200 || h < 630) add("warn", page, "share-image", `og:image is ${w}×${h} — use at least 1200×630 for large previews${note}`);
          else if (Math.abs(w / h - 1.91) > 0.15) add("info", page, "share-image", `og:image is ${w}×${h} (ratio ${(w / h).toFixed(2)}) — 1.91:1 avoids cropping${note}`);
        }
        const declared = [Number(meta(head, "og:image:width")), Number(meta(head, "og:image:height"))];
        if (size && declared[0] && declared[1] && (declared[0] !== size[0] || declared[1] !== size[1])) add("warn", page, "share-image", `og:image:width/height say ${declared.join("×")} but the image is ${size.join("×")}`);
      }
    }
  }

  // Structured data
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const data = JSON.parse(m[1]); if (!data["@context"] && !Array.isArray(data)) add("warn", page, "json-ld", "JSON-LD block has no @context"); }
    catch (e) { add("error", page, "json-ld", `JSON-LD doesn't parse: ${e.message}`); }
  }

  if (sitemapPaths && !noindex && !sitemapPaths.has(new URL(page).pathname)) add("warn", page, "sitemap", `${new URL(page).pathname} is not listed in the sitemap`);
  if (noindex) add("info", page, "robots", "page is marked noindex (fine for 404 and private pages)");
}

const counts = findings.reduce((a, f) => ((a[f.sev] = (a[f.sev] || 0) + 1), a), {});
const verdict = counts.error ? "FAIL" : counts.warn ? "CONCERNS" : "PASS";
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "seo.json"), JSON.stringify({ url: start.href, pages, verdict, counts, findings }, null, 2));
if (json) console.log(JSON.stringify({ url: start.href, verdict, counts, findings }, null, 2));
else {
  console.log(`SEO & share-preview check — ${start.origin} · ${pages.length} page(s)\n`);
  const icon = { error: "✖", warn: "▲", info: "·" };
  for (const sev of ["error", "warn", "info"]) for (const f of findings.filter((x) => x.sev === sev)) console.log(`  ${icon[sev]} [${f.check}] ${f.page} — ${f.msg}`);
  console.log(`\nVerdict: ${verdict} — ${counts.error || 0} errors, ${counts.warn || 0} warnings, ${counts.info || 0} info · report ${join(outDir, "seo.json")}`);
}
process.exitCode = strict && counts.error ? 1 : 0;
