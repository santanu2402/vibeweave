#!/usr/bin/env node
// Validate every skill against the Agent Skills spec (agentskills.io/specification) plus repo rules:
//  - frontmatter: name (1–64, [a-z0-9-], no leading/trailing/double hyphen, == folder), description (1–1024)
//  - SKILL.md body under 500 lines
//  - every relative markdown link / referenced script inside a skill exists
//  - shared files are identical to their canonical copy (run tools/sync-shared.mjs to fix)
//  - all .mjs scripts (skills, hooks, bin, tools) pass `node --check`
//  - agents/*.md subagents have name (== file name) + description and preload only existing skills
//  - the generated system map is current, every preset passes WCAG AA, and every capability is reachable (tools/coverage.mjs)
// Usage: node tools/validate.mjs
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SHARED } from "./shared-files.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [], notes = [];
const err = (m) => errors.push(m);

function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  const fm = {};
  let currentKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const top = line.match(/^([a-zA-Z][\w-]*):\s*(.*)$/);
    if (top) {
      currentKey = top[1];
      fm[currentKey] = top[2].replace(/^["']|["']$/g, "");
    } else if (/^\s+\S/.test(line) && currentKey) {
      fm[currentKey] = (fm[currentKey] ? fm[currentKey] + "\n" : "") + line.trim();
    }
  }
  return { fm, body: text.slice(m[0].length) };
}

const skillsDir = join(root, "skills");
const skills = readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory());
if (!skills.length) err("no skills found in skills/");

for (const name of skills) {
  const dir = join(skillsDir, name);
  const file = join(dir, "SKILL.md");
  if (!existsSync(file)) { err(`${name}: missing SKILL.md`); continue; }
  const text = readFileSync(file, "utf8");
  const parsed = parseFrontmatter(text);
  if (!parsed) { err(`${name}: SKILL.md has no YAML frontmatter`); continue; }
  const { fm, body } = parsed;

  if (!fm.name) err(`${name}: frontmatter.name missing`);
  else {
    if (fm.name !== name) err(`${name}: frontmatter.name "${fm.name}" must equal folder name`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name) || fm.name.length > 64) err(`${name}: invalid name "${fm.name}"`);
  }
  if (!fm.description) err(`${name}: frontmatter.description missing`);
  else if (fm.description.length > 1024) err(`${name}: description is ${fm.description.length} chars (max 1024)`);
  else notes.push(`${name}: description ${fm.description.length}/1024 chars`);
  if (fm.compatibility && fm.compatibility.length > 500) err(`${name}: compatibility > 500 chars`);

  const lines = body.split("\n").length;
  if (lines >= 500) err(`${name}: SKILL.md body is ${lines} lines (keep < 500; move detail to references/)`);
  else notes.push(`${name}: body ${lines} lines`);

  // Relative links: [text](references/x.md) and inline `scripts/x.mjs` / `assets/x`
  const refs = new Set();
  for (const m of body.matchAll(/\]\(((?:references|assets|scripts)\/[^)#\s]+)\)/g)) refs.add(m[1]);
  for (const m of body.matchAll(/`(?:<skill-dir>\/)?((?:scripts|references|assets)\/[\w.\-/]+\.\w+)/g)) refs.add(m[1]);
  for (const ref of refs) if (!existsSync(join(dir, ref))) err(`${name}: references missing file ${ref}`);

  // Scripts must parse
  const scriptsDir = join(dir, "scripts");
  if (existsSync(scriptsDir)) {
    for (const f of readdirSync(scriptsDir).filter((f) => f.endsWith(".mjs"))) {
      try { execFileSync(process.execPath, ["--check", join(scriptsDir, f)], { stdio: "pipe" }); }
      catch (e) { err(`${name}/scripts/${f}: syntax error\n${e.stderr}`); }
    }
  }
}

// Claude Code subagents: agents/*.md need name + description; preloaded skills must exist.
const agentsDir = join(root, "agents");
const agents = existsSync(agentsDir) ? readdirSync(agentsDir).filter((f) => f.endsWith(".md")) : [];
for (const f of agents) {
  const parsed = parseFrontmatter(readFileSync(join(agentsDir, f), "utf8"));
  if (!parsed) { err(`agents/${f}: no YAML frontmatter`); continue; }
  const { fm, body } = parsed;
  if (!fm.name) err(`agents/${f}: frontmatter.name missing`);
  else if (fm.name !== f.replace(/\.md$/, "")) err(`agents/${f}: name "${fm.name}" should match the file name`);
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name)) err(`agents/${f}: invalid name "${fm.name}"`);
  if (!fm.description) err(`agents/${f}: frontmatter.description missing`);
  for (const s of (fm.skills || "").split(/[\n,]/).map((x) => x.replace(/^-\s*/, "").trim()).filter(Boolean))
    if (!skills.includes(s)) err(`agents/${f}: preloads unknown skill "${s}"`);
  if (body.trim().length < 200) err(`agents/${f}: system prompt body looks empty`);
  notes.push(`agent ${fm.name}: ok`);
}

for (const { from, to } of SHARED) {
  const canonical = readFileSync(join(root, from), "utf8");
  for (const dest of to) {
    const p = join(root, dest);
    if (!existsSync(p)) err(`shared file missing: ${dest} (run node tools/sync-shared.mjs)`);
    else if (readFileSync(p, "utf8") !== canonical) err(`shared file out of date: ${dest} (run node tools/sync-shared.mjs)`);
  }
}

// Hooks, installer and tools must parse
for (const dir of ["hooks", "bin", "tools"]) {
  const d = join(root, dir);
  if (existsSync(d)) for (const f of readdirSync(d).filter((f) => f.endsWith(".mjs"))) {
    try { execFileSync(process.execPath, ["--check", join(d, f)], { stdio: "pipe" }); } catch (e) { err(`${dir}/${f}: syntax error\n${e.stderr}`); }
  }
}
const mapScript = join(root, "tools", "build-system-map.mjs");
if (existsSync(mapScript)) {
  try { execFileSync(process.execPath, [mapScript, "--check"], { stdio: "pipe" }); notes.push("system map: up to date"); }
  catch (e) { err(String(e.stderr || e.stdout).trim()); }
}
// Every capability must be reachable from hand-written guidance — no power that the workflow never uses.
const coverageScript = join(root, "tools", "coverage.mjs");
if (existsSync(coverageScript)) {
  try { notes.push(execFileSync(process.execPath, [coverageScript], { stdio: "pipe" }).toString().split("\n")[0].replace(/^Capability coverage: /, "coverage: ")); }
  catch (e) { err(`unused capabilities:\n${String(e.stdout || e.stderr).trim()}`); }
}
const presetScript = join(root, "skills", "frontend-forge", "scripts", "preset.mjs");
if (existsSync(presetScript)) {
  try { execFileSync(process.execPath, [presetScript, "check"], { stdio: "pipe" }); notes.push("presets: all pass WCAG AA"); }
  catch (e) { err(`presets fail contrast checks:\n${e.stdout || e.stderr}`); }
}

for (const n of notes) console.log(`  · ${n}`);
if (errors.length) {
  console.error(`\n✖ ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  process.exit(1);
}
console.log(`\n✔ ${skills.length} skills valid: ${skills.join(", ")}`);
if (agents.length) console.log(`✔ ${agents.length} subagents valid: ${agents.map((f) => f.replace(/\.md$/, "")).join(", ")}`);
