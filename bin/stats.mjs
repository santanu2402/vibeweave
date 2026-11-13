#!/usr/bin/env node
// Local run statistics from .vibeweave/usage.jsonl (written by the Claude Code usage hook) — time and tokens per run, typical and worst case.
// Usage: npx vibeweave stats [project-dir] [--json]
//
// Nothing leaves the machine. Use it to estimate the cost of the next build at the TASKS.md gate ("a build like
// this usually takes ~N min and ~X tokens here"), and to spot runs that cost far more than usual.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const USAGE = "Usage: npx vibeweave stats [project-dir] [--json]";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { console.log(USAGE); process.exit(0); }
const bad = args.find((a) => a.startsWith("-") && a !== "--json");
const dirs = args.filter((a) => !a.startsWith("-"));
if (bad || dirs.length > 1) { console.error(`✖ ${bad ? `unknown option ${bad}` : "one project folder at most"}
${USAGE}`); process.exit(2); }
const dir = resolve(dirs[0] || process.cwd());
const file = join(dir, ".vibeweave", "usage.jsonl");
if (!existsSync(file)) {
  console.error(`No usage log at ${file}.\nIt is written by the Claude Code usage hook (npx vibeweave --agent claude). If your organization blocks hooks, use npx vibeweave usage after each run.`);
  process.exit(1);
}

const runs = [];
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  try {
    const r = JSON.parse(line);
    const run = r.run || {};
    const input = (Number(run.input) || 0) + (Number(run.cacheRead) || 0) + (Number(run.cacheWrite) || 0);
    runs.push({ at: String(r.at || ""), ms: Number(r.durationMs) || 0, input, fresh: (Number(run.input) || 0) + (Number(run.cacheWrite) || 0), output: Number(run.output) || 0, calls: Number(run.calls) || 0, subagents: Number(r.subagents) || 0 });
  } catch { /* skip a damaged line */ }
}
if (!runs.length) { console.error(`No readable runs in ${file}.`); process.exit(1); }

/** Nearest-rank percentile: the smallest value with at least p% of the runs at or below it. */
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.max(0, Math.ceil((p / 100) * s.length) - 1)]; };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const fmtN = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n)));
const fmtT = (ms) => { const s = Math.round(ms / 1000), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : m ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`; };
const col = (k) => runs.map((r) => r[k]);
const summary = {
  runs: runs.length, first: runs[0].at.slice(0, 10), last: runs.at(-1).at.slice(0, 10),
  total: { ms: sum(col("ms")), input: sum(col("input")), output: sum(col("output")) },
  typical: { ms: pct(col("ms"), 50), input: pct(col("input"), 50), output: pct(col("output"), 50) },
  worst90: { ms: pct(col("ms"), 90), input: pct(col("input"), 90), output: pct(col("output"), 90) },
  withSubagents: runs.filter((r) => r.subagents > 0).length,
};
// Outliers: runs that used more than 3x the typical input (needs 5+ runs to say what typical is).
const outliers = runs.length >= 5 ? runs.filter((r) => r.input > summary.typical.input * 3).slice(-5) : [];

if (args.includes("--json")) { console.log(JSON.stringify({ ...summary, outliers }, null, 2)); process.exit(0); }
console.log(`Vibeweave stats — ${dir}\n${summary.runs} run(s) · ${summary.first} → ${summary.last} · ${summary.withSubagents} used subagents\n`);
console.log(`              time        input       output`);
console.log(`typical      ${fmtT(summary.typical.ms).padEnd(11)} ${fmtN(summary.typical.input).padEnd(11)} ${fmtN(summary.typical.output)}`);
console.log(`90% under    ${fmtT(summary.worst90.ms).padEnd(11)} ${fmtN(summary.worst90.input).padEnd(11)} ${fmtN(summary.worst90.output)}`);
console.log(`total        ${fmtT(summary.total.ms).padEnd(11)} ${fmtN(summary.total.input).padEnd(11)} ${fmtN(summary.total.output)}`);
if (outliers.length) { console.log(`\nUnusually expensive runs (more than 3× the typical input):`); for (const o of outliers) console.log(`  ${o.at.slice(0, 16).replace("T", " ")}  ${fmtT(o.ms)} · input ${fmtN(o.input)} · output ${fmtN(o.output)}`); }
console.log(`\nEstimate for the next run like these: ~${fmtT(summary.typical.ms)} and ~${fmtN(summary.typical.input)} input tokens (up to ${fmtT(summary.worst90.ms)} / ${fmtN(summary.worst90.input)}).`);
