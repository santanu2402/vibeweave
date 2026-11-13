#!/usr/bin/env node
// One-command quality scorecard for a running site: wiring, SEO & share previews, QA (desktop + mobile), responsive sweep and Core Web Vitals, at full fidelity.
// Usage: npx vibeweave check <url> [--pages docs/,pricing] [--runs 3] [--out .design-review] [--max-time <s per tool>] [--device mobile|desktop] [--github]
//
// Runs wiring, SEO, QA, responsive and vitals one after another (sequential = no CPU contention, so timings and click
// detection stay trustworthy), reads each tool's verdict, and writes <out>/SCORECARD.md + scorecard.json.
// Overall verdict: PASS only when every check passes and LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms on the vitals
// profile — mobile by default (4× CPU, slow 4G); --device desktop measures a fast desktop with no throttling, and
// the scorecard says which. Any run stopped by its time budget makes the result INCOMPLETE (never PASS).
// Needs Playwright in the project you test: npm i -D playwright && npx playwright install chromium
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILLS = join(dirname(fileURLToPath(import.meta.url)), "..", "skills");
const USAGE = "Usage: npx vibeweave check <url> [--pages docs/,pricing] [--runs 3] [--out .design-review] [--max-time <s per tool>] [--device mobile|desktop] [--github]";
const argv = process.argv.slice(2).filter((a, i) => !(i === 0 && a === "check"));
if (argv.includes("--help") || argv.includes("-h")) { console.log(USAGE); process.exit(0); }
const VALUE_FLAGS = new Set(["--pages", "--runs", "--out", "--max-time", "--device"]);
const values = {};
let start;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) {
    if (argv[i + 1] == null || argv[i + 1].startsWith("--")) { console.error(`✖ ${a} needs a value\n${USAGE}`); process.exit(2); }
    values[a] = argv[++i];
  } else if (a === "--github") values[a] = true;
  else if (a.startsWith("-")) { console.error(`✖ unknown option ${a}\n${USAGE}`); process.exit(2); }
  else if (start) { console.error(`✖ unexpected argument ${a} (one start URL; more pages go in --pages)\n${USAGE}`); process.exit(2); }
  else start = a;
}
if (!start) { console.error(USAGE); process.exit(2); }
if (!/^https?:\/\//i.test(start)) start = `http://${start}`;
let origin;
try { origin = new URL(start); } catch { console.error(`✖ not a URL: ${start}`); process.exit(2); }
const flag = (name, fallback) => values[name] ?? fallback;
if (values["--max-time"] !== undefined && !(Number(values["--max-time"]) > 0)) { console.error("✖ --max-time must be a number of seconds"); process.exit(2); }
const device = values["--device"] ?? "mobile";
if (!["mobile", "desktop"].includes(device)) { console.error(`✖ --device must be mobile or desktop\n${USAGE}`); process.exit(2); }
const profile = device === "desktop" ? "desktop, no throttling" : "mobile, 4× CPU, slow 4G";

// Preflight: fail in a second, not after five tools, when nothing listens at the start URL. A server that is only
// slow is still checked — each tool then reports it (a run cut short by its budget is INCOMPLETE).
try { await fetch(origin, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000) }); }
catch (e) {
  const why = String(e.cause?.code || e.name || e.message);
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|EHOSTUNREACH|ENETUNREACH|ECONNRESET/.test(why)) {
    console.error(`✖ ${origin.href} doesn't answer (${why}) — is the server running at that URL?`);
    process.exit(1);
  }
  console.error(`▲ ${origin.href} is slow to answer (${why}) — checking anyway`);
}
const pages = [origin.href, ...flag("--pages", "").split(",").map((p) => p.trim().replace(/^[A-Za-z]:[\/](?:.*?[\/])?Git[\/]/i, "/")).filter(Boolean).map((p) => new URL(p, origin).href)];
const runs = String(Math.min(Math.max(Number(flag("--runs", "3")) || 3, 1), 10));
const out = resolve(flag("--out", ".design-review"));
const maxTime = flag("--max-time", "");
mkdirSync(out, { recursive: true });

/** Run one tool as a child process; resolve with its exit code and captured output (also streamed live). */
function run(script, args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [join(SKILLS, script), ...args, ...(maxTime ? ["--max-time", maxTime] : [])], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
    let text = "";
    child.stdout.on("data", (d) => { text += d; process.stdout.write(d); });
    child.stderr.on("data", (d) => { text += d; process.stderr.write(d); });
    child.on("close", (code) => done({ code: code ?? 1, text }));
    child.on("error", (e) => done({ code: 1, text: String(e.message) }));
  });
}
const verdictOf = ({ code, text }) => {
  if (code === 124 || /^INCOMPLETE\b|Verdict:\s*INCOMPLETE/m.test(text)) return "INCOMPLETE";
  const m = text.match(/Verdict:\s*([A-Z]+)/);
  if (m) return m[1];
  return code === 0 ? "PASS" : "FAIL";
};
const slug = (u) => new URL(u).pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";

