---
name: ui-debug
description: Fix frontend bugs at the root cause: reproduce in a browser, diagnose console and hydration errors, overflow, z-index and stacking contexts, sticky/fixed traps, covered or dead buttons, font fallbacks, Tailwind/CSS and animation or state bugs, then apply the smallest verified fix. Use when UI is broken, overlapping, cut off, not clickable, not sticking, flickering or erroring.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UI Debug — the bug fixer

**No fix without a root cause.** Guess-and-patch fixes the symptom, breaks a neighbor and
teaches nothing. The fastest path is almost always: reproduce → observe → one hypothesis →
smallest change → verify.

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Workflow

### 1. Reproduce
- Get the exact conditions: route, viewport, browser, theme, data, steps, expected vs actual.
  A QA finding (`A11Y-003`…) should already carry them.
- See it yourself in a real browser (Playwright/Chrome DevTools MCP, or the scripts below). If you
  can't reproduce it, say so and gather more information — don't fix what you can't see.
- Capture evidence of the bug *before* fixing (screenshot, console line, probe output) so you can
  prove the fix.

### 2. Observe — let the browser tell you
```bash
node <skill-dir>/scripts/probe.mjs http://localhost:3000 --width 375            # page-wide diagnosis
node <skill-dir>/scripts/probe.mjs http://localhost:3000 --selector ".site-header"  # one element
node <skill-dir>/scripts/screenshot.mjs http://localhost:3000 --widths 375,1440    # look + health report
```
- **Page mode** lists console and page errors with source locations, hydration mismatches,
  failed requests, the *root* element behind horizontal overflow (and why: 100vw + offset, fixed
  width, `white-space`, unconstrained media…), sticky elements that can't stick (and the ancestor
  that breaks them), `position: fixed` trapped by a transformed ancestor, `z-index` with no
  effect, content wider than its flex/grid container, broken images, fonts that fell back.
- **Element mode** prints the box, key computed styles, *what is covering it* at its centre (the
  "button isn't clickable" bug), and the ancestor chain annotated with stacking contexts,
  overflow clipping and containing blocks — the three things behind most layering bugs.
- Both need Playwright resolvable from the project (ask before installing; an installed
  Chrome/Edge works) — or use a browser MCP's console, DOM and computed-style tools.
- Read the relevant code *after* you know where to look. Check recent changes (`git diff`,
  `git log -p -- <file>`) — new bugs usually live in new code.

### 3. Hypothesize — one at a time
State it: *"The header doesn't stick because `.layout` has `overflow-x: hidden`, which makes it
the scroll container."* Find the known pattern in [references/bug-catalog.md](references/bug-catalog.md)
— most frontend bugs are one of ~25 classics. Compare with a place where the same thing works.

### 4. Fix — the smallest change at the root
- Fix the cause, not the symptom: `overflow: clip` instead of removing `position: sticky`;
  a portal instead of `z-index: 99999`; `min-width: 0` instead of a magic `max-width`.
- Stay inside the design system: use the project's tokens and conventions; no `!important`
  unless you're overriding third-party CSS and you say so.
- One change per hypothesis. If it didn't fix it, revert it before trying the next one.

### 5. Verify — with the same check that found it
- Re-run the probe/screenshot/qa check or the failing test; compare against the "before" evidence.
- Check the neighbors: other viewports, dark mode, reduced motion, the component's other usages.
- Add a regression guard when cheap: a Playwright assertion, a unit test, an `audit.mjs`-clean diff.
- Then run the project's typecheck, lint and tests.

### 6. Escalate instead of thrashing
- Three failed fixes on the same bug → stop. Write down what you tried, what you learned, and
  question the approach (wrong component boundary? library limitation? design that can't work at
  this viewport?). Ask the user or the producer.
- Never "fix" by deleting the failing test, hiding the element from the scanner, or wrapping it in
  `try {} catch {}` that swallows the error.

## Report per bug
```markdown
### A11Y-003 — menu button not keyboard-focusable · fixed
- Repro: Tab from page top at 375px; focus skips the menu (qa.mjs keyboard walk)
- Root cause: `Nav.tsx:31` uses `<div onClick>`; divs aren't focusable or operable by keyboard
- Fix: `<button type="button" aria-expanded aria-controls="nav">` with the same styles (`Nav.tsx:31-38`)
- Verified: qa.mjs keyboard clean; tests/nav.spec.ts "menu opens with Enter" added and passing
```
Finish with a status line: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`, and update
the ledger if one exists.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/probe.mjs <url> [--selector "<css>"] [--width 1280] [--height 900] [--dark] [--json]` | page mode: errors, hydration, overflow root causes, sticky/fixed/z-index traps, flex/grid spill, broken images, font fallbacks · element mode: computed styles, covering element, annotated ancestor chain |
| `scripts/screenshot.mjs <url> [--widths 375,768,1440] [--dark] [--reduced-motion]` | screenshots + overflow / console / request / image / tap-target report |
