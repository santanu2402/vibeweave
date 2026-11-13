#!/usr/bin/env node
// Vibeweave installer — installs the skills, rules, slash commands and subagents natively into any
// agentic IDE/CLI, on Windows, macOS and Linux. Zero dependencies (Node ≥ 18).
//
//   npx vibeweave                              detect the IDEs this project uses and install for them
//   npx vibeweave --agent cursor,copilot       specific IDEs (see --list)      · --agent all
//   npx vibeweave --global                     user-wide (skills + subagents)  · --project <dir>
//   npx vibeweave --skills vibeweave,ui-test   a subset of skills              · --link (symlink/junction)
//   npx vibeweave --no-agents --no-rules --no-usage   skip subagents / rule files / Claude usage hook
//   npx vibeweave --dry-run                    show what would be written      · --uninstall
//   npx vibeweave --force                      also replace same-named files that Vibeweave didn't create
//   npx vibeweave --list                       supported IDEs and where files go
//   npx vibeweave usage [project-dir]          time + tokens of the last Claude Code run (if hooks are blocked)
//   npx vibeweave doctor [--network]           is this machine/project ready? what's missing and how to fix it
//   npx vibeweave check <url> [--pages a,b] [--device desktop]   one-command scorecard: wiring, SEO, QA, responsive, Core Web Vitals
//   npx vibeweave stats [project-dir]          local time/token statistics per run (estimate the next build)
//   npx vibeweave feedback                     where to send feedback: website form, GitHub forms, email
//
// Safety: writes only inside the project (or your home folder with --global), never runs shell commands, keeps
// files it didn't create (unless --force), and --uninstall removes only what Vibeweave installed.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, symlinkSync, lstatSync, statSync, unlinkSync, rmdirSync, realpathSync } from "node:fs";
import { dirname, join, resolve, relative, basename, isAbsolute } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_SKILLS = join(REPO, "skills"), SRC_AGENTS = join(REPO, "agents");
const argv = process.argv.slice(2);
if (argv[0] === "doctor" || argv[0] === "check" || argv[0] === "stats") process.exit(spawnSync(process.execPath, [join(REPO, "bin", `${argv[0]}.mjs`), ...argv.slice(1)], { stdio: "inherit" }).status ?? 1);
if (argv[0] === "feedback") {
  console.log([
    "Tell us how Vibeweave went — every entry is read:",
    "  Website form (private, emailed): https://vibeweave-glance.netlify.app/feedback/",
    "  GitHub forms (public):           https://github.com/santanu2402/vibeweave/issues/new/choose",
    "  Email:                           itsantanu24@gmail.com",
  ].join("\n"));
  process.exit(0);
}
if (argv[0] === "usage") process.exit(spawnSync(process.execPath, [join(REPO, "hooks", "usage-report.mjs"), "--last", argv[1] || process.cwd()], { stdio: "inherit" }).status ?? 1);
// Reject typos and stray words instead of silently ignoring them (a misspelt --agnet would otherwise auto-detect and install).
const VALUE_OPTS = new Set(["--agent", "--agents", "-a", "--project", "-p", "--skills", "-s"]);
const BOOL_OPTS = new Set(["--global", "-g", "--dry-run", "--uninstall", "--link", "-l", "--force", "--list", "--help", "-h", "--no-agents", "--no-rules", "--no-usage"]);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (VALUE_OPTS.has(a)) {
    if (argv[i + 1] == null || argv[i + 1].startsWith("-")) { console.error(`✖ ${a} needs a value — see --help`); process.exit(2); }
    i++;
  } else if (!BOOL_OPTS.has(a)) { console.error(`✖ unknown ${a.startsWith("-") ? "option" : "argument"} "${a}" — see --help`); process.exit(2); }
}
const has = (...f) => f.some((x) => argv.includes(x));
const val = (...f) => { for (const x of f) { const i = argv.indexOf(x); if (i !== -1) return argv[i + 1]; } return null; };
const HOME = homedir();
const GLOBAL = has("--global", "-g"), DRY = has("--dry-run"), UNINSTALL = has("--uninstall"), LINK = has("--link", "-l"), FORCE = has("--force");
const PROJECT = resolve(val("--project", "-p") || process.cwd());
const ALL_SKILLS = readdirSync(SRC_SKILLS).filter((d) => existsSync(join(SRC_SKILLS, d, "SKILL.md")));
const SKILLS = (val("--skills", "-s") || "").split(",").filter(Boolean).length ? val("--skills", "-s").split(",") : ALL_SKILLS;

