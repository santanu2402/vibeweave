# Vibeweave — the AI frontend UI/UX crew for Claude Code, Cursor, Copilot, Codex & Gemini

**From vibe to verified.** Vibeweave turns any AI coding agent into a full frontend studio. It interviews you
until your requirements are clear, gets your approval on the requirements, the plan and the task list, then
designs, builds, animates, wires, tests, optimizes and fixes your website or app — and proves it with evidence.

[![npm](https://img.shields.io/npm/v/vibeweave?color=ff9b52&label=npm)](https://www.npmjs.com/package/vibeweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-SKILL.md-black)](https://agentskills.io/specification)
![Works with](https://img.shields.io/badge/works%20with-20%2B%20IDEs-brightgreen)
![Dependencies](https://img.shields.io/badge/dependencies-0-orange)

**Website & full manual:** [vibeweave-glance.netlify.app](https://vibeweave-glance.netlify.app/) ·
**npm:** [`vibeweave`](https://www.npmjs.com/package/vibeweave)

```bash
npx vibeweave                     # run inside your project: detects your IDEs and installs natively
```

---

## Contents
[What it is](#what-it-is) · [Why it's different](#why-its-different) · [How it works](#how-it-works) ·
[What's inside](#whats-inside) · [Requirements](#requirements) · [Install](#install) · [Check the install](#check-the-install) ·
[How to use it](#how-to-use-it) · [Supported IDEs](#supported-ides) · [Tools](#tools) · [Configuration](#configuration) ·
[Update & uninstall](#update--uninstall) · [Troubleshooting](#troubleshooting) · [Security](#security) · [FAQ](#faq) ·
[Development](#development) · [Contact](#author--contact)

## How it compares
We reviewed 29 related tools against their own public documentation (10 November 2026).

| Capability | Vibeweave | Design skill packs | Spec-driven workflows | AI site builders |
|---|:-:|:-:|:-:|:-:|
| Interviews you, then three approval gates (requirements, plan, tasks) | ● | ◐ | ● | ◐ |
| Originality score against presets **and your past projects** | ● | — | — | — |
| Finds buttons that do nothing, missing anchors, orphan pages | ● | — | — | — |
| Measures in a real browser: axe, keyboard, 13 widths, Core Web Vitals | ● | ◐ | ◐ | ◐ |
| 14 frontend specialists, installed natively in 20+ IDEs | ● | ◐ | ◐ | — |
| Local mock API with field errors, latency and forced states | ● | — | — | — |
| Memory and feedback rounds until you say "ship it" | ● | ◐ | ◐ | ◐ |
| "Ship it": clean-up, secret scan and a published GitHub repo after one approval | ● | — | — | ◐ |
| Time-and-token receipt after every run | ● | — | — | ◐ |
| Component fetching with a licence record; refuses sites that ban scraping | ● | — | — | — |
| Free, open source, zero dependencies, no telemetry | ● | ◐ | ◐ | — |
| Hosted live preview, one-click deploy, visual editor | — | — | — | ● |

● yes · ◐ some tools in the category, or partly · — not in their documentation. Hosted builders lead on preview,
deploys and visual editing; Vibeweave works inside your own editor, repo and hosting.

## What it is
Ask a model for "a modern landing page" and you get the internet's average — Inter, a purple gradient, a centered
hero, three identical cards — built from guesses and never tested. Vibeweave fixes both halves: **how it looks**
and **whether it works**.

It is a pack of **[Agent Skills](https://agentskills.io/specification)** (plain `SKILL.md` folders that any compatible
agent reads), **14 subagents** for agents that support them, and **18 zero-dependency Node.js tools** that measure
what models usually guess — contrast, layout breakage, broken links, accessibility, Core Web Vitals, originality.
One installer sets it up natively in 20+ IDEs.

## Why it's different
- **It asks before it builds.** Short rounds of multiple-choice questions until nothing is unclear, then three
  approval gates — `REQUIREMENTS.md` → `PLAN.md` → `TASKS.md`. Say "no" anywhere and it stops, listens and revises.
- **It refuses to look generic.** An originality engine seeds fresh directions and fingerprints every design
  against 25 reference presets *and your past projects*; anything too close is redesigned.
- **It verifies like a real team.** Wiring, QA, UX, responsiveness, performance, bug fixing and design review run
  in a real browser, in a capped loop, and end in an evidence table.
- **It knows itself.** A generated system map tells the agent what it can do and which skill, subagent, script or
  file to use for any request — at the start and mid-task.
- **It's frugal.** About 2.6k tokens always on (progressive disclosure), scripts instead of long reasoning, and a
  time-and-token report after every run in Claude Code.
- **It remembers.** `MEMORY.md` keeps your preferences, decisions and lessons learned; `BUILDLOG.md` records every
  session and round. The next session starts where the last one stopped — without re-asking.
- **It keeps improving after delivery.** It asks for your feedback, and anything short of "ship it" starts a
  feedback round: fix, enhance, optimize, improve, re-verify — until you are happy.
- **It ships it.** Say "ship it" and it cleans the codebase, re-verifies the production build, assembles a
  GitHub-ready copy (README, licence, .gitignore — secrets scanned out), checks the GitHub CLI and your login, and
  publishes the repo — after one approval of the ship plan.
- **It never invents your facts** — no made-up prices, testimonials, client logos or business names.

## How it works
```
A Clarify ─► B Requirements ✓ ─► C Plan ✓ ─► D Tasks ✓          ✓ = your approval · "no" → clarify & revise
                                                │
E Execute: tokens ─► build ─► motion/3D ─► wire ─► test ─► UX ─► optimize ─► fix ─► review   (loop, capped)
                                                └──────────── until every gate passes ───────────┘
F Handover: evidence table · REQUIREMENTS/PLAN/TASKS/DESIGN.md stay as contracts
                                                │
G Feedback round ◄── "change X" / "feels off" / "make it faster" ── loop until "ship it"
  capture → triage → fix · enhance · optimize · improve → verify → BUILDLOG.md + MEMORY.md → ask again
                                                │ "ship it"
H Ship it: ship plan ✓ → clean up → re-verify → GitHub-ready copy → gh + login → publish → summary with the repo URL
```
| Phase | What happens |
|---|---|
| **A. Clarify** | Reads your repo first — and your brief, if you have one: point to `brief.md` / `PROMPT.txt`, attach it or paste it, and it asks only what the brief leaves open. Then asks rounds of ≤ 4 questions with a recommended answer each. Round 2 is always design: light, dark or both; how much motion and animation, and which moving parts; imagery and type. Reply like `1a 2b 3a`, or `defaults`. |
| **B. Requirements** | `REQUIREMENTS.md`: goal, audience, pages, flows, content, direction, acceptance criteria. You approve or change it. |
| **C. Plan** | `PLAN.md`: direction, architecture, motion storyboard, assets, quality strategy, risks. |
| **D. Tasks** | `TASKS.md`: numbered tasks, each with an owner and a *done-when* check. Then you pick **fast** (one full-fidelity check pass, specialists only where something fails) or **detailed** (the whole crew in parallel, two rounds) — both ship only when every gate passes. |
| **E. Execute** | Design tokens → build in vertical slices → motion and 3D → the quality loop (wire, test, UX, optimize, fix, review), two rounds by default. |
| **F. Handover** | An evidence table (QA verdict, Core Web Vitals, wiring, UX and audit scores), what's unverified, and next steps; the round is logged in `BUILDLOG.md` and `MEMORY.md` is updated. |
| **G. Feedback rounds** | It asks how it feels. Changes, complaints or new ideas are quoted in `BUILDLOG.md`, preferences go into `MEMORY.md`, and each item is triaged, built with the crew, optimized, re-verified against the last round's numbers and handed over again — until you say "ship it". |
| **H. Ship it** | One ship plan to approve (repo name, public/private, licence, GitHub CLI install if needed). Then it removes debug code, dead files and unused dependencies, re-runs the production build and `npx vibeweave check`, writes a clean GitHub-ready copy with a README, scans it for secrets, has you log in to GitHub once in your browser, creates and pushes the repo, and ends with a summary and the link. |

Small jobs compress the gates (a bug fix needs none; one section gets one combined approval). Asked to "just build
it"? It writes the documents with inferred answers marked `UNVALIDATED` and proceeds.

**Ship gates:** every acceptance criterion verified · QA and wiring PASS · LCP ≤ 2.5s, CLS ≤ 0.1, TBT ≤ 200ms on
mobile · no console errors or horizontal overflow · axe clean of critical/serious · reduced-motion and no-JS paths
work · design audit ≥ 40/50 · originality check ORIGINAL.

## What's inside
### Skills (10)
| Skill | Role | Highlights |
|---|---|---|
| [vibeweave](skills/vibeweave/SKILL.md) | producer / orchestrator | clarification rounds, 3 approval gates, the No rule, crew pipeline, ship gates, loop caps, feedback rounds, MEMORY.md + BUILDLOG.md, system map |
| [frontend-forge](skills/frontend-forge/SKILL.md) | art director + engineer | 22 UI styles, design tokens, typography, color, layout, theming, responsive, feedback states, 28 site checklists, 25 presets, 23 original patterns, icons, fonts, logos |
| [motion-forge](skills/motion-forge/SKILL.md) | motion designer + 3D | storyboards, GSAP / Motion / CSS, page transitions, motion graphics, physics & springs, masking, shadows & light, cinematic scroll, Three.js / R3F, Lottie, Rive |
| [visual-dna](skills/visual-dna/SKILL.md) | reference analyst | design DNA from URLs or screenshots, DESIGN.md, image → code (style, never identity) |
| [ui-integrate](skills/ui-integrate/SKILL.md) | integration engineer | forms, actions, navigation, data fetching, every backend response, mock API, API contract |
| [ui-test](skills/ui-test/SKILL.md) | QA + wiring | "is every page wired?", accessibility, keyboard, responsive sweep, visual, motion, no-JS, Playwright specs |
| [ux-audit](skills/ux-audit/SKILL.md) | UX researcher | task walkthroughs, usability heuristics, IA, forms, microcopy, trust, dark-pattern check |
| [ui-optimize](skills/ui-optimize/SKILL.md) | performance engineer | Core Web Vitals with culprits, bundle analysis, symptom → fix playbook |
| [ui-debug](skills/ui-debug/SKILL.md) | bug fixer | root-cause protocol, DOM/CSS probe, catalog of 25 frontend bugs |
| [ui-audit](skills/ui-audit/SKILL.md) | design critic | /50 rubric, prioritized `file:line` fixes |

### Subagents (14)
Build: `color-designer` · `type-designer` · `theme-specialist` · `responsive-engineer` · `integration-engineer` ·
`feedback-designer` · `motion-designer` · `3d-artist`. Quality: `wiring-checker` · `qa-tester` · `ux-reviewer` ·
`perf-optimizer` · `bug-fixer` · `design-critic`. Each runs in its own context; they can't ask you questions, so
they hand them back to the main conversation and every approval stays with you.

### Repository layout
```
skills/<name>/SKILL.md        the 10 skills (+ references/, assets/, scripts/ inside each)
agents/*.md                   the 14 subagents (Claude Code format; converted per IDE by the installer)
bin/vibeweave.mjs             cross-IDE installer (npx vibeweave)
hooks/                        Claude Code Stop hook: time & token report
adapters/AGENTS.snippet.md    always-on rules for agents without skill support
mcp/README.md                 optional MCP servers per IDE
examples/prompts.md           prompts for every skill
tools/                        validate, sync shared files, build the system map, sync versions
```

## Requirements
- **Node.js 18+** (`node -v`) — for the installer and the tools.
- **An AI coding agent** — Claude Code, Cursor, GitHub Copilot, OpenAI Codex, Gemini CLI, Antigravity, Kiro, Cline,
  Junie, OpenCode, or any agent that reads Agent Skills or rule files.
- **Optional: Playwright** in the project you test, for the browser tools:
  `npm i -D playwright && npx playwright install chromium`.
- Internet only for icons, fonts, component registries and research; everything else runs locally.

## Install
### Option 1 — from npm (recommended)
Open a terminal **in your project folder**:
```bash
npx vibeweave                              # detect the IDEs this project uses and install for each
npx vibeweave --agent cursor,copilot       # or choose IDEs (names from --list) · --agent all for every one
npx vibeweave --global                     # once, user-wide, for every project
```
It always installs the universal `.agents/skills` folder (read by Cursor, Copilot, Codex, Gemini, Antigravity,
Devin, Junie, OpenCode, Zed…) plus each detected IDE's native files. If no IDE is detected, it installs for Claude Code.

| Option | Effect |
|---|---|
| `--agent <list>` / `--agent all` | install for specific IDEs / every supported IDE |
| `--global` | user-wide install (home folder) |
| `--project <dir>` | install into another folder |
| `--skills a,b` | install a subset of skills |
| `--link` | symlink (junction on Windows) instead of copying — updating the source updates every project |
| `--no-agents` · `--no-rules` · `--no-usage` | skip subagents · rule files · the Claude Code usage hook |
| `--force` | replace same-named files that Vibeweave didn't create |
| `--dry-run` | show what would be written, change nothing |
| `--list` | every supported IDE and where its files go |
| `--uninstall` | remove everything Vibeweave installed (your own content is kept) |
| `usage [dir]` | print time and tokens of the last Claude Code run in a folder |
| `doctor [--network]` | check this machine and project: Node, where Vibeweave is installed (and if it is current), Playwright, a launchable browser, axe-core, hook policy, network |
| `stats [dir]` | local time and token statistics per run — typical, 90th percentile, outliers; estimate the next build |
| `feedback` | where to send feedback about Vibeweave: website form, GitHub forms, email |
| `check <url> [--pages /a,/b] [--device desktop]` | one-command scorecard of a running site: wiring, SEO, QA desktop + mobile, responsive 320 → 2560, Core Web Vitals (mobile profile by default; `--device desktop` = fast desktop, no throttling, labelled in the scorecard) → `.design-review/SCORECARD.md` |

### Option 2 — from GitHub
Clone once, anywhere, then install into each project **from that project's folder**:
```bash
git clone https://github.com/santanu2402/vibeweave.git ~/vibeweave
cd path/to/your-app
node ~/vibeweave/bin/vibeweave.mjs --link           # same options as npx vibeweave
```
Or use the wrappers from your project folder: `bash ~/vibeweave/install.sh` (macOS, Linux, Git Bash) or
`powershell -File ~\vibeweave\install.ps1` (Windows). With `--link`, a `git pull` in the clone updates every project.

## Check the install
1. **Files:** your project has `.agents/skills/vibeweave/SKILL.md` (or `.claude/skills/vibeweave/SKILL.md`).
2. **Agent:** restart the IDE or open a new chat. In Claude Code, type `/` and look for `vibeweave`; `/agents` lists the subagents.
3. **Tools:** `node .agents/skills/frontend-forge/scripts/contrast.mjs "#111827" "#ffffff"` → about 17.7:1, AA and AAA pass.
4. **Preview without changes:** `npx vibeweave --dry-run` or `npx vibeweave --list`.

## How to use it
Start with what you want; the explicit trigger is the `vibeweave` skill:
```text
/vibeweave build a website for my bakery
```
Already have a brief? Point to it, attach it, or paste it — it reads the whole file and asks only what it leaves open:
```text
/vibeweave build this from docs/brief.md
```
(Codex: `$vibeweave …` · or just describe the task — skills trigger from their descriptions.)

1. **Answer the questions.** Each round has up to four questions with a recommended option. Reply `1a 2b 3a 4c`,
   type your own answer, or say `defaults`.
2. **Approve three documents** — `REQUIREMENTS.md`, `PLAN.md`, `TASKS.md` — one at a time. Read them; say "approve"
   or what to change. **"No" at any point** makes it stop, ask what's wrong, answer you and revise.
3. **Watch it build and verify.** It checks in at milestones with screenshots or a running URL.
4. **Read the handover** — the evidence table, what's unverified, and next steps. The documents stay as contracts
   for the next session or the next agent.
5. **Give feedback, then ship it.** Say "ship it" to get a cleaned, production-ready GitHub repo, or say what to change — "the font is hard to read", "make mobile faster",
   "add a pricing page". Each answer starts a feedback round that fixes, enhances, optimizes and re-verifies, using
   `MEMORY.md` and `BUILDLOG.md` so nothing is re-asked or repeated.

More prompts:
```text
Check that every page is wired and give me a QA report.
Walk the signup flow like a new user and tell me where people get stuck.
Our mobile LCP is 4.8s — fix it without changing the design.
Connect the booking form to the API and test it against a mock with every error state.
Add a scroll-scrubbed product reveal with realistic lighting.
Give me three distinct visual directions for a fintech onboarding flow before you build anything.
```
Every skill has examples in [examples/prompts.md](examples/prompts.md).

## Supported IDEs
| IDE / agent | What gets installed |
|---|---|
| **Claude Code** | `.claude/skills` · 14 subagents in `.claude/agents` · `/vibeweave` · time & token report after each run |
| **Cursor** | `.agents/skills` · `.cursor/rules/vibeweave.mdc` · `.cursor/agents/` |
| **GitHub Copilot (VS Code)** | `.agents/skills` · `.github/instructions/` · `/vibeweave` prompt · `.github/agents/*.agent.md` |
| **OpenAI Codex** | `.agents/skills` (`$vibeweave`) · `AGENTS.md` block · `.codex/agents/*.toml` |
| **Gemini CLI** | `.agents/skills` · `GEMINI.md` block · `/vibeweave` command · `.gemini/agents/` |
| **Google Antigravity** | `.agents/skills` · `.agents/rules/vibeweave.md` · `AGENTS.md` block |
| **Devin Desktop (Windsurf)** | `.agents/skills` · `.devin/rules/vibeweave.md` |
| **Kiro** | `.kiro/skills` · `.kiro/steering/vibeweave.md` · `.kiro/agents/` |
| **Cline** | `.cline/skills` · `.clinerules/vibeweave.md` |
| **JetBrains Junie / AI Assistant** | `.agents/skills` · `AGENTS.md` · `.junie/commands/` + agents · `.aiassistant/rules/` |
| **OpenCode** | `.agents/skills` · `/vibeweave` command · `.opencode/agents/` |
| **Zed, Continue, Amazon Q, Trae, Kilo, Roo, Goose, Qwen, Augment, Factory, Warp** | skills + rule files where supported |

For agents that read only an always-on instructions file, paste [adapters/AGENTS.snippet.md](adapters/AGENTS.snippet.md).

## Verify any site in one command
```bash
npx vibeweave check http://localhost:3000 --pages /pricing,/docs
```
Runs the wiring crawler, the SEO and share-preview check, QA (desktop and mobile), the responsive sweep and Core Web
Vitals one after another at full fidelity, then writes `.design-review/SCORECARD.md` and `scorecard.json`. **PASS**
only when every check passes and LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms on the mobile profile; a run stopped by its time
budget is **INCOMPLETE**, never PASS. Exit code 0 = PASS, 1 = FAIL or CONCERNS, 124 = INCOMPLETE — so it works as a CI
gate (`--github` adds annotations). Something not working? `npx vibeweave doctor` tells you what is missing and how to fix it.

## Tools
Zero-dependency Node.js scripts inside the skills; the browser ones use Playwright from your project. Run them from
the installed skills folder, e.g. `node .agents/skills/ui-test/scripts/wiring.mjs http://localhost:3000`.
Each script documents its options in its first lines (`--help` prints them). Browser tools also take `--max-time <seconds>`
(the default scales with the work, e.g. 60 s per responsive width or 30 s per wiring page): a run that hits it closes its
browser, writes its report marked `"verdict": "INCOMPLETE"`, prints what was not verified and exits 124 — never a pass.
Run `npm test` to self-test every tool against the fixtures in `tests/` (see [CONTRIBUTING.md](CONTRIBUTING.md#testing)).

| Tool | What it does |
|---|---|
| `wiring.mjs` | crawls every page: broken links, missing anchors, **buttons that do nothing**, dead-end & orphan pages, forms, 404 |
| `qa.mjs` | axe-core, keyboard walk, reduced motion, content hidden without JS → PASS / CONCERNS / FAIL |
| `responsive.mjs` | 13 widths 320 → 2560: overflow root cause, overlapping/clipped/tiny text, small targets, blurry images |
| `vitals.mjs` · `bundle.mjs` | LCP element, CLS sources, TBT, slow-frame scripts, layout forced before first paint, uncompressed files, page weight · build weight and heaviest libraries |
| `probe.mjs` | explains layout bugs: stacking contexts, sticky/fixed traps, covered buttons, overflow root, font fallbacks |
| `screenshot.mjs` · `audit.mjs` | screenshots at several widths + a health report · static a11y / performance / generic-AI scan as file:line |
| `mock-api.mjs` · `endpoints.mjs` | local mock backend (REST, 422 field errors, latency, forced states, OpenAPI) · API inventory → contract + mocks |
| `novelty.mjs` | originality engine: direction seeds, fingerprint check against presets and your history, project record |
| `preset.mjs` | 25 AA-verified reference themes → CSS / Tailwind v4 / shadcn / DTCG / DESIGN.md |
| `palette.mjs` · `contrast.mjs` | OKLCH 11-step scales · WCAG 2.x + APCA contrast |
| `fonts.mjs` · `icons.mjs` · `fetch-ui.mjs` | ~2,100 open-source fonts → setup code · 260+ icon sets → components · 500+ component registries with license records |
| `extract-tokens.mjs` | measurable design DNA of a rendered page: colors by role, fonts, spacing, radii, shadows |
| `seo.mjs` | titles, descriptions, canonical, Open Graph image (fetched and measured), JSON-LD, robots.txt, sitemap |
| `ship.mjs` | "ship it": production-readiness and secret scan · clean GitHub-ready copy · git/GitHub CLI check and install (with your yes) · publish |

**Originality engine.** `novelty.mjs ideas "<brief>"` seeds directions; `novelty.mjs check <tokens.css>` compares
fonts, accent, background temperature and radius against the presets and your history (≥ 0.60 = too close);
`novelty.mjs record` adds the finished project to `~/.vibeweave/history.jsonl`.

**Time & token report (Claude Code).** After every reply:
`Vibeweave · run 46s · input 77k (new 29k, cached 49k) · output 2.4k · 2 calls`, plus session totals, logged to
`.vibeweave/usage.jsonl`. Nothing leaves your machine.

## Configuration
| Setting | Effect |
|---|---|
| `VIBEWEAVE_USAGE=quiet` / `off` | log the usage report without a chat message / disable it |
| `VIBEWEAVE_HISTORY=<path>` | where the originality history is stored (default `~/.vibeweave/history.jsonl`) |
| `CLAUDE_CONFIG_DIR` | where `npx vibeweave usage` looks for Claude Code transcripts (default `~/.claude`) |
| Optional MCP servers | shadcn, Playwright, Chrome DevTools, Figma, 21st.dev, Magic UI, Inspo — see [mcp/README.md](mcp/README.md) |

Files Vibeweave creates in your project: `REQUIREMENTS.md`, `PLAN.md`, `TASKS.md`, `DESIGN.md`, `API-CONTRACT.md`,
`MEMORY.md` (what we know — preferences, decisions, lessons), `BUILDLOG.md` (what happened — one entry per session or
round), `.design-review/` (ledger, reports, screenshots) and `.vibeweave/usage.jsonl`. Commit `MEMORY.md` and
`BUILDLOG.md` so every teammate and every agent shares the same memory. Cross-project preferences live in
`~/.vibeweave/MEMORY.md`.

## Update & uninstall
```bash
npx vibeweave@latest              # update: re-run the latest installer
npx vibeweave --uninstall         # remove from this project (add --global for a user-wide install)
```
From a clone: `git pull` (linked installs update immediately; copies need the installer re-run).

## Troubleshooting
| Problem | Fix |
|---|---|
| The agent doesn't see the skills | Restart the IDE or open a new chat; check `npx vibeweave --list`; install for your IDE explicitly with `--agent <name>`. |
| "Playwright is not installed" | `npm i -D playwright && npx playwright install chromium` in the project you're testing. |
| No time-and-token line in Claude Code | Your organization may block project hooks (`allowManagedHooksOnly`) — run `npx vibeweave usage`. Check `VIBEWEAVE_USAGE` isn't `off`. |
| `--link` fails | Some network or synced drives refuse links — install without `--link`. |
| Headless run (`claude -p`) ends before the subagents report | Print mode stops background subagents after 10 minutes. Run with `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0` so it waits for the whole crew. |
| PowerShell blocks `install.ps1` | `powershell -ExecutionPolicy Bypass -File install.ps1`, or use `npx vibeweave`. |
| Too many questions | Answer `defaults`, give more detail up front, or ask for "one combined approval" on small jobs. |

## Security
No dependencies, no telemetry, HTTPS-only network access with size limits, downloaded code confined to its output
folder and never executed, a localhost-only mock API, and prompt-injection rules for agents. Releases are published
with npm provenance. Details and private vulnerability reporting: [SECURITY.md](SECURITY.md).

## FAQ
**Will every site look the same?** No — presets and blueprints are references to design *away* from, and the
originality engine blocks designs too close to a preset or to your previous projects.
**Does it copy other sites' code?** No — it fetches only from sources that publish code for reuse (with a license
record) and ships its own original patterns; for anything else it studies the style and writes original code.
**Do I need Claude?** No — any agent that reads Agent Skills or rule files works; Claude Code adds native subagents
and the usage report. **Which frameworks?** React, Next.js, Vue, Nuxt, Svelte, Astro, Angular or plain HTML/CSS — it
follows your repo's conventions. **Is it free?** Yes, MIT.

## Roadmap
Next, from our competitor review: visual-regression baselines across the 13 widths · a PR comment bot with the
evidence table · an edit-time design hook · design import from Figma frames and DESIGN.md specs · i18n, RTL and
text-expansion stress tests · opt-in preview deploys (never automatic) · published before/after evals · design-token
drift detection · a localhost annotate overlay that feeds feedback rounds. Ideas and pull requests are welcome.

## Development
```bash
node tools/sync-shared.mjs        # copy shared scripts into every skill that uses them
node tools/build-system-map.mjs   # regenerate the self-knowledge map after adding or removing anything
npm run validate                  # skills, subagents, scripts, capability coverage (nothing unused), presets, map
npm test                          # self-test every tool against planted-bug fixtures (browser tests need Playwright)
npm version patch                 # bump the version, commit and tag
```
See [CONTRIBUTING.md](CONTRIBUTING.md). Releases: publishing a GitHub release runs
[`.github/workflows/publish.yml`](.github/workflows/publish.yml) (npm trusted publishing with provenance).

## Credits
Studied, not copied: [Agent Skills](https://agentskills.io/specification) · [anthropics/skills](https://github.com/anthropics/skills) ·
[obra/superpowers](https://github.com/obra/superpowers) · [github/spec-kit](https://github.com/github/spec-kit) ·
[GSD](https://github.com/open-gsd/gsd-core) · [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) ·
[genjutsu](https://github.com/AThevon/genjutsu) · [impeccable](https://github.com/pbakaus/impeccable) ·
[taste-skill](https://github.com/Leonxlnx/taste-skill) · [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) ·
[vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) · [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) ·
[gsap-skills](https://github.com/greensock/gsap-skills) · [motion-design-skill](https://github.com/LottieFiles/motion-design-skill) ·
[Iconify](https://iconify.design) · [Fontsource](https://fontsource.org) · [Playwright](https://playwright.dev) · [axe-core](https://github.com/dequelabs/axe-core).

## Feedback
Tell us what went well, what went wrong and what to improve — every entry is read and shapes the next release.

| Where | How |
|---|---|
| Website | The [visitor book form](https://vibeweave-glance.netlify.app/feedback/): name, rating, how often you'll use it, your IDE, and what to keep or change. Emailed to the maker; nothing is published. |
| GitHub | [Feedback, bug and feature forms](https://github.com/santanu2402/vibeweave/issues/new/choose) with the same questions — public, so others can add to them. |
| npm | The package page's **Issues** link opens the same GitHub forms. In a terminal: `npx vibeweave feedback`. |
| Email | itsantanu24@gmail.com |

## Author & contact
**Santanu Mandal** — creator of Vibeweave
- GitHub: [@santanu2402](https://github.com/santanu2402)
- LinkedIn: [santanu-mandal](https://www.linkedin.com/in/santanu-mandal-346a41238/)
- Email: [itsantanu24@gmail.com](mailto:itsantanu24@gmail.com)

## License
[MIT](LICENSE) © 2026 Santanu Mandal
