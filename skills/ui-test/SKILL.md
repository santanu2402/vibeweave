---
name: ui-test
description: QA a running web UI against its acceptance criteria: check every page is wired (links, anchors, buttons, forms, 404), accessibility (axe, keyboard), responsive layouts, dark mode, reduced motion, no-JS, console errors and visual baselines; write a PASS / CONCERNS / FAIL report and Playwright tests. Use to test, QA or verify UI, check links and buttons, or before shipping.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UI Test — the QA tester

Test the product against what was *promised* (the brief's acceptance criteria and `DESIGN.md`),
not against what the code happens to do. Be the user who taps the wrong thing, tabs through
everything, rotates the phone, turns off animations and loses JavaScript on a train.

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

**Your boundary:** you write and run tests and report findings. You do not change product code to
make something pass — hand failures to the bug fixer (`ui-debug`) with evidence. Test files are yours.

## Workflow

### 1. Plan
- Read `REQUIREMENTS.md` (acceptance criteria, primary action, audience devices) and `DESIGN.md`.
  No brief? Derive 5–10 criteria from the page's obvious jobs and say they're derived.
- List the **critical paths** (primary action end to end, navigation, forms, overlays) and the
  **matrix**: viewports 375 / 768 / 1440 (+ 320 for overflow), light/dark if supported,
  reduced motion, JS off for content pages, chromium (+ webkit/firefox when it matters).
- Need a running URL. Start the dev server yourself if you can (and stop it afterwards), or ask.

### 2. Fast automated sweep (minutes)
Run these first; they find most mechanical failures:
```bash
node <skill-dir>/scripts/wiring.mjs http://localhost:3000 --routes src/app   # every page, link, anchor, button, form, 404
node <skill-dir>/scripts/responsive.mjs http://localhost:3000 --screens       # 13 widths: overflow, overlaps, tiny text/targets
node <skill-dir>/scripts/audit.mjs src                     # static a11y / motion / placeholder / slop scan, file:line
node <skill-dir>/scripts/qa.mjs http://localhost:3000       # axe + keyboard + motion (pause control) + no-JS + line length
node <skill-dir>/scripts/qa.mjs http://localhost:3000 --mobile
node <skill-dir>/scripts/qa.mjs http://localhost:3000 --dark   # sites with a dark theme: contrast/axe in both themes
node <skill-dir>/scripts/seo.mjs http://localhost:3000 --pages /pricing,/docs   # titles, canonical, OG image, JSON-LD, sitemap
node <skill-dir>/scripts/screenshot.mjs http://localhost:3000 --widths 320,375,768,1440
node <skill-dir>/scripts/screenshot.mjs http://localhost:3000 --dark --reduced-motion
```
- **Whole-site pass:** `npx vibeweave check <url> --pages /a,/b` runs wiring, seo, qa (desktop + mobile),
  responsive and vitals one after another at full fidelity → `.design-review/SCORECARD.md` (PASS only within budgets).
- Sites with a dark theme: run `qa.mjs` twice (default and `--dark`; the dark run writes `qa-dark.json`).
- `seo.mjs` (no browser — reads what crawlers and link unfurlers see): run it before launch and on every
  new page; it fetches and measures the share image (≥ 1200×630) and checks the page is in the sitemap.
- `wiring.mjs` answers "is every page wired?" — it crawls from the start URL (plus `sitemap.xml` and the
  routes folder), clicks every non-destructive button to find ones that do nothing, and never submits forms.
- `qa.mjs` uses axe-core when the project has it (`npm i -D axe-core`), otherwise built-in basics.
  It writes `.design-review/qa.json` and prints a verdict.
- `screenshot.mjs` reports overflow, console errors, failed requests, broken images, missing alt,
  tap targets < 24px and h1 count, and saves PNGs. **Open the PNGs and look** — overlapping text,
  clipped buttons and awkward wrapping don't show up in any metric.
- All browser scripts need Playwright resolvable from the project (`npm i -D playwright &&
  npx playwright install chromium` — ask before installing; an installed Chrome/Edge also works).
  A Playwright or Chrome DevTools MCP can replace them.

### 3. Exploratory pass (judgment)
With the browser (MCP or Playwright) walk each critical path like a real user:
- Click every button and link in scope: does each do something sensible? Any dead ends, 404s,
  double submissions, missing loading states?
- Forms: empty submit, invalid formats, very long input, paste, autofill, error messages that
  say how to fix, focus moves to the first error, success state.
- Overlays: open/close with mouse, Esc and keyboard; focus trapped inside and returned after;
  background scroll locked; works at 375px.
- Content stress: long names, 0 / 1 / 1000 items, missing images, slow network (throttle).
- States from `DESIGN.md`/brief: hover, focus-visible, active, disabled, loading, empty, error.
- Motion: entrances don't hide content; nothing loops forever without a pause; reduced motion
  removes movement; no jank on a 4× CPU throttle.

### 4. Lock it in with durable tests
Write Playwright specs for the critical paths so regressions get caught after you're gone —
start from [assets/ui.spec.ts](assets/ui.spec.ts) and adapt. Prefer role-based locators
(`getByRole`, `getByLabel`), web-first assertions, `toMatchAriaSnapshot` for structure,
`toHaveScreenshot` for key views (generate baselines in the same OS as CI), `@axe-core/playwright`
for a11y. Recipes, Vitest browser mode, Storybook tests and Playwright Test Agents:
[references/test-recipes.md](references/test-recipes.md).

Ask before adding test dependencies; use the project's existing runner if it has one.

### 5. Report
Write `.design-review/QA-REPORT.md` (format below), and add findings to the ledger if one exists.

- **Verdict:** `FAIL` if any blocker or major finding or a failed acceptance criterion;
  `CONCERNS` if only minor/cosmetic; `PASS` if clean.
- A tool run that stopped on `--max-time` is INCOMPLETE = UNVERIFIED, never PASS — rerun with a larger
  `--max-time`. Speed options (`--fast`, high concurrency) are for iteration only; every ship gate is
  verified at full fidelity.
- **Findings:** ID (`FUNC-` `A11Y-` `RESP-` `VIS-` `MOT-` `CONT-` `SEO-`), severity
  (blocker / major / minor / cosmetic), where (route + element or file:line), what happened,
  what was expected, evidence (screenshot path, script line, steps). Group repeats into one
  systemic finding.
- **Not verified:** say what you couldn't test (Safari, real devices, screen readers) instead of
  implying full coverage. Automated scans catch roughly a third of accessibility issues.

```markdown
# QA Report — <scope> · round <n>
**Verdict: FAIL** · 2 blockers in checkout, keyboard users can't open the menu
| # | Acceptance criterion | Result | Evidence |
|---|---|---|---|
| 1 | Book a session on a 375px phone in ≤ 4 taps | ✅ | tests/booking.spec.ts |
| ID | Sev | Where | Problem → expected | Evidence |
|---|---|---|---|---|
| A11Y-001 | blocker | header `Nav.tsx:31` | menu button is a div, not focusable → `<button>` | qa.mjs keyboard; audit.mjs click-non-interactive |
## Not verified
- iOS Safari (no device) · VoiceOver
```
End with a status line: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`.

### 6. Re-test
After fixes, re-run the failing checks *and* a smoke pass of everything else (fixes break
neighbors). Update the report's round number and the findings' status.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/responsive.mjs <url> [--widths …] [--screens] [--strict]` | 13-width sweep (320 → 2560): overflow root cause, overlapping/clipped/small text, targets < 24/44px, upscaled images, sticky bars covering the screen, long lines |
| `scripts/wiring.mjs <url> [--routes <dir>] [--max-pages 40] [--external] [--no-click] [--strict]` | crawl every page: broken links, missing anchors, placeholder links, dead buttons (click-tested, destructive ones skipped), dead-end/orphan pages, forms without submit, 404, console errors, page basics |
| `scripts/seo.mjs <url> [--pages /a,/b] [--strict] [--json]` | SEO & share previews without a browser: title/description length, canonical, lang, viewport, single h1, favicon, Open Graph + Twitter tags, og:image fetched and measured, JSON-LD parses, robots.txt + sitemap list the page; verdict + `.design-review/seo.json` |
| `scripts/qa.mjs <url> [--mobile] [--dark] [--only axe,keyboard,motion,nojs] [--tabs 60] [--strict] [--json]` | rendered QA: axe-core (or built-in basics), keyboard walk (focus visibility, hidden focus, traps, skip link), reduced-motion leftovers, 5s+ loops without a pause control — and a pause control that doesn't stop them or never starts them again (clicked twice, focus left on it), content invisible without JS, scroll reveals that never fire (content still hidden after scrolling the whole page), body-text line length; verdict (INCOMPLETE if stopped by `--max-time`) + `.design-review/qa.json` |
| `scripts/screenshot.mjs <url> [--widths 375,768,1440] [--dark] [--reduced-motion]` | multi-width screenshots + overflow / console / request / image / tap-target report |
| `scripts/audit.mjs <dir> [--json] [--strict]` | static a11y / motion / token-drift / AI-slop scan with file:line; shipped placeholders, loops without pause, reduced-motion delays, 12-column grids that overflow phones |