// IDE table. skills/agents/rule/command paths are relative to the project (or home with --global: g*).
// fmt = how subagents are written: md (Claude format) · agent-md (Copilot) · toml (Codex) · min-md (name+description only) · opencode
const IDES = {
  universal:   { label: "Agent Skills standard (.agents/skills — Cursor, Copilot, Codex, Gemini, Antigravity, Devin, Junie, OpenCode, Zed…)", skills: ".agents/skills", gskills: ".agents/skills" },
  claude:      { label: "Claude Code", skills: ".claude/skills", gskills: ".claude/skills", agents: ".claude/agents", gagents: ".claude/agents", fmt: "md", usage: true, detect: [".claude", "CLAUDE.md"] },
  cursor:      { label: "Cursor", skills: ".agents/skills", gskills: ".cursor/skills", agents: ".cursor/agents", gagents: ".cursor/agents", fmt: "md",
                 rule: [".cursor/rules/vibeweave.mdc", "---\ndescription: Frontend UI/UX work — building, styling, animating, testing or reviewing any page or component\nalwaysApply: false\n---\n"], detect: [".cursor", ".cursorrules"] },
  copilot:     { label: "GitHub Copilot (VS Code)", skills: ".agents/skills", gskills: ".copilot/skills", agents: ".github/agents", gagents: ".copilot/agents", fmt: "agent-md",
                 rule: [".github/instructions/vibeweave.instructions.md", "---\napplyTo: \"**/*.{tsx,jsx,ts,js,vue,svelte,astro,html,css,scss,mdx}\"\n---\n"],
                 command: [".github/prompts/vibeweave.prompt.md", "---\ndescription: Run the Vibeweave frontend crew (clarify → requirements → plan → tasks → build → test)\nagent: agent\n---\nFollow the vibeweave skill in `.agents/skills/vibeweave/SKILL.md` for this request: ${input:request:What should we build or redesign?}\n"],
                 detect: [".github/copilot-instructions.md", ".github/instructions", ".github/prompts", ".vscode"] },
  codex:       { label: "OpenAI Codex", skills: ".agents/skills", gskills: ".agents/skills", agents: ".codex/agents", gagents: ".codex/agents", fmt: "toml", agentsMd: true, detect: [".codex"] },
  gemini:      { label: "Gemini CLI", skills: ".agents/skills", gskills: ".gemini/skills", agents: ".gemini/agents", gagents: ".gemini/agents", fmt: "min-md", geminiMd: true,
                 command: [".gemini/commands/vibeweave.toml", "description = \"Run the Vibeweave frontend crew (clarify → requirements → plan → tasks → build → test)\"\nprompt = \"\"\"Follow the vibeweave skill in .agents/skills/vibeweave/SKILL.md for this request: {{args}}\"\"\"\n"], detect: [".gemini", "GEMINI.md"] },
  antigravity: { label: "Google Antigravity", skills: ".agents/skills", gskills: ".gemini/config/skills", agentsMd: true,
                 rule: [".agents/rules/vibeweave.md", "---\ntrigger: model_decision\ndescription: Frontend UI/UX work — building, styling, animating, testing or reviewing any page or component\n---\n"], detect: [".agents/rules", ".agent"] },
  devin:       { label: "Devin Desktop (formerly Windsurf)", skills: ".agents/skills", gskills: ".config/devin/skills", agentsMd: true,
                 rule: [".devin/rules/vibeweave.md", "---\ntrigger: model_decision\ndescription: Frontend UI/UX work — building, styling, animating, testing or reviewing any page or component\n---\n"], detect: [".devin", ".windsurf", ".windsurfrules"] },
  kiro:        { label: "Kiro", skills: ".kiro/skills", gskills: ".kiro/skills", agents: ".kiro/agents", gagents: ".kiro/agents", fmt: "min-md",
                 rule: [".kiro/steering/vibeweave.md", "---\ninclusion: auto\nname: vibeweave\ndescription: Frontend UI/UX work — building, styling, animating, testing or reviewing any page or component\n---\n"], detect: [".kiro"] },
  cline:       { label: "Cline", skills: ".cline/skills", gskills: ".cline/skills", rule: [".clinerules/vibeweave.md", ""], detect: [".clinerules", ".cline"] },
  junie:       { label: "JetBrains Junie", skills: ".agents/skills", gskills: ".agents/skills", agents: ".junie/agents", gagents: ".junie/agents", fmt: "min-md", agentsMd: true,
                 command: [".junie/commands/vibeweave.md", "---\ndescription: Run the Vibeweave frontend crew (clarify → requirements → plan → tasks → build → test)\n---\nFollow the vibeweave skill in `.agents/skills/vibeweave/SKILL.md` for this request: $request\n"], detect: [".junie"] },
  opencode:    { label: "OpenCode", skills: ".agents/skills", gskills: ".config/opencode/skills", agents: ".opencode/agents", gagents: ".config/opencode/agents", fmt: "opencode", agentsMd: true,
                 command: [".opencode/commands/vibeweave.md", "---\ndescription: Run the Vibeweave frontend crew (clarify → requirements → plan → tasks → build → test)\n---\nFollow the vibeweave skill in `.agents/skills/vibeweave/SKILL.md` for this request: $ARGUMENTS\n"], detect: [".opencode", "opencode.json", "opencode.jsonc"] },
  zed:         { label: "Zed", skills: ".agents/skills", gskills: ".agents/skills", agentsMd: true, detect: [".zed"] },
  continue:    { label: "Continue", skills: ".agents/skills", gskills: ".agents/skills",
                 rule: [".continue/rules/vibeweave.md", "---\nname: Vibeweave frontend rules\ndescription: Frontend UI/UX work — building, styling, animating, testing or reviewing any page or component\nalwaysApply: false\n---\n"], detect: [".continue"] },
  amazonq:     { label: "Amazon Q Developer", skills: ".agents/skills", gskills: ".agents/skills", rule: [".amazonq/rules/vibeweave.md", ""], detect: [".amazonq"] },
  jetbrains:   { label: "JetBrains AI Assistant", skills: ".agents/skills", gskills: ".agents/skills", rule: [".aiassistant/rules/vibeweave.md", ""], detect: [".aiassistant"] },
  trae:        { label: "Trae (paths unverified)", skills: ".trae/skills", gskills: ".trae/skills", rule: [".trae/rules/vibeweave.md", ""], detect: [".trae"] },
  roo:         { label: "Roo Code (archived)", skills: ".roo/skills", gskills: ".roo/skills" },
  kilo:        { label: "Kilo Code", skills: ".agents/skills", gskills: ".kilo/skills" },
  goose:       { label: "Goose", skills: ".goose/skills", gskills: ".config/goose/skills" },
  qwen:        { label: "Qwen Code", skills: ".qwen/skills", gskills: ".qwen/skills" },
  augment:     { label: "Augment", skills: ".augment/skills", gskills: ".augment/skills" },
  droid:       { label: "Factory Droid", skills: ".factory/skills", gskills: ".factory/skills" },
  warp:        { label: "Warp", skills: ".agents/skills", gskills: ".agents/skills" },
};
IDES.windsurf = { ...IDES.devin, label: "Windsurf → Devin Desktop" };

