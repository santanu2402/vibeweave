#!/usr/bin/env node
// Environment check: is this machine and project ready for Vibeweave? Reports what's missing and how to fix it.
// Usage: npx vibeweave doctor [--project <dir>] [--network]
//
// Checks: Node.js version · where Vibeweave is installed (per IDE) and whether it is up to date · Playwright,
// a launchable browser and axe-core in the project (needed by the browser tools) · the Claude Code usage hook
// and company policies that block hooks · optional network reachability for icons, fonts and registries.
// Exit code 1 when something required is missing. Nothing is installed or changed.
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { cpus, homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const USAGE = "Usage: npx vibeweave doctor [--project <dir>] [--network]";
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) { console.log(USAGE); process.exit(0); }
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--network") continue;
  if (argv[i] === "--project" && argv[i + 1] && !argv[i + 1].startsWith("--")) { i++; continue; }
  console.error(`✖ ${argv[i] === "--project" ? "--project needs a folder" : `unknown argument ${argv[i]}`}\n${USAGE}`);
  process.exit(2);
}
const flagValue = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const project = resolve(flagValue("--project") || process.cwd());
if (!existsSync(project)) { console.error(`✖ --project folder not found: ${project}`); process.exit(2); }
const version = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).version;
const results = [];
const ok = (m) => results.push(["✔", m]), warn = (m, fix) => results.push(["▲", m, fix]), fail = (m, fix) => results.push(["✖", m, fix]);

/* Node.js */
const [major] = process.versions.node.split(".").map(Number);
major >= 18 ? ok(`Node.js ${process.versions.node}`) : fail(`Node.js ${process.versions.node} is too old`, "install Node.js 18 or newer from https://nodejs.org");

/* Installed skills (project and user-wide) and their version */
const places = [".agents/skills", ".claude/skills", ".kiro/skills", ".cline/skills", ".roo/skills", ".goose/skills", ".qwen/skills", ".augment/skills", ".factory/skills", ".trae/skills"];
const found = [];
for (const [base, label] of [[project, "project"], [homedir(), "user"]]) {
  for (const p of places) {
    const f = join(base, p, "vibeweave", "SKILL.md");
    if (!existsSync(f)) continue;
    const v = readFileSync(f, "utf8").match(/version:\s*"?([\d.]+)/)?.[1];
    found.push(`${label} ${p}${v ? ` (v${v})` : ""}`);
    if (v && v !== version) warn(`${label} ${p} has Vibeweave v${v}; this package is v${version}`, "update: npx vibeweave@latest (add --global for user-wide installs)");
  }
}
found.length ? ok(`Vibeweave installed: ${found.join(" · ")}`) : warn("Vibeweave isn't installed in this project or for this user", "run: npx vibeweave   (or --global)");

/* Playwright + browser + axe-core, resolved from the project like the tools do */
const req = createRequire(join(project, "noop.js"));
let pw = null;
try { const pkg = req.resolve("playwright/package.json"); ok(`Playwright ${JSON.parse(readFileSync(pkg, "utf8")).version} (in the project)`); pw = await import(new URL(`file:///${req.resolve("playwright").replace(/\\/g, "/")}`).href); }
catch { warn("Playwright isn't installed in this project — the browser tools (QA, wiring, responsive, vitals, probe, screenshots) can't run", "npm i -D playwright && npx playwright install chromium"); }
if (pw) {
  const chromium = pw.chromium || pw.default?.chromium;
  let launched = "";
  for (const channel of [undefined, "chrome", "msedge"]) {
    try { const b = await chromium.launch(channel ? { channel } : {}); await b.close(); launched = channel || "Playwright Chromium"; break; } catch {}
  }
  launched ? ok(`Browser launches: ${launched}`) : fail("No browser could be launched", "npx playwright install chromium   (or install Google Chrome / Microsoft Edge)");
}
try { req.resolve("axe-core/axe.min.js"); ok("axe-core available (accessibility scan)"); }
catch { try { req.resolve("@axe-core/playwright/package.json"); ok("@axe-core/playwright available (accessibility scan)"); } catch { warn("axe-core isn't installed — qa.mjs skips the axe scan", "npm i -D axe-core"); } }

/* Claude Code usage hook and company policy */
const settings = join(project, ".claude", "settings.local.json");
if (existsSync(join(project, ".claude"))) {
  const hooked = existsSync(settings) && readFileSync(settings, "utf8").includes("vibeweave-usage");
  hooked ? ok("Claude Code time-and-token hook installed") : warn("Claude Code time-and-token hook not installed in this project", "npx vibeweave --agent claude");
}
const managed = { win32: "C:\\Program Files\\ClaudeCode\\managed-settings.json", darwin: "/Library/Application Support/ClaudeCode/managed-settings.json" }[platform()] || "/etc/claude-code/managed-settings.json";
try {
  if (existsSync(managed) && JSON.parse(readFileSync(managed, "utf8")).allowManagedHooksOnly)
    warn("Your organization's Claude Code policy blocks project hooks (allowManagedHooksOnly) — the usage report won't appear in chat", "after a run: npx vibeweave usage");
} catch {}

/* Machine power: decides fast vs detailed and whether browser checks should run one at a time */
const cores = cpus().length;
cores <= 4 ? warn(`Low-power machine (${cores} CPUs) — Vibeweave runs browser checks one at a time`, "choose fast mode when asked after TASKS.md (crew.md §5)") : ok(`${cores} CPUs — detailed mode with parallel crew checks is fine`);

/* Ship it: git and the GitHub CLI (only needed to publish a repo) */
const versionOf = (bin) => { try { return execFileSync(bin, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 15000, windowsHide: true }).split("\n")[0].trim(); } catch { return ""; } };
const gitV = versionOf("git"), ghV = versionOf("gh");
const shipJs = join(REPO, "skills", "vibeweave", "scripts", "ship.mjs");
gitV ? ok(gitV) : warn("git isn't installed — needed to publish a repo (\"ship it\")", `node "${shipJs}" install git --yes   (uses your package manager)`);
ghV ? ok(`GitHub CLI: ${ghV}`) : warn("GitHub CLI isn't installed — needed to publish a repo (\"ship it\")", `node "${shipJs}" install gh --yes`);

/* Network (optional) */
if (argv.includes("--network")) {
  for (const [name, url] of [["Iconify (icons)", "https://api.iconify.design/collections?prefix=mdi"], ["Fontsource (fonts)", "https://api.fontsource.org/v1/fonts/inter"], ["shadcn registry index", "https://ui.shadcn.com/r/registries.json"]]) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(8000) }); r.ok ? ok(`${name} reachable`) : warn(`${name} answered HTTP ${r.status}`, "check your proxy or firewall"); }
    catch { warn(`${name} unreachable`, "icons.mjs / fonts.mjs / fetch-ui.mjs need HTTPS access to it — check your proxy or firewall"); }
  }
}

console.log(`Vibeweave doctor — v${version} · ${project} · ${cpus().length} CPUs · ${platform()}\n`);
for (const [mark, msg, fix] of results) console.log(`${mark} ${msg}${fix ? `\n    → ${fix}` : ""}`);
const failed = results.filter((r) => r[0] === "✖").length, warned = results.filter((r) => r[0] === "▲").length;
console.log(`\n${failed ? "✖" : warned ? "▲" : "✔"} ${failed} problem(s), ${warned} warning(s)`);
process.exitCode = failed ? 1 : 0;
