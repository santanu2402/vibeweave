# UX Heuristics & Checklists

Fourteen areas, each scored 1–5 (total /70): **1** broken · **2** weak · **3** works with friction ·
**4** smooth · **5** delightful and effortless. One sentence of evidence per score.

## Contents
1–10. The usability heuristics (Nielsen) — 11. IA & navigation — 12. Forms & input —
13. Content, trust & onboarding — 14. Mobile, performance & inclusive use — Dark-pattern check — Fast tests

## 1. Visibility of system status
- Every action gets feedback within ~100ms (pressed state, spinner, optimistic update).
- Long operations show progress; success is confirmed in place ("Booked — Sat 10:00, check your email").
- Users always know where they are: active nav item, page title, breadcrumbs or step indicator.
- **Red flags:** silent submits; spinners with no end; "Saved?" uncertainty; toasts that vanish before they're read.

## 2. Match between the system and the real world
- Words, icons and order match the user's mental model and domain, not the database.
- Dates, currency, units and names in the user's locale; real-world sequences (choose → review → pay).
- **Red flags:** internal jargon ("SKU", "entity"), codes instead of names, unexplained abbreviations.

## 3. User control and freedom
- Undo for destructive actions (or a confirmation with a specific consequence); easy cancel/back.
- Esc closes overlays; browser Back works (state in the URL for filters, tabs, steps).
- **Red flags:** modal traps, wizards without Back, irreversible actions behind one tap.

## 4. Consistency and standards
- Same thing, same name, same place, same look across pages; platform conventions (logo → home, underlined links, ⌘K search).
- **Red flags:** two styles of primary button; "Sign in" here, "Log in" there; settings in three places.

## 5. Error prevention
- Constraints over warnings: disable impossible options, sensible defaults, input masks, inline validation on blur.
- Confirm only high-cost actions, naming the object ("Delete 'Spring class'? 12 bookings will be cancelled.").
- **Red flags:** past dates selectable; free text where a choice fits; destructive and primary buttons side by side, same style.

## 6. Recognition rather than recall
- Options visible; recently used items; previews; labels that stay visible (no placeholder-only labels).
- **Red flags:** users must remember codes or info from a previous screen; icon-only navigation without labels.

## 7. Flexibility and efficiency of use
- Shortcuts for frequent users (keyboard, bulk actions, saved filters) that don't burden newcomers.
- Sensible defaults and autofill (`autocomplete` attributes); remember preferences.
- **Red flags:** 6 clicks for a daily task; no search on large collections.

## 8. Aesthetic and minimalist design
- Each screen has one primary action and a clear hierarchy; nothing competes with the task.
- Progressive disclosure for advanced options. (Visual craft is ui-audit's job; here: does clutter slow the task?)
- **Red flags:** three equal CTAs; promo banners interrupting a checkout; walls of text before the action.

## 9. Help users recognize, diagnose and recover from errors
- Errors in plain language, next to the field, saying what happened and how to fix it; input kept.
- Empty, offline and server-error states with a next step; 404 with a way home and search.
- **Red flags:** "Error 500", "Invalid input", red borders only, form reset after an error.

## 10. Help and documentation
- Contextual help where decisions are hard (tooltips, examples, "What's this?"); FAQ for pre-purchase doubts.
- **Red flags:** help only in a separate docs site; tooltips that hide essential info on touch devices.

## 11. Information architecture & navigation
- Top tasks reachable from the home page in ≤ 2 interactions; nav labels are nouns users would search for.
- Every page has a way onward and a way home (`wiring.mjs` dead-end/orphan checks); no orphan pages.
- Search when content > ~30 items; filters and sort for collections; breadcrumbs for deep hierarchies.
- Mobile nav exposes the top tasks without digging; footer covers secondary links (contact, legal).
- **Red flags:** clever labels ("Explore", "Solutions") hiding what's inside; 9+ top-level items; mega-menus on mobile.

## 12. Forms & input
- Ask only what's needed now; group related fields; single column; logical order; optional fields marked.
- Visible labels; correct `type`/`inputmode`/`autocomplete`; ≥ 16px input text on mobile (no zoom).
- Inline validation after the field is left, not while typing; error summary + focus on first error on submit.
- Primary button says what happens ("Book session"), disabled states explained, double-submit prevented.
- Long forms: steps with progress, save-as-you-go, review step before commit.
- **Red flags:** password rules revealed only after failure; CAPTCHA before value; "Submit"; mandatory account creation before purchase.

## 13. Content, trust & onboarding
- **Content:** headlines say what it is and who it's for; benefits before features; scannable (front-loaded
  sentences, meaningful subheads, lists); consistent voice; specific numbers instead of adjectives;
  body and docs text at `max-width ≈ 62–65ch` (≈ 60–75 characters; past ~90, reading slows and lines get lost).
- **Microcopy:** buttons = verb + object; empty states explain value and the first action; confirmations
  are specific; no blame ("We couldn't…", not "You failed…").
- **Trust:** real contact info, pricing clarity (total cost before the last step), security cues at payment,
  real testimonials/logos only (never invented), privacy explained where data is asked, recent dates.
  Placeholders or unfinished content (`{{…}}` tokens, lorem ipsum, "TBD", "coming soon" dead links) are a trust failure — severity ≥ 3.
- **Onboarding:** time-to-first-value is short; sample data or templates; teach in context, not with
  a 7-step tour; let users skip and come back.
- **Red flags:** "Unlock the power of…", hidden fees, fake urgency, stock-photo testimonials, sign-up wall before seeing anything.

## 14. Mobile, performance & inclusive use
- Thumb reach: primary actions in the lower-middle area on phones; targets ≥ 44px with spacing.
- The primary action is visible in the first screen on a 375px phone — users shouldn't scroll to find it.
- Auto-moving content (carousels, marquees, tickers) can be paused — on hover/focus and with a visible button (WCAG 2.2.2).
- No hover-only information; sticky CTAs don't cover content; keyboard type matches the field.
- Performance as UX: content visible fast (LCP), no layout jumps while reading or tapping (CLS), taps respond
  instantly (INP) — see ui-optimize.
- Inclusive: works with keyboard and screen reader for every task (ui-test), readable at 200% zoom, clear
  language (aim for ~grade 8 reading level for consumer products), reduced motion respected, no time limits
  without extension.
- **Red flags:** tiny close buttons on modals, carousels as the only way to see products, cookie banners blocking the task.

## Dark-pattern check (any hit is a finding, severity ≥ 3)
Confirmshaming ("No thanks, I hate saving money") · pre-ticked consent or upsells · hidden costs
revealed at the last step · roach motel (easy to subscribe, hard to cancel) · fake scarcity/urgency
timers · disguised ads · forced continuity without reminder · nagging permission prompts ·
trick wording on opt-outs · privacy-zuckering defaults. These also carry legal risk (consumer-
protection and privacy law in many regions) — say so.

## Fast tests
- **5-second test** — show the home page for 5s: can someone say what it is, who it's for, and what to do?
- **Task-count test** — count taps/fields for each top task; challenge anything over the competitor's.
- **Error test** — submit every form empty, wrong and twice; go offline mid-flow.
- **Back-button test** — at every step, does Back do what users expect without losing input?
- **Thumb test** — on a phone, one-handed, can you complete the primary task?
- **Stranger test** — read only headings and buttons: does the page tell its story and make the next step obvious?
