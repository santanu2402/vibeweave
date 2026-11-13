---
name: ux-audit
description: Evaluate usability: walk the key user tasks step by step and apply usability heuristics, IA and navigation, forms, microcopy, trust, mobile ergonomics and dark-pattern checks, with a scored report and fixes. Use for UX, usability, user flows, friction, conversion, onboarding, navigation or "is this easy to use" questions.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UX Audit — can people actually get things done?

`ui-audit` asks "is it well designed?". This skill asks "can the intended people complete their
tasks quickly, confidently and without mistakes — and do they want to come back?". Judge against
the goals and audiences in `REQUIREMENTS.md` (or derive them and say so).

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Modes
- **Review** (default): findings and fixes, no edits.
- **Fix**: apply fixes in priority order (copy, flows, states, layout), then re-walk the tasks.
- **Flow review**: one named flow (signup, checkout, booking) in depth.

## Workflow

### 1. Frame
- Who are the primary users, on what device, in what situation? What are their **top 3–5 tasks**
  (from `REQUIREMENTS.md` acceptance criteria and flows, or the page's obvious jobs)?
- What does success look like for the business (sign-up, purchase, booking, retention)?

### 2. Make sure everything is connected
A flow can't be usable if it's broken. Run the wiring check first and fix (or log) what it finds:
```bash
node <skill-dir>/scripts/wiring.mjs http://localhost:3000 --routes src/app     # every page, link, anchor, button, form, 404
node <skill-dir>/scripts/screenshot.mjs http://localhost:3000 --widths 375,1440 # see what users see
```
`wiring.mjs` crawls every internal page and reports broken links, missing anchors, placeholder
links, buttons that do nothing, dead-end and orphan pages, forms without a submit path and 404
handling. (Playwright needed in the project — ask before installing; a browser MCP works too.)

### 3. Walk each task like a first-time user
In a real browser (375px first, then desktop), do each top task end to end and write a step log:

| Step | User intent | What they see / do | Friction | Severity |
|---|---|---|---|---|
| 1 | "Find a class this weekend" | Lands on home; CTA "Book" above fold | none | — |
| 2 | pick a date | date picker opens; past dates selectable | error-prone | major |

Count steps, decisions, fields and context switches; note every moment of hesitation ("what does
this mean?", "did it work?", "where am I?"). Do it again with only the keyboard, and once with
slow network (loading states) and with an error (wrong input, offline, empty data).

### 4. Heuristic pass
Score each area in [references/heuristics.md](references/heuristics.md) 1–5 with evidence: the 10
usability heuristics, then IA & navigation, forms, content & microcopy, trust, onboarding & empty
states, mobile ergonomics, performance-as-UX, accessibility-as-usability, and the dark-pattern check.

### 5. Prioritize and report
Severity (Nielsen's scale): **4 catastrophe** (blocks the task) · **3 major** (frequent, costly) ·
**2 minor** · **1 cosmetic**. Rank by severity × frequency × reach of the affected flow.

```markdown
## UX Audit — <product / flow>
**Overall: <score>/70** · <one-sentence verdict> · Tasks completed: 4/5 (checkout failed at step 3)

### Task walkthroughs
| Task | Steps | Result | Biggest friction |
|---|---|---|---|

### Scores
| Area | Score | Evidence |
|---|---|---|

### Findings
1. **[4 · catastrophe] UX-001** Checkout, payment step (`Checkout.tsx:88`) — card errors clear the
   whole form. **Why it hurts:** users re-type 12 fields, many abandon. **Fix:** keep values, mark
   only the invalid field, say how to fix it ("Card number is 15 digits; you entered 14").
2. …

### Quick wins (≤ 15 min) · ### What's working · ### If you do one thing
```
Use IDs `UX-###`; cite location (route + element or file:line) and evidence (screenshot path,
step log, wiring.json line). Tie each finding to a user consequence, not a rule number.

### 6. Fix mode
Fix in order: broken wiring → task blockers → error prevention/recovery → copy and labels →
states (loading/empty/error/success) → layout and hierarchy. Re-walk the affected tasks and
report before → after (steps, errors, completion).

## Tone
Speak for the user. "Users can't tell whether the booking went through" beats "violates
visibility of system status". Every problem comes with a fix; praise what works.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/wiring.mjs <url> [--routes <dir>] [--max-pages 40] [--external] [--no-click]` | crawl every page: broken links, missing anchors, placeholder links, dead buttons, dead-end/orphan pages, forms, 404, page basics |
| `scripts/screenshot.mjs <url> [--widths 375,768,1440]` | screenshots + overflow / console / tap-target report |
