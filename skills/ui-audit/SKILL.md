---
name: ui-audit
description: Score and critique the visual design of an existing UI (/50 across hierarchy, typography, color, spacing, components, accessibility, responsiveness, motion, performance, distinctiveness) with prioritized file:line fixes, or apply them. Use for "review / critique / roast / polish my UI", "why does this look amateur" or "make it less generic".
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UI Audit

Review like the most demanding — and most useful — design lead the user has worked with:
specific, prioritized, evidence-based, and always with the fix. Vague taste comments ("feels
off", "make it pop") are worthless; "the H2s and body share weight 400 and differ by only 2px,
so sections have no entry point — set H2 to 600 at 1.75rem" is useful.

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Modes

- **Review** (default when the user asks for feedback/critique): report findings, don't edit.
- **Fix / polish** (when the user asks to fix, polish, improve, refine): report briefly, then apply
  fixes in priority order, then re-verify.
- If unclear and the change set would be large, review first and offer to apply.

## Workflow

### 1. Scope and context
Identify what's being reviewed (files, route, URL, screenshot) and the product context: audience,
purpose, brand. Read `DESIGN.md` / tokens if present — findings should respect the intended system,
and deviations *from* it are findings too.

### 2. Automated pass (fast, objective)
- `node <skill-dir>/scripts/audit.mjs <src-dir>` — static scan: missing alt, click handlers on divs,
  removed focus outlines, zoom blocking, `transition: all`, layout animations, missing reduced-motion
  handling, hard-coded colors (token drift), placeholder content and generic "AI-slop" tells, with
  `file:line`. These are leads: confirm each before reporting.
- `node <skill-dir>/scripts/contrast.mjs <fg> <bg> …` — verify text/background token pairs.
- If the UI can be rendered: `node <skill-dir>/scripts/screenshot.mjs <url>` — 375/768/1440 screenshots plus
  overflow, console errors, failed requests, broken images, missing alt, tap targets < 24px, h1 count.
  Needs Playwright in the project (ask before installing) — or use a browser/Playwright/Chrome DevTools MCP.
- Optionally fetch the latest Vercel Web Interface Guidelines
  (`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`) and check
  against them as an additional rule set.

### 3. Expert pass (judgment)
Look at the screenshots (or the provided image) and read the code. Score each dimension of the
rubric in [references/rubric.md](references/rubric.md) from 1–5 with one sentence of evidence.
Use the squint test, the "remove the logo — whose site is this?" test, the keyboard-only test and the
375px test.

### 4. Prioritize
Rank by **impact × effort**:
- **P0 – Broken**: inaccessible, unusable, visibly buggy (overflow, overlapping text, invisible focus,
  contrast failures on body text, console errors, dead buttons).
- **P1 – Weak**: undermines quality or conversion (no hierarchy, inconsistent spacing, generic hero,
  missing states, muddy palette, sloppy type).
- **P2 – Polish**: refinements that separate good from great (optical alignment, tracking, motion
  timing, microcopy, details).
Group repeated issues into one systemic finding ("12 hard-coded hex colors across 5 components →
introduce tokens") instead of listing each instance.

### 5. Report

Use this format:

```markdown
## UI Audit — <target>
**Overall: <score>/50** · <one-sentence verdict>

| Dimension | Score | Evidence |
|---|---|---|
| Hierarchy & layout | 3/5 | … |
| … (all 10 rubric dimensions) | | |

### P0 — Broken
1. `src/components/Hero.tsx:42` — <problem>. **Fix:** <specific change, with code if short>.

### P1 — Weak
…

### P2 — Polish
…

### Quick wins (≤ 15 min each)
- …

### If you do one thing
<the single highest-leverage change>
```

For screenshots without code, reference regions instead of lines ("hero, right column").
Include a short "What's working" list — knowing what to keep is as useful as knowing what to change.

### 6. Fix mode
Apply fixes P0 → P1 → P2, using the project's tokens and conventions (introduce tokens if missing).
Re-run the audit and screenshots afterwards and report before/after (scores, issues resolved, anything
deferred). If the root problem is the direction itself (score ≤ 25/50, generic and incoherent),
say so plainly and propose a redesign direction — with the `frontend-forge` skill if installed —
rather than polishing a weak foundation.

## Tone
Direct, specific and kind. Critique the work, not the person. Every problem comes with a fix.
Don't pad with praise, don't pile on trivia — ten precise findings beat forty vague ones.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/audit.mjs <dir> [--json] [--strict]` | static a11y / motion / token-drift / AI-slop scan with file:line |
| `scripts/contrast.mjs <fg> <bg> [...]` | WCAG ratio + AA/AAA + APCA Lc |
| `scripts/screenshot.mjs <url> [--widths …] [--dark] [--reduced-motion]` | multi-width screenshots + rendered-page health report |
