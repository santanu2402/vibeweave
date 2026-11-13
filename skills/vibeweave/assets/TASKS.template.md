# TASKS.md — <Product name>

> **Mode:** fast | detailed — asked right after approval (see crew.md §5)

> The ordered work list for `PLAN.md` (v<n>, approved <date>). Approved by the user before work
> starts; ticked with evidence as work happens. **Status:** DRAFT | APPROVED <date> · **Version:** 1
>
> Status keys: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked · `[-]` dropped (with reason)

## M1 — Design system & foundation
- [ ] **T-01** Set up tokens (color, type, space, radius, depth, motion) in `<file>` and write `DESIGN.md`
  - owner: frontend-forge · depends: — · touches: `src/styles/`, `DESIGN.md`
  - done when: contrast.mjs passes for every text/background pair; DESIGN.md filled
- [ ] **T-02** Fetch icons (`icons.mjs get … --format react`) and logo/favicon set
  - owner: frontend-forge · depends: T-01 · done when: `ICONS.md` lists every icon with a license
- [ ] **T-03** Layout shell: header/nav, footer, skip link, 404
  - owner: frontend-forge · depends: T-01 · done when: keyboard walk clean (qa.mjs), no overflow at 320px

## M2 — Pages & features
- [ ] **T-04** Hero — <signature element>
  - owner: frontend-forge · depends: T-03 · done when: screenshot at 375/1440 reviewed; LCP element visible without JS
- [ ] **T-05** <section / feature F-1>
  - done when: AC-1 passes

## M3 — Motion
- [ ] **T-10** Motion storyboard implemented (moments 1–n) with reduced-motion fallbacks
  - owner: motion-forge · done when: qa.mjs motion check clean; no LCP regression

## M4 — Quality loop
- [ ] **T-20** QA pass → `.design-review/QA-REPORT.md` (owner: ui-test / qa-tester)
- [ ] **T-21** Performance pass on production build → `.design-review/PERF-REPORT.md` (owner: ui-optimize / perf-optimizer)
- [ ] **T-22** Fix blockers/majors from T-20/T-21 (owner: ui-debug / bug-fixer) — re-test affected scope
- [ ] **T-23** Design review → `.design-review/AUDIT.md` ≥ 40/50 (owner: ui-audit / design-critic); fix P0/P1
- [ ] **T-24** Final smoke test + handover evidence table

## Change log
- v1 <date> — approved
