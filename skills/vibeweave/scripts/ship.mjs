#!/usr/bin/env node
// Ship it: make a finished project production- and GitHub-ready, then publish it — safely.
// Usage:
//   node ship.mjs check   [dir] [--json]                         production-readiness scan (exit 1 on errors)
//   node ship.mjs prepare [dir] --out <dir> [--license mit --owner "Name"] [--include-contracts] [--include-memory] [--force]
//                                                                 clean GitHub-ready copy (+ .gitignore, LICENSE), then check
//   node ship.mjs gh      [--json]                                 git + GitHub CLI installed? logged in? exact next steps
//   node ship.mjs install git|gh [--yes]                          install with this OS's package manager (winget/choco,
//                                                                 brew/xcode-select, apt/dnf/pacman/zypper) — only with --yes
//   node ship.mjs publish <dir> --repo <name> --public|--private [--description "…"] --yes
//                                                                 git init + commit + gh repo create --push; prints the URL
//
// check finds: secrets (cloud/API tokens, private keys, credential files, .env), files GitHub rejects (>100 MB) or
// warns about (>50 MB), dev leftovers (console.log, debugger, TODO/FIXME, hard-coded localhost URLs, test .only),
// Vibeweave working files that don't belong in a public repo, and a missing README, LICENSE or .gitignore.
// prepare never copies node_modules, .git, build output, .env files, keys, .design-review/, .vibeweave/, MEMORY.md or
// BUILDLOG.md (keep those two with --include-memory, for a team repo); REQUIREMENTS/PLAN/TASKS/DESIGN.md go to docs/ only
// with --include-contracts.
// publish refuses without --yes (the user's explicit consent) and refuses while check reports a secret.
// Installing and publishing are the user's call: without --yes, install and publish only say what they would do.
// Logging in to GitHub is always the user's own step in their browser; tokens never pass through the agent.
// Zero dependencies; git/gh are run with argument arrays (no shell).
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { platform } from "node:os";

const argv = process.argv.slice(2);
const cmd = argv[0];
const VALUE_FLAGS = new Set(["--out", "--license", "--owner", "--repo", "--description"]);
const BOOL_FLAGS = new Set(["--json", "--include-contracts", "--include-memory", "--force", "--public", "--private", "--yes", "--help", "-h"]);
const values = {}, positional = [];
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_FLAGS.has(a)) { if (argv[i + 1] == null || argv[i + 1].startsWith("--")) fail(`${a} needs a value`); values[a] = argv[++i]; }
  else if (BOOL_FLAGS.has(a)) values[a] = true;
  else if (a.startsWith("-")) fail(`unknown option ${a}`);
  else positional.push(a);
}
function fail(msg, code = 2) { console.error(`✖ ${msg}\nRun: node ship.mjs --help`); process.exit(code); }
if (!cmd || cmd === "--help" || cmd === "-h" || values["--help"]) {
  const head = [];
  for (const l of readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(1)) { if (!l.startsWith("//")) break; head.push(l.replace(/^\/\/ ?/, "")); }
  console.log(head.join("\n")); process.exit(cmd ? 0 : 2);
}

// ── What never ships ─────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "out", ".next", ".nuxt", ".svelte-kit", ".astro", ".output", ".vercel",
  ".netlify", ".turbo", ".cache", ".parcel-cache", "coverage", ".design-review", ".vibeweave", ".idea", "__pycache__", "dist-preview"]);
const SKIP_FILES = /^(\.env(\..*)?|.*\.(pem|key|p12|pfx|keystore|jks)|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?|\.DS_Store|Thumbs\.db|desktop\.ini|npm-debug\.log.*|yarn-error\.log|.*\.log|MEMORY\.md|BUILDLOG\.md)$/i;
const KEEP_FILES = /^\.env\.(example|sample|template)$/i;
const CONTRACTS = ["REQUIREMENTS.md", "PLAN.md", "TASKS.md", "DESIGN.md", "API-CONTRACT.md"];
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?|woff2?|ttf|otf|eot|mp[34]|webm|mov|avi|wav|ogg|flac|zip|gz|tgz|bz2|xz|7z|rar|pdf|psd|ai|sketch|fig|glb|gltf|bin|wasm|exe|dll|so|dylib|class|jar|lockb)$/i;

