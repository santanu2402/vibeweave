# BUILDLOG.md — <Project name>

> **What happened**, newest entry first. Append one entry per session, round or delivery — never rewrite old
> entries (add a correction entry instead). Read the latest entry at the start of a session to resume exactly
> where the last one stopped. Durable conclusions belong in `MEMORY.md`; open findings belong in
> `.design-review/LEDGER.md`.

---

## <YYYY-MM-DD HH:MM> · Round <n> · <Build | Quality loop | Feedback round | Fix | Maintenance>
**Trigger:** <first prompt / approved TASKS.md / owner feedback: "quote it verbatim">
**Goal of this round:** <one sentence>

| Done | Files | Evidence |
|---|---|---|
| <what changed> | <paths> | <command → result, screenshot, report> |

**Measured (before → after):**
| Metric | Before | After | Tool |
|---|---|---|---|
| LCP / CLS / TBT (mobile) | <…> | <…> | `vitals.mjs` |
| First-load JS (gzip) | <…> | <…> | `bundle.mjs` |
| QA verdict · axe violations | <…> | <…> | `qa.mjs` |
| Wiring | <…> | <…> | `wiring.mjs` |
| Audit /50 · UX /70 | <…> | <…> | design-critic · ux-reviewer |
| Originality (max similarity) | <…> | <…> | `novelty.mjs check` |

**Decisions:** <what was decided and why — also copied to MEMORY.md if it should outlive this round>
**Problems & fixes:** <what broke, root cause, fix>
**Not done / unverified:** <and why>
**Owner feedback received:** <verbatim, or "none yet">
**Cost:** <run time · input / output tokens from the usage report (`npx vibeweave usage`)>
**Next:** <the first thing the next session should do>
