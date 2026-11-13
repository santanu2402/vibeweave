#!/usr/bin/env node
// Capability coverage: every tool, reference, asset, pattern, template and subagent must be reachable from hand-written guidance.
// Usage: node tools/coverage.mjs [--json]      (exit 1 when something is unreachable)
//
// "Reachable" = an instruction an agent actually reads leads to it: starting from every SKILL.md, every subagent
// file and adapters/AGENTS.snippet.md, follow markdown links, backticked paths and backticked file names into
// references and assets (and from scripts into the assets they load). The generated system map and index are
// deliberately NOT starting points — being listed in a catalog is not the same as being part of the workflow.
// Subagents count as reachable when a skill or reference names them.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, basename, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => relative(root, p).replace(/\\/g, "/");
const GENERATED = new Set(["skills/vibeweave/references/system-map.md", "skills/vibeweave/references/system-index.md"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const skillsDir = join(root, "skills");
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
const capabilities = [];
for (const s of skills) {
  for (const f of walk(join(skillsDir, s))) {
    const r = rel(f);
    if (basename(f) === "SKILL.md" || GENERATED.has(r)) continue;
    if (/\/(scripts|references|assets)\//.test(r)) capabilities.push(r);
  }
}
const agentFiles = readdirSync(join(root, "agents")).filter((f) => f.endsWith(".md"));
const agentNames = agentFiles.map((f) => f.replace(/\.md$/, ""));

/** Resolve a reference found in `fromFile` to repo paths it could mean (relative path, skill path, or a basename). */
function candidates(ref, fromFile) {
  const out = new Set();
  const clean = ref.replace(/^<skill-dir>\//, "").replace(/^\.\//, "").replace(/[#?].*$/, "");
  const fromDir = dirname(join(root, fromFile));
  const skill = fromFile.match(/^skills\/([^/]+)\//)?.[1];
  out.add(rel(join(fromDir, clean)));
  if (skill) out.add(`skills/${skill}/${clean}`);
  out.add(`skills/${clean}`);
  // A bare file name means the file in the same skill if there is one; otherwise any skill's (shared copies).
  if (!clean.includes("/")) {
    const same = capabilities.filter((c) => basename(c) === clean && skill && c.startsWith(`skills/${skill}/`));
    for (const c of same.length ? same : capabilities.filter((c) => basename(c) === clean)) out.add(c);
  }
  return [...out];
}

const reached = new Set(), queue = [], mentionsAgent = new Set();
const entries = [...skills.map((s) => `skills/${s}/SKILL.md`), ...agentFiles.map((f) => `agents/${f}`), "adapters/AGENTS.snippet.md"].filter((p) => existsSync(join(root, p)));
for (const e of entries) queue.push(e);
const seen = new Set();
while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  const text = readFileSync(join(root, file), "utf8");
  for (const name of agentNames) if (new RegExp(`\\b${name}\\b`).test(text) && file !== `agents/${name}.md`) mentionsAgent.add(name);
  const refs = new Set();
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) if (!/^(https?:|mailto:|#)/.test(m[1])) refs.add(m[1]);
  // Paths anywhere inside a backtick span — including full commands like `novelty.mjs ideas "…"`.
  for (const span of text.matchAll(/`([^`\n]+)`/g)) for (const m of span[1].matchAll(/[\w./<>-]+\.(?:mjs|md|json|ts|css|html|svg|txt)\b/g)) refs.add(m[0]);
  // Quoted paths and module imports inside scripts (e.g. "./color-utils.mjs", "presets.json").
  for (const m of text.matchAll(/["']([\w./-]+\.(?:mjs|json|md))["']/g)) refs.add(m[1]);
  for (const ref of refs) {
    for (const c of candidates(ref, file)) {
      if (!capabilities.includes(c) || reached.has(c)) continue;
      reached.add(c);
      if ([".md", ".mjs"].includes(extname(c))) queue.push(c);
    }
  }
}

// A shared copy (e.g. ui-audit/scripts/contrast.mjs) is covered when its skill references it OR its canonical is reached.
const orphans = capabilities.filter((c) => !reached.has(c));
const unusedAgents = agentNames.filter((n) => !mentionsAgent.has(n));
const report = { capabilities: capabilities.length, reached: reached.size, orphans, agents: agentNames.length, unusedAgents };
if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Capability coverage: ${reached.size}/${capabilities.length} files and ${agentNames.length - unusedAgents.length}/${agentNames.length} subagents are reachable from the guidance.`);
  for (const o of orphans) console.log(`  ✖ unused: ${o} — no SKILL.md, subagent or reference leads to it`);
  for (const a of unusedAgents) console.log(`  ✖ unused subagent: ${a} — no skill or reference delegates to it`);
}
process.exitCode = orphans.length || unusedAgents.length ? 1 : 0;
