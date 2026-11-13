# Contributing

Thanks for helping Vibeweave design, build and test better. Good contributions make the skills **more specific, more
correct, or leaner** — not just longer.

## Ground rules
- **Follow the [Agent Skills spec](https://agentskills.io/specification)**: `name` matches the folder,
  lowercase-hyphenated; `description` ≤ 1024 chars and says *what* and *when*; `SKILL.md` body < 500 lines.
- **Progressive disclosure**: keep `SKILL.md` to workflow and judgment; put catalogs, recipes and API
  detail in `references/` (one level deep, with a contents list for files > 300 lines).
- **Explain why**, not just what. Agents generalize from reasons; they over-fit to rigid MUSTs.
- **Verify facts**: library APIs, install commands, browser support and URLs must be checked against
  official docs. Note the date when something is likely to change.
- **Palettes must pass AA** — check with `node skills/frontend-forge/scripts/contrast.mjs`.
- **Scripts stay zero-dependency** (Node ≥ 18 built-ins only; Playwright optional and resolved from the user's project).
- **Subagents** (`agents/*.md`) need `name` equal to the file name and a description that says when to
  delegate; preload skills with `skills:` (bare names) instead of duplicating their content.
- **Test scripts against a real page** — a fixture with planted bugs *and* a clean page (no false
  positives) — before opening a PR. Browser scripts must degrade with a clear message when
  Playwright is missing.
- **Original content only** — don't paste text from other skills or docs; link to them in the README credits.
- **Secure by default** — treat every input (CLI args, fetched JSON, file names, pages) as hostile: HTTPS only with
  timeouts and size caps, writes confined to the chosen folder, no shell strings (`execFile`/`spawn` with argument
  arrays), never execute downloaded code. Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).

## Shared files
Some helpers are used by several skills. Each skill must stay installable on its own, so they're
copied, not linked. Edit the canonical file (see the list), then run:
```bash
node tools/sync-shared.mjs
```
The list lives in `tools/shared-files.mjs`.

## Before you open a PR
```bash
node tools/sync-shared.mjs        # copy shared scripts into the skills that reuse them
node tools/build-system-map.mjs    # regenerate the self-knowledge map after adding/removing any skill, agent, script, reference or pattern
node tools/validate.mjs            # everything below, plus presets contrast and system-map freshness
```
It checks frontmatter, line counts, that every referenced file exists, that shared copies are in sync,
that scripts parse, and that presets pass WCAG AA. CI runs the same check.

## Testing
```bash
npm test                                   # = node tools/selftest.mjs — every tool, run as a child process
node tools/selftest.mjs --only wiring,qa   # one tool (or a group: offline | browser | network)
node tools/selftest.mjs --list             # what exists
```
The self-test serves `tests/fixtures/` on a random `127.0.0.1` port and checks exit codes and key output:
planted bugs in `buggy/` must be found, `clean/` must stay quiet, and wiring/responsive must give identical
findings at `--concurrency 1` and in parallel. Flags: `--jobs n` (default CPUs/2), `--verbose` (commands and
output of failing tests), `--network` (live Fontsource/Iconify/shadcn tests, skipped by default),
`--require-browser` (fail instead of skip when Playwright is missing), `--site <url>` (also compare sequential vs
concurrent findings on a running site), `--keep` (keep the temp folder). The JSON report goes to
`<OS temp>/vibeweave-selftest-report.json`.

Browser tests need Playwright (and `axe-core` for the full `qa` scan). Without them they are skipped with a
message. To use an install outside the repo, point `NODE_PATH` at it — nothing is added to `package.json`:
```bash
npm i --no-save playwright@1.65.0 axe-core@4.14.0 && npx playwright install chromium   # what CI does
NODE_PATH=/path/to/node_modules node tools/selftest.mjs --require-browser               # or reuse another install
```

**Adding a fixture:** keep it small, original and self-contained (inline CSS/JS, `<link rel="icon" href="data:,">`,
only generic font families so results don't depend on installed fonts). Put a planted bug in `buggy/` with a
`<!-- planted: … -->` comment, keep `clean/` free of findings for every tool, then add a `test("<tool>: …")` in
`tools/selftest.mjs` that asserts the finding (and its absence on `clean/`). Preview with
`node tools/selftest.mjs --serve`. `tests/` is not in the npm package (`files` in `package.json` is a whitelist).

## Ideas welcome
New style families with solid CSS recipes · stack notes for more frameworks · additional audit rules
(with low false-positive rates) · motion recipes · evaluation prompts that show before/after quality.