// Secret signatures: high-confidence token formats (errors) and suspicious assignments (warnings).
const SECRETS = [
  ["AWS access key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/],
  ["private key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/],
  ["Stripe live key", /\b[rs]k_live_[0-9A-Za-z]{20,}\b/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/],
  ["OpenAI / Anthropic key", /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{32,}\b/],
  ["npm token", /\bnpm_[A-Za-z0-9]{36}\b/],
  ["SendGrid key", /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/],
];
const ASSIGNED = /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*["'`]([^"'`\s]{12,})["'`]/i;
const PLACEHOLDER = /^(?:your|xxx|example|changeme|placeholder|dummy|test|sample|<|\$\{|process\.env|import\.meta\.env)/i;
const LEFTOVERS = [
  ["console.log", /\bconsole\.(?:log|debug)\(/g, /\.(m?[jt]sx?|vue|svelte|astro)$/],
  ["debugger statement", /^\s*debugger;?\s*$/gm, /\.(m?[jt]sx?|vue|svelte|astro)$/],
  ["TODO/FIXME", /\b(?:TODO|FIXME|XXX|HACK)\b/g, /\.(m?[jt]sx?|vue|svelte|astro|css|scss|html)$/],
  ["hard-coded localhost URL", /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/g, /\.(m?[jt]sx?|vue|svelte|astro|html)$/],
  ["focused test (.only)", /\b(?:it|test|describe)\.only\(/g, /\.(test|spec)\.m?[jt]sx?$/],
];

/** Every shippable file under dir (relative paths), skipping what never ships. */
function walk(dir) {
  const out = [];
  const rec = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isSymbolicLink()) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) rec(p); }
      else out.push(relative(dir, p).split(sep).join("/"));
    }
  };
  rec(dir);
  return out.sort();
}

// ── check ────────────────────────────────────────────────────────────────────
function check(dir) {
  const findings = [];
  const add = (sev, kind, msg, file = "") => findings.push({ sev, kind, msg, file });
  const files = walk(dir);
  for (const f of files) {
    const name = basename(f), full = join(dir, f), size = statSync(full).size;
    if (SKIP_FILES.test(name) && !KEEP_FILES.test(name)) {
      if (/^(MEMORY|BUILDLOG)\.md$/.test(name)) add("warn", "working-file", `${name} is Vibeweave project memory — prepare leaves it out of the GitHub copy`, f);
      else if (/\.log$/i.test(name) || /^(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(name)) add("warn", "junk", "log or OS file — don't commit it", f);
      else add("error", "secret-file", /^\.env/i.test(name) ? "environment file — usually holds secrets; commit a .env.example instead" : "key or certificate file — never commit it", f);
      continue;
    }
    if (size > 100 * 1024 * 1024) { add("error", "large-file", `${(size / 1048576).toFixed(0)} MB — GitHub rejects files over 100 MB (use Git LFS or a release asset)`, f); continue; }
    if (size > 50 * 1024 * 1024) add("warn", "large-file", `${(size / 1048576).toFixed(0)} MB — GitHub warns above 50 MB`, f);
    if (BINARY.test(f) || size > 2 * 1024 * 1024 || /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(f)) continue;
    let text; try { text = readFileSync(full, "utf8"); } catch { continue; }
    if (text.includes("\u0000")) continue;
    if (/^(credentials|service[-_]?account.*|.*-firebase-adminsdk-.*)\.json$/i.test(name) && /"private_key"|"client_secret"/.test(text)) add("error", "secret-file", "credential file with a private key or client secret", f);
    for (const [label, re] of SECRETS) {
      const m = text.match(re);
      if (m) add("error", "secret", `${label} (${m[0].slice(0, 6)}…) on line ${text.slice(0, m.index).split("\n").length} — remove it and rotate it`, f);
    }
    const a = text.match(ASSIGNED);
    if (a && !PLACEHOLDER.test(a[1])) add("warn", "possible-secret", `hard-coded credential-like value on line ${text.slice(0, a.index).split("\n").length} — move it to an environment variable`, f);
    const isTooling = /(^|\/)(scripts?|tools?|tests?|__tests__|e2e|fixtures)\//.test(f) || /\.(test|spec|config)\.m?[jt]s$/.test(f);
    const isCli = /(^|\/)bin\//.test(f) || text.startsWith("#!");   // a command-line program: console.log is its output
    for (const [label, re, ext] of LEFTOVERS) {
      if (!ext.test(f) || (isTooling && label !== "focused test (.only)") || (isCli && label === "console.log")) continue;
      const n = (text.match(re) || []).length;
      if (n) add(label === "focused test (.only)" ? "error" : "warn", "leftover", `${n} × ${label}`, f);
    }
  }
  const has = (n) => existsSync(join(dir, n));
  if (!has("README.md")) add("error", "repo-file", "no README.md — write one: what it is, screenshot, features, setup, scripts, deploy, licence");
  else if (readFileSync(join(dir, "README.md"), "utf8").trim().split("\n").length < 10) add("warn", "repo-file", "README.md is very short — add setup, scripts and deploy steps");
  if (!files.some((f) => /^(LICENSE|LICENCE|COPYING)(\.(md|txt))?$/i.test(f))) add("warn", "repo-file", "no LICENSE — without one nobody may reuse the code; ask the owner which licence (MIT is common)");
  if (!has(".gitignore")) add("error", "repo-file", "no .gitignore — node_modules, build output and .env files would be committed");
  else { const gi = readFileSync(join(dir, ".gitignore"), "utf8"); for (const need of ["node_modules", ".env"]) if (!gi.includes(need)) add("warn", "repo-file", `.gitignore doesn't list ${need}`); }
  if (has("package.json")) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      if (!pkg.scripts?.build) add("info", "package", "package.json has no build script");
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies }).length;
      if (deps && !has("package-lock.json") && !has("pnpm-lock.yaml") && !has("yarn.lock") && !has("bun.lockb")) add("warn", "package", "no lockfile — installs won't be reproducible (run npm install and commit package-lock.json)");
    } catch { add("error", "package", "package.json doesn't parse"); }
  }
  const counts = findings.reduce((c, f) => ((c[f.sev] = (c[f.sev] || 0) + 1), c), {});
  return { dir, files: files.length, verdict: counts.error ? "FAIL" : counts.warn ? "CONCERNS" : "PASS", counts, findings };
}
function printCheck(r) {
  console.log(`Ship check — ${r.dir} · ${r.files} files\n`);
  const icon = { error: "✖", warn: "▲", info: "·" };
  for (const sev of ["error", "warn", "info"]) for (const f of r.findings.filter((x) => x.sev === sev)) console.log(`  ${icon[sev]} [${f.kind}] ${f.file ? f.file + " — " : ""}${f.msg}`);
  console.log(`\nVerdict: ${r.verdict} — ${r.counts.error || 0} errors, ${r.counts.warn || 0} warnings${r.verdict === "FAIL" ? " · fix the errors before publishing" : ""}`);
}

