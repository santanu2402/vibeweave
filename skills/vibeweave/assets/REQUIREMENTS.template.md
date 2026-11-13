# REQUIREMENTS.md — <Product name>

> What we're building, as understood from the clarification rounds. Approved by the user before
> planning starts. Change it only when the user changes their mind — and log the change at the bottom.
> **Status:** DRAFT | APPROVED <date> · **Version:** 1
> **Source brief:** chat | <path(s) of the brief file(s), read <date>>

## 1. Goal
- **What it is:** <one sentence>
- **Primary action:** <the one thing a visitor/user must be able to do>
- **Secondary actions:** <…>
- **Success metrics:** <measurable: sign-ups/week, booking completion, time-to-task…>

## 2. Audience & contexts
| Segment | Who | Device & context | Needs / fears |
|---|---|---|---|
| Primary | <…> | <phone on the go · desktop at work> | <…> |
| Secondary | <…> | <…> | <…> |

## 3. Scope
- **In scope (this delivery):** <pages / screens / features>
- **Out of scope:** <explicitly excluded>
- **Later / deferred ideas:** <parked for a future pass>

## 4. Pages & screens
| Route | Purpose | Sections / regions (in order) | States needed |
|---|---|---|---|
| `/` | <…> | hero · … · footer | default · loading · empty · error |

## 5. Features & user flows
### F-1 <feature name>
- **Flow:** 1. <step> → 2. <step> → 3. <outcome>
- **Rules:** <validation, limits, edge cases>
- **States:** <empty · loading · success · error · partial>

### F-2 <…>

## 6. Content inventory
| Item | Source | Status |
|---|---|---|
| Headlines & copy | user · write it · existing site | final · draft · SAMPLE |
| Images / video | <…> | |
| Data (products, prices, stats) | <…> | |
| Testimonials / client logos | <…> | real only |
| Legal (privacy, terms, cookies) | <…> | |

**Facts never to invent:** prices, metrics, customer names, testimonials, certifications, partner
logos, legal text, <project-specific items>.

## 7. Brand & direction
- **Brand assets:** <logo, colors, fonts, voice> · **Words / patterns to avoid:** <…>
- **Feeling:** <2–3 adjectives> · **References:** <URL — what to borrow from it>
- **Chosen direction:** <card name — concept sentence, style family, signature element>
- **Dials:** variance <n> · motion <n> · density <n>
- **Theme:** <light + dark toggle (follows the system) · light only · dark only · mixed light/dark sections>
- **Motion & animation:** <none · subtle · rich · cinematic> — moving parts: <page-load entrance · scroll reveals ·
  signature motion graphic (what) · particles/light · 3D · page transitions · Lottie/Rive · animated icons>;
  Pause control for loops > 5 s; reduced motion shows final states
- **Imagery & type:** <illustration · photography · 3D renders · type-led> · type feel <warm serif · clean sans · editorial · technical>

## 8. Functional requirements
- FR-1 <the system shall …>
- FR-2 <…>

## 9. Non-functional requirements
- **Accessibility:** WCAG 2.2 AA <or stricter>; keyboard-complete; reduced motion honored
- **Performance budget:** LCP ≤ 2.5s · CLS ≤ 0.1 · TBT ≤ 200ms (mobile) · first-load JS ≤ <n> KB gzip
- **Responsive:** 320–2560px; primary devices <…>
- **Browsers:** <…> · **Languages / RTL:** <…> · **SEO:** <metadata, OG, sitemap, structured data>
- **Security & privacy:** <no secrets client-side, consent, PII handling>

## 10. Technical constraints & integrations
- **Stack:** <framework, styling, component library> · **Hosting:** <…>
- **Integrations:** <CMS, auth, payments, forms backend, analytics, maps…>
- **Must not change:** <existing routes, APIs, data, brand elements>

## 11. Acceptance criteria (testable)
| # | Criterion | How we'll verify |
|---|---|---|
| AC-1 | A visitor on a 375px phone can <…> in ≤ <n> taps | Playwright spec |
| AC-2 | Keyboard-only users can complete the primary action | qa.mjs + manual |
| AC-3 | <…> | |

## 12. Assumptions
| Assumption | Why | Status |
|---|---|---|
| <…> | <inferred from …> | confirmed · UNVALIDATED |

## 13. Open questions
- <question> — <owner> — <blocking? y/n>

## 14. Clarifications log
- Round 1 · Q: <question> → A: <answer>
- Round 2 · Q: … → A: …

## 15. Change log
- v1 <date> — approved
- v2 <date> — <what changed and why, requested by>
