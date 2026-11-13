# Crew — role cards, handoffs, findings and loop rules

## Contents
1. Role cards
2. Handoff protocol and status codes
3. Findings: IDs, severity, evidence
4. Report formats
5. The quality loop
6. Ledger template

## 1. Role cards

Each role reads `REQUIREMENTS.md` (and `DESIGN.md` once it exists) before acting, and writes only what
its card allows. Independence is the point: the tester and the critic must judge the product
against the brief, not against the builder's intentions.

### Producer (main thread)
- **Owns:** intake, `REQUIREMENTS.md`, plan, ledger, gates, waivers, the final answer to the user.
- **Must:** keep the user informed at phase boundaries; rule on every open finding at a loop
  cap (fix now / defer with reason / waive with user approval). Nothing is dropped silently.
- **Must not:** mark a gate passed without fresh evidence.

### Art director (`visual-dna`, `frontend-forge` 3–5)
- **In:** brief, scout notes, references. **Out:** `DESIGN.md`, tokens, ASCII wireframes.
- **Done when:** concept sentence, signature element, dials, tokens and every section's
  wireframe exist and trace back to the brief.

### Frontend engineer (`frontend-forge` 6)
- **In:** brief, `DESIGN.md`. **Out:** code in vertical slices, each with all states.
- **Done when:** build, typecheck and lint pass; `audit.mjs` has no errors; every acceptance
  criterion has an implementation.

### Color designer (`frontend-forge` color, subagent `color-designer`)
- **In:** brand, direction card. **Out:** OKLCH scales, role tokens light/dark, contrast table, DESIGN.md §2.
- **Done when:** every text/background and UI pair passes AA (`contrast.mjs`).

### Type designer (`frontend-forge` typography, subagent `type-designer`)
- **In:** direction card, languages. **Out:** families (with licenses), scale, loading code, DESIGN.md §3.
- **Done when:** ≤ 2 families, only used weights/subsets load, no font-swap layout shift.

### Motion designer (`motion-forge`, subagent `motion-designer`)
- **In:** `DESIGN.md` motion dial, the build. **Out:** motion storyboard + implementation, page transitions.
- **Done when:** each moment has a job, a reduced-motion path and no LCP delay.

### 3D artist (`motion-forge` 3D, subagent `3d-artist`)
- **In:** what the 3D must communicate, budget. **Out:** scene, compressed assets with licenses, fallbacks.
- **Done when:** poster is the LCP, canvas lazy-loads, pauses offscreen, reduced-motion and no-WebGL paths work.

### Wiring checker (`ui-test` `wiring.mjs`, subagent `wiring-checker`)
- **In:** running URL, routes folder. **Out:** `WIRING-REPORT.md`. **Read-only.**
- **Done when:** every page crawled, every issue mapped to `file:line`, manual-test list written.

### QA tester (`ui-test`, subagent `qa-tester`)
- **In:** brief (acceptance criteria), running URL, scope. **Out:** `QA-REPORT.md`, optional
  Playwright specs under `tests/`.
- **May edit:** test files only. **Must not:** change product code to make a test pass.
- **Done when:** every acceptance criterion is marked pass/fail with evidence and a verdict is set.

### Performance optimizer (`ui-optimize`, subagent `perf-optimizer`)
- **In:** budget from the brief, production build, URL. **Out:** `PERF-REPORT.md` with
  before → after, and the changes made.
- **Must:** measure before and after with the same profile; touch only what a measurement
  implicates; keep visuals identical unless the trade-off is approved.

### Bug fixer (`ui-debug`, subagent `bug-fixer`)
- **In:** finding IDs with evidence. **Out:** minimal fixes, root-cause notes per finding.
- **Must:** reproduce before fixing; one hypothesis at a time; verify with the same check that
  found the bug; stop after 3 failed attempts on one bug and escalate.

### UX reviewer (`ux-audit`, subagent `ux-reviewer`)
- **In:** top tasks and flows from the requirements, running URL. **Out:** `UX-REPORT.md` scored /70.
- **Read-only.** Walks each task (mouse, keyboard, 375px, slow network, errors); flags dark patterns.

### Design critic (`ui-audit`, subagent `design-critic`)
- **In:** brief, `DESIGN.md`, URL/screenshots. **Out:** `AUDIT.md` scored /50 with P0–P2 findings.
- **Read-only.** Judges distinctiveness and fit to the brief, not personal taste.

## 2. Handoff protocol and status codes

When you delegate (subagent or hat switch), the task message contains: goal, scope (routes,
components), paths to `REQUIREMENTS.md` / `DESIGN.md` / ledger, the dev-server URL, what's already
been ruled out, the **relevant `MEMORY.md` lines** (owner preferences and lessons learned that touch this task —
pasted, not the whole file), and the expected output file. Specialists end with one status line, plus any
lesson worth remembering (`LESSON: …`) for the producer to add to `MEMORY.md`:

| Status | Meaning | Producer action |
|---|---|---|
| `DONE` | finished, evidence attached | verify evidence, advance |
| `DONE_WITH_CONCERNS` | finished but something is shaky | read concerns, decide |
| `NEEDS_CONTEXT` | missing information | answer from brief/repo, or ask the user |
| `BLOCKED` | cannot proceed (env, access, design conflict) | unblock or escalate to the user |