// ── prepare ──────────────────────────────────────────────────────────────────
const GITIGNORE = ["# dependencies", "node_modules/", "", "# build output", "dist/", "build/", "out/", ".next/", ".nuxt/", ".svelte-kit/", ".astro/", ".output/", ".vercel/", ".netlify/", "coverage/", "",
  "# environment and secrets", ".env", ".env.*", "!.env.example", "*.pem", "*.key", "", "# logs and OS files", "*.log", ".DS_Store", "Thumbs.db", "", "# editor and tool state", ".idea/", ".design-review/", ".vibeweave/", ""].join("\n");
const MIT = (owner) => `MIT License\n\nCopyright (c) ${new Date().getFullYear()} ${owner}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;

function prepare(src, out) {
  if (!existsSync(src) || !statSync(src).isDirectory()) fail(`project folder not found: ${src}`);
  if (resolve(out).startsWith(resolve(src) + sep) && !SKIP_DIRS.has(relative(src, out).split(sep)[0])) fail("--out must be outside the project (or inside an ignored folder) so the copy doesn't include itself");
  if (existsSync(out) && readdirSync(out).length && !values["--force"]) fail(`${out} exists and isn't empty — choose another --out or add --force`);
  const copied = [], skipped = [];
  for (const f of walk(src)) {
    const name = basename(f);
    const memory = /^(MEMORY|BUILDLOG)\.md$/.test(f) && values["--include-memory"];   // team repos may keep the shared memory
    if ((SKIP_FILES.test(name) && !KEEP_FILES.test(name) && !memory) || resolve(src, f).startsWith(resolve(out) + sep)) { skipped.push(f); continue; }
    let dest = f;
    if (CONTRACTS.includes(f)) { if (!values["--include-contracts"]) { skipped.push(f); continue; } dest = `docs/${f}`; }
    mkdirSync(dirname(join(out, dest)), { recursive: true });
    copyFileSync(join(src, f), join(out, dest));
    copied.push(dest);
  }
  const wrote = [];
  if (!existsSync(join(out, ".gitignore"))) { writeFileSync(join(out, ".gitignore"), GITIGNORE); wrote.push(".gitignore"); }
  if (values["--license"]) {
    if (String(values["--license"]).toLowerCase() !== "mit") fail("--license supports mit (add other licences by hand)");
    if (!values["--owner"]) fail("--license mit needs --owner \"Full Name\"");
    if (!readdirSync(out).some((f) => /^(LICENSE|LICENCE)/i.test(f))) { writeFileSync(join(out, "LICENSE"), MIT(values["--owner"])); wrote.push("LICENSE"); }
  }
  return { copied: copied.length, skipped, wrote };
}

