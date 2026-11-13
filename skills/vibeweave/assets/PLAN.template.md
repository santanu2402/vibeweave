# PLAN.md — <Product name>

> How we'll build what `REQUIREMENTS.md` (v<n>, approved <date>) describes. Approved by the user
> before tasks are written. **Status:** DRAFT | APPROVED <date> · **Version:** 1

## 1. Approach in one paragraph
<What we'll build, in what order, and the one idea that makes it distinctive.>

## 2. Direction & design system outline
- **Concept:** <one sentence> · **Style family:** <…> · **Signature element:** <…>
- **Dials:** variance <n> · motion <n> · density <n>
- **Palette direction:** <roles + hue ideas; final tokens go in DESIGN.md>
- **Type direction:** <display / body families, scale ratio>
- **Shape & depth:** <radius personality, elevation approach>
- **References & what we borrow:** <ref — trait>; **what we avoid:** <…>

## 3. Information architecture & wireframes
```
/ (home)
┌──────────────────────────────┐
│ nav: logo · links · CTA      │
├──────────────────────────────┤
│ HERO: <thesis>               │
│ …                            │
└──────────────────────────────┘
```
<One ASCII sketch + one-line purpose per section / screen.>

## 4. Technical architecture
- **Stack:** <framework + version, styling, component library> — <why>
- **Routes / pages:** <list>
- **Component inventory:** <new components, reused components, registry components to adapt>
- **State & data:** <local state, server data, forms, CMS/API contracts>
- **Libraries to add:** | Library | Why | Weight / license |
- **Assets:** imagery source · icon family (`icons.mjs`) · logo/favicon set · 3D models / Lottie / Rive files

## 5. Motion storyboard (summary)
| # | Moment | Job | Trigger | Tool | Reduced-motion fallback |
|---|---|---|---|---|---|

## 6. Quality strategy
- **Test matrix:** viewports 320/375/768/1440 · light/dark · reduced motion · no-JS · browsers <…>
- **Automated:** audit.mjs · qa.mjs · screenshot.mjs · Playwright specs for AC-1…AC-n
- **Performance budget & how measured:** vitals.mjs (mobile profile) + bundle.mjs on the production build
- **Gates to ship:** <copied from the skill, adjusted to the requirements>

## 7. Milestones
| # | Milestone | What the user will see | Check-in |
|---|---|---|---|
| M1 | Design system + hero | screenshot of hero at 375/1440 | yes |
| M2 | All sections built | running URL | yes |
| M3 | Motion + quality loop | QA + perf reports | yes |
| M4 | Handover | evidence table | yes |

## 8. Risks & mitigations
| Risk | Impact | Mitigation |
|---|---|---|

## 9. Decisions needed from the user
- <decision> — options — recommendation

## 10. Change log
- v1 <date> — approved