## 3. Findings: IDs, severity, evidence

**ID prefixes:** `WIRE-` disconnected pages/links/buttons · `UX-` usability · `FUNC-` broken behavior · `A11Y-` accessibility · `RESP-` responsive/layout ·
`VIS-` visual/design-system drift · `MOT-` motion · `PERF-` performance · `CONT-` content/copy ·
`SEO-` metadata · `SEC-` unsafe patterns (e.g. secrets in client env). Number them per report:
`A11Y-003`.

| Severity | Definition | Maps to |
|---|---|---|
| blocker | unusable, inaccessible, data loss, crash, fails an acceptance criterion | P0 |
| major | clearly wrong or degrading: contrast failure, broken at a viewport, CLS > 0.25, missing state | P0/P1 |
| minor | noticeable polish or consistency issue | P1/P2 |
| cosmetic | taste-level refinement | P2 |

**Evidence** is mandatory: `file:line`, a screenshot path with the viewport, the exact script
output line, or reproduction steps. "Looks off" is not a finding.

## 4. Report formats

```markdown
# QA Report — <scope> · round <n> · <date>
**Verdict: PASS | CONCERNS | FAIL** · <one sentence>
URL: … · Viewports: 375 / 768 / 1440 · Browsers: chromium (+ webkit, firefox if run)

## 1. Acceptance criteria
| # | Criterion (from REQUIREMENTS.md) | Result | Evidence |
|---|---|---|---|

## 2. Findings
| ID | Sev | Where | Problem | Expected | Evidence |
|---|---|---|---|---|---|

## 3. Automated runs
qa.mjs: … · screenshot.mjs: … · audit.mjs: … · playwright: n passed / m failed

## 4. Not verified
- <what couldn't be tested and why>
```

PERF-REPORT: budget table (metric · budget · before · after · status), the changes made with
the measured effect of each, and remaining opportunities ranked by expected impact.

## 5. The quality loop

```
round = 1
loop:
  test → findings
  if no blocker/major and all criteria pass → exit loop (gates check)
  optimize (only if a perf gate fails)
  fix blockers/majors (bug fixer), minors if cheap
  re-test the affected scope + a smoke pass of the rest
  round += 1
  if round > 2 → summarize remaining findings, ask the user to continue (hard max 4)
  if open-finding count did not drop → stalled: stop, report, escalate
review (design critic) → fix P0/P1 → final smoke test → handover
```

Waivers: the user may waive a gate ("ship with the CLS at 0.12 for now"). Record it in the
ledger with reason, approver and a follow-up note. Never waive accessibility blockers on your own.

## 6. Ledger template (`.design-review/LEDGER.md`)

```markdown
# Ledger — <project>
## Phases
| Phase | Status | Notes |
|---|---|---|
| A Clarify | done | 3 rounds, 11 questions |
| B Requirements | approved <date> | REQUIREMENTS.md v1 |
| C Plan | approved <date> | PLAN.md v1 · 4 references, components: … |
| D Tasks | approved <date> | TASKS.md v1 · 24 tasks |
| E Execute | in progress | M2 of 4 |
| … | | |

## Scout notes
- Borrow: … (from …) · Avoid: …

## Findings
| ID | Sev | Owner | Status | Round | Evidence / fix |
|---|---|---|---|---|---|
| A11Y-001 | major | bug-fixer | fixed r1 | 1 | focus ring added `Button.tsx:18`; qa.mjs clean |

## Rounds
round 1: 9 open → 3 open · round 2: 3 → 0

## Waivers
- <gate> — <reason> — approved by <user> on <date>

## Change requests
- <date> — <what the user asked> → REQUIREMENTS v2, PLAN v2, tasks T-12..T-14 added — approved <date>
```

## 5. Modes: fast and detailed
Asked once, right after TASKS.md is approved. Both modes measure at **full fidelity** and share every ship gate —
fast cuts review breadth and repetition, never measurement accuracy; INCOMPLETE is never PASS in either.

| | Fast | Detailed |
|---|---|---|
| Verification | `npx vibeweave check <url> --pages …` (wiring, SEO, QA desktop + mobile, 13 widths, Core Web Vitals) + `audit.mjs --strict` + `novelty.mjs check` | the same, plus each specialist's own deep pass |
| Who fixes | the producer; a specialist subagent only for a failure the producer can't fix | specialists in parallel: qa-tester, wiring-checker, perf-optimizer, ux-reviewer, design-critic, bug-fixer |
| Rounds | one fix round, one re-check | two quality rounds (cap 4) |
| UX + design review | one combined pass by the producer against heuristics.md and the /50 rubric | ux-reviewer + design-critic, independent |
| Best for | a page, a small site, iteration, non-interactive runs, low-power machines | multi-page apps, launches, redesigns, anything with forms and data |

**Low-power machines** (`npx vibeweave doctor` shows ≤ 4 CPUs, or browser tools time out): in either mode run the
browser-heavy checks **one at a time** — never several subagents driving browsers at once — and close each browser
before the next. Parallel browsers on a weak machine slow everything down and make timings unreliable.