// ── Environment: git + GitHub CLI — find, install (with consent), log in ─────
const LOCAL = process.env.LOCALAPPDATA || "", PF = process.env.ProgramFiles || "C:\\Program Files";
/** Where installers put the tools, so a fresh install is found before the terminal's PATH refreshes. */
const KNOWN = {
  git: { win32: [join(PF, "Git", "cmd", "git.exe"), join(LOCAL, "Programs", "Git", "cmd", "git.exe")], darwin: ["/opt/homebrew/bin/git", "/usr/local/bin/git", "/usr/bin/git"], linux: ["/usr/bin/git", "/usr/local/bin/git"] },
  gh: { win32: [join(PF, "GitHub CLI", "gh.exe"), join(LOCAL, "Programs", "GitHub CLI", "gh.exe")], darwin: ["/opt/homebrew/bin/gh", "/usr/local/bin/gh"], linux: ["/usr/bin/gh", "/usr/local/bin/gh", "/snap/bin/gh"] },
};
const PACKAGE = {
  git: { winget: "Git.Git", choco: "git", brew: "git", "apt-get": "git", dnf: "git", pacman: "git", zypper: "git" },
  gh: { winget: "GitHub.cli", choco: "gh", brew: "gh", "apt-get": "gh", dnf: "gh", pacman: "github-cli", zypper: "gh" },
};
const DOWNLOAD = { git: "https://git-scm.com/downloads", gh: "https://cli.github.com" };
function run(bin, args, opts = {}) { return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000, windowsHide: true, ...opts }); }
function tryRun(bin, args, opts) { try { return { ok: true, out: run(bin, args, opts) }; } catch (e) { return { ok: false, out: `${e.stdout || ""}${e.stderr || ""}` || String(e.message) }; } }
const works = (bin, flag = "--version") => tryRun(bin, [flag]).ok;
const versionOf = (bin) => tryRun(bin, ["--version"]).out.split("\n")[0].trim();
function findBin(tool) {
  if (works(tool)) return tool;
  for (const p of KNOWN[tool][platform()] || []) if (p && existsSync(p) && works(p)) return p;
  return null;
}
/** How to install a tool on this machine: { bin, args } for its package manager, or { advice } when there is none. */
function installPlan(tool) {
  const id = PACKAGE[tool], os = platform();
  if (os === "win32") {
    if (works("winget")) return { bin: "winget", args: ["install", "--id", id.winget, "-e", "--source", "winget", "--accept-source-agreements", "--accept-package-agreements"] };
    if (works("choco")) return { bin: "choco", args: ["install", id.choco, "-y"] };
    return { advice: `install App Installer (winget) from the Microsoft Store, or download ${DOWNLOAD[tool]}` };
  }
  if (os === "darwin") {
    if (works("brew")) return { bin: "brew", args: ["install", id.brew] };
    if (tool === "git") return { bin: "xcode-select", args: ["--install"], note: "opens Apple's installer for the command-line tools — finish it on screen" };
    return { advice: `install Homebrew (https://brew.sh) and then run: brew install gh — or download ${DOWNLOAD.gh}` };
  }
  const root = process.getuid?.() === 0;
  for (const [pm, args, probe] of [["apt-get", ["install", "-y", id["apt-get"]]], ["dnf", ["install", "-y", id.dnf]], ["pacman", ["-S", "--noconfirm", id.pacman], "-V"], ["zypper", ["--non-interactive", "install", id.zypper]]]) {
    if (!works(pm, probe)) continue;
    return root ? { bin: pm, args } : { bin: "sudo", args: ["-n", pm, ...args], sudo: true };   // -n: never hang on a password prompt
  }
  return { advice: `install ${tool} with your distribution's package manager, or see ${DOWNLOAD[tool]}` };
}
const show = (p) => (p.bin ? [p.bin, ...p.args].join(" ") : p.advice);
function ghStatus() {
  const gitPath = findBin("git"), ghPath = findBin("gh");
  const s = { git: gitPath ? versionOf(gitPath) : null, gitPath, gh: ghPath ? versionOf(ghPath) : null, ghPath, loggedIn: false, account: null, next: [] };
  if (!gitPath) s.next.push(`Install git — ask the user, then: node ship.mjs install git --yes   (runs: ${show(installPlan("git"))})`);
  if (!ghPath) s.next.push(`Install the GitHub CLI — ask the user, then: node ship.mjs install gh --yes   (runs: ${show(installPlan("gh"))})`);
  else {
    const auth = tryRun(ghPath, ["auth", "status", "--hostname", "github.com"]);
    s.loggedIn = auth.ok;
    s.account = (auth.out.match(/account\s+(\S+)/) || auth.out.match(/as\s+(\S+)/) || [])[1]?.replace(/[()]/g, "") || null;
    const gh = ghPath === "gh" ? "gh" : `"${ghPath}"`;
    if (!auth.ok) s.next.push(`Log in — the user does this once in their own terminal and browser (never paste tokens into chat): ${gh} auth login --web --git-protocol https   (in Claude Code: type ! and that command)`);
  }
  return s;
}
/** Install git or gh with this machine's package manager — only with --yes (the user's permission). */
function install(tool) {
  if (!PACKAGE[tool]) fail("install supports: git, gh");
  const found = findBin(tool);
  if (found) { console.log(`✔ ${tool} is already installed: ${versionOf(found)}${found !== tool ? ` (${found})` : ""}`); return 0; }
  const plan = installPlan(tool);
  if (!plan.bin) { console.error(`✖ no supported package manager found — ${plan.advice}`); return 1; }
  if (!values["--yes"]) { console.log(`Would run: ${show(plan)}\nInstalling software needs the user's permission: ask them, then re-run with --yes.`); return 2; }
  console.log(`Installing ${tool}: ${show(plan)}${plan.note ? ` — ${plan.note}` : ""}`);
  try { execFileSync(plan.bin, plan.args, { stdio: "inherit", timeout: 900_000 }); }
  catch (e) {
    if (plan.sudo) { console.error(`✖ sudo needs a password — ask the user to run it in their own terminal: sudo ${plan.args.slice(1).join(" ")}`); return 1; }
    console.error(`✖ the installer stopped (${e.status ?? e.message}) — run it yourself to see why: ${show(plan)}`); return 1;
  }
  const now = findBin(tool);
  if (!now) { console.error(`▲ installed, but ${tool} isn't found yet — open a new terminal (so PATH refreshes) and run: node ship.mjs gh`); return 1; }
  console.log(`✔ ${tool} ready: ${versionOf(now)}${now !== tool ? ` (${now})` : ""}`);
  return 0;
}

