# G. Feedback rounds — improve until the owner is happy

Runs after every handover (F), and whenever the owner returns later with "this looks off", "change X", "make it
faster", "I have an idea". Each round is a small, complete cycle: **capture → triage → plan → build → optimize →
verify → log → ask again.** `MEMORY.md` and `BUILDLOG.md` make every round cheaper than the last.

## 1. Ask for feedback (end of every handover)
Ask one short question, with `AskUserQuestion` when available (otherwise a numbered list):

```
How does it feel?
  a. Ship it — I'm happy                         → H. Ship it (references/ship-it.md): clean up, GitHub repo, summary
  b. Mostly good — a few changes                 → feedback round
  c. Something's wrong                           → feedback round (No rule first: "What feels wrong?")
  d. I have new ideas / features                 → feedback round (may need a requirements delta)
Then: what exactly should change? Which page or part? How important (must / nice to have)?
```
Silence is not "ship it". In a non-interactive run, write *"awaiting owner feedback"* in `BUILDLOG.md` and stop.

## 2. Capture — before doing anything else
1. Start a new `BUILDLOG.md` entry: `Round <n> · Feedback round`, with the feedback **quoted verbatim**.
2. Turn durable taste into `MEMORY.md` → *Owner preferences* right away, in plain words with the date
   ("the serif is hard to read" → "readable, professional type — no hairline serifs").
3. Preferences said with "always", "never" or "from now on" also go into `~/.vibeweave/MEMORY.md` (read at the
   start of every new project).

## 3. Triage
| # | Feedback (verbatim) | Type | Severity | Area | Owner (role) | Gate |
|---|---|---|---|---|---|---|
| F-1 | "font isn't readable" | change request | major | type, all pages | type-designer | none (direction kept) |

- **Types:** bug · change request · enhancement (new capability) · optimization (speed, weight, tokens) ·
  question · praise (record what to *keep*).
- **Gates:** bugs, optimizations and small changes need none. Anything that changes scope, direction, content or a
  user flow goes through the No rule: update `REQUIREMENTS.md` (change log), then show **one combined delta**
  (requirements + plan + tasks) and get one approval. Answer questions before acting on them.
- **Unclear feedback:** ask "What feels wrong or missing?" first, then offer 2–3 concrete options with a recommendation.

## 4. Plan the round (append to `TASKS.md` under "Round <n>")
One task per feedback item, each with a *done-when* check, plus these every round:
- **Regression guard** — re-run every check that passed last round (the *Measured* table of the previous
  `BUILDLOG.md` entry) and keep it green.
- **Optimization pass** — `perf-optimizer` measures (`vitals.mjs`, `bundle.mjs`) and fixes only measured misses.
- **Improvement pass** — `design-critic` re-scores and `ux-reviewer` walks the changed areas; take at most three
  improvements beyond the feedback, each tied to a finding. No gold-plating.
- **Originality re-check** — `novelty.mjs check` whenever fonts, colors or radius changed.

## 5. Build with the crew
- Brief each subagent with the feedback item, the relevant `MEMORY.md` lines (preferences + lessons learned) and
  the files — not whole documents.
- Check *Lessons learned* before choosing an approach; don't retry what already failed (grep older `BUILDLOG.md`
  entries: "did we try X?").
- Same loop caps as phase E: two test → fix rounds by default, four at most.

## 6. Verify and compare
- Every feedback item verified with fresh evidence (a command, a screenshot, a report section).
- A before → after table against the previous round's numbers. Anything worse is a regression to fix or explain.

## 7. Close the round
1. Finish the `BUILDLOG.md` entry: done, measured before → after, decisions, problems, cost (`npx vibeweave usage`), next.
2. Update `MEMORY.md`: decisions with their reasons, lessons learned, open items; prune what's no longer true.
3. Delta handover: per feedback item — what changed, evidence, and anything declined with the reason.
4. Ask for feedback again (step 1). Repeat until the owner says "ship it"; they can stop at any time.

## Memory discipline (why this saves tokens)
- Start every session with `MEMORY.md` (≤ 150 lines) and the latest `BUILDLOG.md` entry instead of re-reading the
  repo or re-asking settled questions.
- `MEMORY.md` = current truth (edit in place). `BUILDLOG.md` = history (append only). `LEDGER.md` = open findings
  during a quality loop. Don't duplicate between them — link instead.
- Never write secrets, tokens or private data into either file.