if (has("--help", "-h")) {
  const header = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1);
  console.log(header.slice(0, header.findIndex((l) => !l.startsWith("//"))).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(0);
}
if (has("--list")) {
  console.log("IDE          SKILLS (project)        EXTRAS");
  for (const [k, d] of Object.entries(IDES)) if (k !== "windsurf")
    console.log(`${k.padEnd(12)} ${d.skills.padEnd(23)} ${[d.agents && `agents → ${d.agents}`, d.rule && `rule → ${d.rule[0]}`, d.command && `command → ${d.command[0]}`, d.agentsMd && "AGENTS.md block", d.usage && "usage hook"].filter(Boolean).join(" · ")}`);
  process.exit(0);
}
const fail = (msg) => { console.error(`✖ ${msg}`); process.exit(2); };
if (!GLOBAL) {
  let isDir = false; try { isDir = statSync(PROJECT).isDirectory(); } catch {}
  if (!isDir) fail(`--project ${PROJECT} is not an existing folder`);
  if (PROJECT === REPO) fail("You're inside the Vibeweave repo itself. Run from your project folder, or pass --project <dir> or --global.");
}
for (const s of SKILLS) if (!ALL_SKILLS.includes(s)) fail(`unknown skill "${s}" (available: ${ALL_SKILLS.join(", ")})`);