// ── publish ──────────────────────────────────────────────────────────────────
function publish(dir) {
  const repo = values["--repo"];
  if (!repo || !/^[A-Za-z0-9._-]{1,100}(\/[A-Za-z0-9._-]{1,100})?$/.test(repo)) fail("--repo <name> (letters, digits, . _ -; optionally owner/name)");
  if (!values["--public"] === !values["--private"]) fail("choose exactly one of --public or --private");
  if (!values["--yes"]) fail("publishing is outward-facing: show the user the ship plan (repo name, visibility, files) and add --yes only after they approve", 2);
  const r = check(dir);
  if (r.findings.some((f) => f.kind === "secret" || f.kind === "secret-file")) { printCheck(r); fail("refusing to publish: a secret or key file is present — remove it (and rotate it) first", 1); }
  if (r.counts.error) { printCheck(r); fail("refusing to publish: fix the errors above first", 1); }
  const s = ghStatus();
  if (!s.gitPath || !s.ghPath || !s.loggedIn) { for (const n of s.next) console.error(`  → ${n}`); fail("git and a logged-in GitHub CLI are needed — see above", 3); }
  const git = (args) => run(s.gitPath, args, { cwd: dir });
  if (!existsSync(join(dir, ".git"))) git(["init", "-b", "main"]);
  // Commit identity: reuse the user's git identity; otherwise the GitHub account's private noreply address.
  if (!tryRun(s.gitPath, ["config", "user.email"], { cwd: dir }).out.trim()) {
    const me = JSON.parse(run(s.ghPath, ["api", "user"]));
    git(["config", "user.name", me.name || me.login]);
    git(["config", "user.email", `${me.id}+${me.login}@users.noreply.github.com`]);
  }
  git(["add", "-A"]);
  if (tryRun(s.gitPath, ["diff", "--cached", "--quiet"], { cwd: dir }).ok === false) git(["commit", "-m", "Initial commit"]);
  const args = ["repo", "create", repo, values["--public"] ? "--public" : "--private", "--source", dir, "--remote", "origin", "--push"];
  if (values["--description"]) args.push("--description", String(values["--description"]).slice(0, 350));
  const created = tryRun(s.ghPath, args, { cwd: dir, timeout: 300_000 });
  if (!created.ok) fail(`gh repo create failed: ${created.out.trim().split("\n").slice(-2).join(" ")}${/already exists/i.test(created.out) ? " — pick another --repo name" : ""}`, 1);
  const url = tryRun(s.ghPath, ["repo", "view", "--json", "url", "-q", ".url"], { cwd: dir }).out.trim();
  return { url, account: s.account, files: r.files, warnings: r.counts.warn || 0 };
}