const rows = [];
const add = (check, page, verdict, numbers, report) => rows.push({ check, page: new URL(page).pathname, verdict, numbers, report });

console.log(`\nVibeweave check — ${origin.origin} · ${pages.length} page(s) · sequential, full fidelity\n`);

const w = await run("ui-test/scripts/wiring.mjs", [start, "--out", join(out, "wiring")]);
add("Wiring (links, anchors, buttons, 404)", start, verdictOf(w), (w.text.match(/\d+ pages? crawled/) || [""])[0], "wiring/wiring.json");

const seoPages = pages.slice(1).map((p) => new URL(p).pathname).join(",");
const seo = await run("ui-test/scripts/seo.mjs", [start, ...(seoPages ? ["--pages", seoPages] : []), "--out", join(out, "seo")]);
add("SEO & share previews (title, description, canonical, OG image, sitemap)", start, verdictOf(seo), (seo.text.match(/Verdict:[^\n]*— ([^·\n]*)/) || [, ""])[1].trim(), "seo/seo.json");

for (const page of pages) {
  for (const mobile of [false, true]) {
    const r = await run("ui-test/scripts/qa.mjs", [page, ...(mobile ? ["--mobile"] : []), "--out", join(out, "qa", `${slug(page)}-${mobile ? "mobile" : "desktop"}`)]);
    const counts = (r.text.match(/Verdict:[^\n]*— ([^\n]*)/) || [, ""])[1];
    add(`QA ${mobile ? "mobile 390" : "desktop 1280"} (axe, keyboard, motion, no-JS)`, page, verdictOf(r), counts, `qa/${slug(page)}-${mobile ? "mobile" : "desktop"}/qa.json`);
  }
  const s = await run("ui-test/scripts/responsive.mjs", [page, "--out", join(out, "responsive", slug(page))]);
  add("Responsive sweep (320 → 2560)", page, verdictOf(s), (s.text.match(/Verdict:[^\n]*— ([^·\n]*)/) || [, ""])[1].trim(), `responsive/${slug(page)}/responsive.json`);
  const vitalsDir = join(out, "vitals", slug(page)), vitalsFile = join(vitalsDir, "vitals.json");
  rmSync(vitalsFile, { force: true });
  const v = await run("ui-optimize/scripts/vitals.mjs", [page, "--runs", runs, ...(device === "desktop" ? ["--desktop"] : []), "--out", vitalsDir]);
  // Numbers come from the report this run wrote (the old one is deleted first; a failed run gives no numbers).
  let medians = null;
  if (v.code === 0 && existsSync(vitalsFile)) { try { medians = JSON.parse(readFileSync(vitalsFile, "utf8")).medians; } catch { medians = null; } }
  const lcp = medians?.lcp ?? null, cls = medians?.cls ?? null, tbt = medians?.tbt ?? null;
  let vv = verdictOf(v);
  if (vv !== "INCOMPLETE") vv = lcp === null || cls === null || tbt === null ? "FAIL" : lcp <= 2500 && cls <= 0.1 && tbt <= 200 ? "PASS" : "FAIL";
  add(`Core Web Vitals (${profile}, median of ${runs})`, page, vv, lcp === null ? "no measurement" : `LCP ${(lcp / 1000).toFixed(2)} s · CLS ${(cls ?? 0).toFixed(3)} · TBT ${Math.round(tbt ?? 0)} ms`, `vitals/${slug(page)}/vitals.json`);
}

const overall = rows.some((r) => r.verdict === "INCOMPLETE") ? "INCOMPLETE"
  : rows.some((r) => r.verdict === "FAIL") ? "FAIL" : rows.some((r) => r.verdict === "CONCERNS") ? "CONCERNS" : "PASS";
const md = [
  `# Vibeweave scorecard — ${origin.origin}`, "",
  `**Overall: ${overall}** · ${new Date().toISOString().slice(0, 16).replace("T", " ")} · budgets: LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms (${profile})`, "",
  "| Check | Page | Verdict | Numbers | Report |", "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.check} | \`${r.page}\` | **${r.verdict}** | ${r.numbers || ""} | \`${r.report}\` |`), "",
  overall === "INCOMPLETE" ? "> A run hit its time budget — results are **not verified**. Re-run with a larger `--max-time`." : "",
].join("\n");
writeFileSync(join(out, "SCORECARD.md"), md + "\n");
writeFileSync(join(out, "scorecard.json"), JSON.stringify({ origin: origin.origin, overall, device, profile, rows }, null, 2));
console.log(`\n${md}\n\nScorecard: ${join(out, "SCORECARD.md")}`);
// CI mode: GitHub Actions annotations for every check that didn't pass.
if (argv.includes("--github")) {
  for (const r of rows) {
    if (r.verdict === "PASS") continue;
    const level = r.verdict === "CONCERNS" ? "warning" : "error";
    console.log(`::${level} title=Vibeweave ${r.verdict}: ${r.check}::${r.page} — ${r.numbers || "see report"} (.design-review/${r.report})`);
  }
}
process.exit(overall === "PASS" ? 0 : overall === "INCOMPLETE" ? 124 : 1);