// Which IDEs? Explicit --agent list, else whatever the project already uses (Claude Code when nothing is detected).
let targets = (val("--agent", "--agents", "-a") || "").split(",").filter(Boolean);
if (targets.includes("all")) targets = Object.keys(IDES).filter((k) => k !== "windsurf");
if (!targets.length) {
  targets = Object.entries(IDES).filter(([, d]) => d.detect?.some((p) => existsSync(join(PROJECT, p)))).map(([k]) => k);
  targets = ["universal", ...(targets.length ? targets : ["claude"])];
  console.log(`Detected: ${targets.slice(1).join(", ") || "(none)"} — installing for ${targets.join(", ")}. Use --agent to choose.`);
}
for (const t of targets) if (!Object.hasOwn(IDES, t)) fail(`unknown IDE "${t}" — see --list`);

const root = GLOBAL ? HOME : PROJECT;
const written = [], removed = [], kept = [], seen = new Set(), emptied = new Set();
const say = (verb, p) => console.log(`${verb} ${relative(process.cwd(), p) || p}`);

// ── Ownership: Vibeweave only replaces or removes what it created ────────────────
const OWN_MARK = "installed by vibeweave";
const REPO_REAL = (() => { try { return realpathSync(REPO); } catch { return REPO; } })();
const tryLstat = (p) => { try { return lstatSync(p); } catch { return null; } };
const within = (base, p) => { const rel = relative(base, p); return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel)); };

/** True when `p` was created by Vibeweave: a link into this package (or a dangling link), one of its skill folders
 *  (SKILL.md metadata names the vibeweave repository), or a file it named "vibeweave…" or marked with OWN_MARK. */