// ── main ─────────────────────────────────────────────────────────────────────
if (cmd === "check") {
  const dir = resolve(positional[0] || ".");
  if (!existsSync(dir)) fail(`folder not found: ${dir}`);
  const r = check(dir);
  values["--json"] ? console.log(JSON.stringify(r, null, 2)) : printCheck(r);
  process.exitCode = r.counts.error ? 1 : 0;
} else if (cmd === "prepare") {
  if (!values["--out"]) fail("prepare needs --out <folder>");
  const src = resolve(positional[0] || "."), out = resolve(values["--out"]);
  const p = prepare(src, out);
  console.log(`Prepared ${out}\n  copied ${p.copied} files · left out ${p.skipped.length}${p.skipped.length ? ` (${p.skipped.slice(0, 8).join(", ")}${p.skipped.length > 8 ? ", …" : ""})` : ""}${p.wrote.length ? ` · wrote ${p.wrote.join(", ")}` : ""}\n`);
  const r = check(out); printCheck(r);
  process.exitCode = r.counts.error ? 1 : 0;
} else if (cmd === "gh") {
  const s = ghStatus();
  if (values["--json"]) console.log(JSON.stringify(s, null, 2));
  else {
    console.log(`git: ${s.git || "✖ not installed"}\nGitHub CLI: ${s.gh ? `${s.gh}${s.ghPath !== "gh" ? ` (${s.ghPath} — not on PATH yet)` : ""}` : "✖ not installed"}\nGitHub login: ${s.gh ? (s.loggedIn ? `✔ ${s.account || "logged in"}` : "✖ not logged in") : "—"}`);
    for (const n of s.next) console.log(`  → ${n}`);
    if (!s.next.length) console.log("Ready to publish.");
  }
  process.exitCode = !s.gitPath ? 2 : !s.ghPath ? 3 : !s.loggedIn ? 4 : 0;
} else if (cmd === "install") {
  process.exitCode = install(positional[0]);
} else if (cmd === "publish") {
  const dir = resolve(positional[0] || "");
  if (!positional[0] || !existsSync(dir)) fail("publish needs the prepared folder: node ship.mjs publish <dir> --repo <name> --public|--private --yes");
  const p = publish(dir);
  console.log(`Published ✔ ${p.url}\n  ${p.files} files · account ${p.account || "?"} · ${p.warnings} warning(s) from the ship check`);
} else fail(`unknown command "${cmd}" (check · prepare · gh · install · publish)`);