function ours(p) {
  const st = tryLstat(p);
  if (!st) return false;
  if (st.isSymbolicLink()) { try { return within(REPO_REAL, realpathSync(p)); } catch { return true; } }
  if (st.isDirectory()) {
    const skill = join(p, "SKILL.md");
    if (!existsSync(skill)) return false;
    const fm = readFileSync(skill, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
    return /^\s*repository:\s*\S*\/vibeweave\/?\s*$/m.test(fm);
  }
  if (!st.isFile()) return false;
  if (/vibeweave/i.test(basename(p))) return true;
  try { return readFileSync(p, "utf8").slice(0, 4000).includes(OWN_MARK); } catch { return false; }
}

/** Delete something Vibeweave created. Links are unlinked, never followed (Windows junctions need rmdir). */
function removePath(p) {
  const st = tryLstat(p);
  if (!st || DRY) return;
  if (st.isSymbolicLink()) { try { unlinkSync(p); } catch { rmdirSync(p); } }
  else rmSync(p, { recursive: st.isDirectory(), force: true });
}

function keep(p) { kept.push(p); say("▲ kept (not created by Vibeweave — --force replaces it)", p); }

/** Stamp generated files so a later install/uninstall recognises them (a YAML/TOML comment the IDEs ignore). */
function mark(p, content) {
  if (/vibeweave/i.test(basename(p))) return content;
  if (p.endsWith(".toml")) return `# ${OWN_MARK}\n${content}`;
  if (/^---\r?\n/.test(content)) return content.replace(/^---\r?\n/, `---\n# ${OWN_MARK}\n`);
  return `${content.replace(/\s*$/, "\n")}\n<!-- ${OWN_MARK} -->\n`;
}

function write(p, content) {
  if (seen.has(p)) return; seen.add(p);
  const exists = !!tryLstat(p);
  if (UNINSTALL) {
    if (exists && ours(p)) { removePath(p); removed.push(p); say(DRY ? "would remove" : "− removed", p); }
    else if (exists) keep(p);
    return;
  }
  if (exists && !FORCE && !ours(p)) return keep(p);
  if (!DRY) {
    mkdirSync(dirname(p), { recursive: true });
    if (tryLstat(p)?.isSymbolicLink()) removePath(p); // never write through a link
    writeFileSync(p, mark(p, content));
  }
  written.push(p); say(DRY ? "would write" : "✔ wrote", p);
}

function placeSkill(skill, destDir) {
  const dest = join(destDir, skill), src = join(SRC_SKILLS, skill);
  if (seen.has(dest)) return; seen.add(dest);
  const exists = !!tryLstat(dest);
  if (UNINSTALL) {
    if (exists && ours(dest)) { removePath(dest); removed.push(dest); say(DRY ? "would remove" : "− removed", dest); }
    else if (exists) keep(dest);
    return;
  }
  if (exists && !FORCE && !ours(dest)) return keep(dest);
  if (!DRY) {
    if (exists) removePath(dest);
    mkdirSync(destDir, { recursive: true });
    if (LINK) symlinkSync(src, dest, process.platform === "win32" ? "junction" : "dir"); else cpSync(src, dest, { recursive: true });
  }
  written.push(dest); say(DRY ? "would place" : LINK ? "✔ linked" : "✔ copied", dest);
}

// ── Subagents: parse once, convert per IDE format ───────────────────────────────
const AGENTS = existsSync(SRC_AGENTS) ? readdirSync(SRC_AGENTS).filter((f) => f.endsWith(".md")).flatMap((f) => {
  const text = readFileSync(join(SRC_AGENTS, f), "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  const name = m?.[1].match(/^name:\s*(.+)$/m)?.[1].trim(), description = m?.[1].match(/^description:\s*(.+)$/m)?.[1].trim();
  if (!m || !name || !description) { console.error(`▲ skipped agents/${f} (missing frontmatter name/description)`); return []; }
  return [{ file: f, name, description, readonly: /disallowedTools:\s*.*Edit/.test(m[1]), raw: text, body: m[2] }];
}) : [];
const yamlStr = (s) => JSON.stringify(s);
const portableBody = (body, skillsDir) => body.replaceAll("${VIBEWEAVE_SKILLS}/", `${skillsDir}/`);

/** Subagent file path + content in the target IDE's format. */
function agentFile(a, fmt, dir, skillsDir) {
  const body = portableBody(a.body, skillsDir);
  switch (fmt) {
    case "md": {
      const raw = portableBody(a.raw, skillsDir);
      return [join(dir, a.file), dir.includes(".cursor") && a.readonly ? raw.replace(/^---\r?\n/, "---\nreadonly: true\n") : raw];
    }
    case "agent-md": return [join(dir, a.file.replace(/\.md$/, ".agent.md")), `---\nname: ${a.name}\ndescription: ${yamlStr(a.description)}\n---\n${body}`];
    // TOML multi-line literal strings end at ''' — break any occurrence inside the body.
    case "toml": return [join(dir, a.file.replace(/\.md$/, ".toml")), `name = ${JSON.stringify(a.name.replaceAll("-", "_"))}\ndescription = ${JSON.stringify(a.description)}\ndeveloper_instructions = '''\n${body.replaceAll("'''", "'' '")}\n'''\n`];
    case "opencode": return [join(dir, a.file), `---\ndescription: ${yamlStr(a.description)}\nmode: subagent\n---\n${body}`];
    default: return [join(dir, a.file), `---\nname: ${a.name}\ndescription: ${yamlStr(a.description)}\n---\n${body}`];
  }
}

// ── Always-on rules: rule files, and a marked block inside AGENTS.md / GEMINI.md ─────
const RULE_BODY = readFileSync(join(REPO, "adapters", "AGENTS.snippet.md"), "utf8").replace(/<!--[\s\S]*?-->\s*/, "").trim() + "\n";
const MARK = ["<!-- vibeweave:start -->", "<!-- vibeweave:end -->"];

/** Insert or refresh the Vibeweave block between the markers; everything else in the file is left untouched. */
function upsertBlock(file) {
  const block = `${MARK[0]}\n${RULE_BODY}${MARK[1]}\n`;
  const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
  const re = new RegExp(`${MARK[0]}[\\s\\S]*?${MARK[1]}\\n?`);
  if (UNINSTALL) {
    if (re.test(cur)) {
      // Also drop the blank line the install put before the block, so the user's file comes back byte for byte.
      const next = cur.replace(new RegExp(`\\n?${MARK[0]}[\\s\\S]*?${MARK[1]}\\n?`), "");
      if (!DRY) next.trim() ? writeFileSync(file, next) : rmSync(file);
      removed.push(file); say("− removed block from", file);
    }
    return;
  }
  if (seen.has(file)) return; seen.add(file);
  const next = re.test(cur) ? cur.replace(re, block) : (cur ? cur.replace(/\s*$/, "\n\n") : "") + block;
  if (!DRY) writeFileSync(file, next);
  written.push(file); say(DRY ? "would update" : "✔ updated", file);
}

/** Claude Code Stop hook that prints time + tokens after each run; other settings keys are preserved. */
function usageHook() {
  const hookDest = join(root, ".claude", "hooks", "vibeweave-usage.mjs");
  write(hookDest, readFileSync(join(REPO, "hooks", "usage-report.mjs"), "utf8"));
  const settings = join(root, ".claude", GLOBAL ? "settings.json" : "settings.local.json");
  let json = {};
  try { json = existsSync(settings) ? JSON.parse(readFileSync(settings, "utf8")) : {}; } catch { console.error(`▲ ${settings} isn't valid JSON — skipped the usage hook`); return; }
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  if (!isObj(json) || (json.hooks != null && !isObj(json.hooks)) || (json.hooks?.Stop != null && !Array.isArray(json.hooks.Stop))) {
    console.error(`▲ ${settings} has an unexpected "hooks" shape — skipped the usage hook`); return;
  }
  const cmd = { type: "command", command: "node", args: [hookDest], timeout: 20 };
  const stop = (json.hooks ||= {}).Stop ||= [];
  const idx = stop.findIndex((g) => g?.hooks?.some?.((h) => (h.args || []).join(" ").includes("vibeweave-usage") || String(h.command || "").includes("vibeweave-usage")));
  if (UNINSTALL) {
    if (idx !== -1) {
      stop.splice(idx, 1); if (!stop.length) delete json.hooks.Stop; if (!Object.keys(json.hooks).length) delete json.hooks;
      if (!DRY) Object.keys(json).length ? writeFileSync(settings, JSON.stringify(json, null, 2) + "\n") : (rmSync(settings), emptied.add(dirname(settings)));
      say("− removed usage hook from", settings);
    }
    return;
  }
  if (idx === -1) stop.push({ hooks: [cmd] }); else stop[idx] = { hooks: [cmd] };
  if (!DRY) { mkdirSync(dirname(settings), { recursive: true }); writeFileSync(settings, JSON.stringify(json, null, 2) + "\n"); }
  say(DRY ? "would add usage hook to" : "✔ usage hook (time + tokens after each run) →", settings);
}

for (const t of targets) {
  const d = IDES[t];
  const skillsDir = GLOBAL ? join(HOME, d.gskills) : join(PROJECT, d.skills);
  for (const s of SKILLS) placeSkill(s, skillsDir);
  if (!has("--no-agents") && d.agents) {
    const dir = GLOBAL ? join(HOME, d.gagents) : join(PROJECT, d.agents);
    const rel = GLOBAL ? skillsDir : (d.skills || ".agents/skills");
    for (const a of AGENTS) { const [p, content] = agentFile(a, d.fmt, dir, rel.replaceAll("\\", "/")); write(p, content); }
  }
  if (GLOBAL) continue;                                  // rules, commands and AGENTS.md are project files
  if (!has("--no-rules")) {
    if (d.rule) write(join(PROJECT, d.rule[0]), d.rule[1] + RULE_BODY);
    if (d.command) write(join(PROJECT, d.command[0]), d.command[1]);
    if (d.agentsMd) upsertBlock(join(PROJECT, "AGENTS.md"));
    if (d.geminiMd) upsertBlock(join(PROJECT, "GEMINI.md"));
  }
  if (d.usage && !has("--no-usage")) usageHook();
}
if (GLOBAL && targets.includes("claude") && !has("--no-usage")) usageHook();
// Uninstall leaves nothing behind: folders that only held Vibeweave's files are removed once empty (deepest first,
// never the project or home folder itself, and never a folder that still has anything in it).
if (UNINSTALL && !DRY) {
  for (const p of removed) emptied.add(dirname(p));
  for (const from of [...emptied].sort((a, b) => b.length - a.length)) {
    for (let d = from; d !== root && within(root, d); d = dirname(d)) {
      try { if (readdirSync(d).length) break; rmdirSync(d); } catch { break; }
    }
  }
}

const keptNote = kept.length ? ` Kept ${kept.length} existing item(s) Vibeweave didn't create (see ▲ above; --force replaces them).` : "";
console.log(UNINSTALL ? `\nRemoved ${removed.length} item(s).${keptNote}` : `\n${DRY ? "Dry run — nothing written." : "Done."} ${written.length} item(s) for ${targets.join(", ")}.${keptNote} Restart or reload your IDE, then try:
  /vibeweave build a landing page for a specialty coffee roaster      (clarifies requirements first)
  "Check every page is wired and give me a QA report"                 (ui-test)
  "Walk the signup flow like a new user and tell me where people get stuck"   (ux-audit)`);
