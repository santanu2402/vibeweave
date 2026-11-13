# UI Audit Rubric

Ten dimensions, scored 1–5. Total /50. Calibrate honestly: 3 is "competent, unremarkable",
5 is "a top studio would ship this". Each score needs one sentence of evidence.

| Score | Meaning |
|---|---|
| 1 | broken or absent |
| 2 | present but weak, inconsistent or erroneous |
| 3 | competent, generic, no errors that block use |
| 4 | strong, intentional, consistent, minor polish left |
| 5 | exceptional and distinctive |

## 1. Hierarchy & layout
- One clear focal point per viewport; reading order obvious in 2 seconds (squint test).
- Grid alignment; intentional asymmetry; section rhythm varies purposefully.
- Proximity groups related items; whitespace used as structure.
- **Red flags**: everything same size/weight; centered-everything; uniform section padding; competing CTAs.

## 2. Typography
- Deliberate typeface choice suited to the brand; ≤ 2 families, ≤ 3 weights.
- Consistent modular scale; display tracking tightened; body 16px+ with 1.5–1.7 leading.
- Line length for body and docs text: `max-width ≈ 62–65ch` (≈ 60–75 characters); lines past ~90 characters are a finding.
- `text-wrap: balance` on headings, tabular numbers in data, real quotes/dashes.
- **Red flags**: default font on a brand page with no reason; too many sizes; thin weights at small sizes;
  orphans in headlines; justified text with rivers.

## 3. Color & contrast
- Role-based palette; accent used sparingly and consistently for action/emphasis.
- Text ≥ 4.5:1, large/UI ≥ 3:1 (measure, don't eyeball); not color-only signals.
- Dark mode (if any) designed with tinted surfaces and elevation.
- **Red flags**: purple-blue default gradient; grey-on-grey; multiple competing accents; pure black/white
  on large areas; status colors used decoratively.

## 4. Spacing & consistency (system)
- Values come from a spacing/radius/shadow scale; components share the same tokens.
- Consistent radii and nesting; consistent icon sizes and stroke.
- **Red flags**: arbitrary values (13px, 27px), hard-coded hex in components, mixed radii, mixed icon sets.

## 5. Components & states
- Hover, focus-visible, active, disabled, loading for every control; empty/loading/error/partial for data.
- Forms: visible labels, inline errors with fixes, correct input types/autocomplete.
- Overlays: focus trap, Esc, return focus; toasts announced.
- **Red flags**: placeholder-as-label; spinner-only loading for content; error = red border only.

## 6. Accessibility
- Semantic landmarks, one h1, ordered headings, labeled controls, alt text.
- Full keyboard operation, visible focus not obscured, skip link, targets ≥ 24px.
- Reduced motion honored; zoom/reflow OK; no keyboard traps.
- **Red flags**: `<div onClick>`, `outline: none` without replacement, icon buttons without names,
  `maximum-scale=1`.

## 7. Responsiveness
- Works 320 → 2560px with no horizontal scroll; layouts re-compose (not just shrink).
- Touch-friendly targets, no hover-only features, `dvh` for full-height sections, readable tables.
- The primary action is visible in the first screen on a 375px phone, without scrolling.
- **Red flags**: fixed pixel widths, desktop nav squeezed onto mobile, tiny tap targets, text overflow.

## 8. Motion & interaction
- Each animation has a job; durations/easing consistent; transform/opacity only.
- Feedback within 100ms; no gratuitous fade-up on every section; reduced-motion variant exists.
- Auto-moving content (marquee, carousel, ambient loop > 5s) pauses on hover/focus and has a visible pause control (WCAG 2.2.2).
- **Red flags**: `transition: all`, scroll-jacking, content hidden until JS animates it, janky parallax.

## 9. Performance
- LCP element prioritized and visible fast; no CLS from media/fonts; images sized, modern formats, lazy below fold.
- Heavy libraries lazy-loaded; font files minimal; no console errors or failed requests.
- **Red flags**: 3MB hero image, render-blocking fonts, 3D/Lottie on the critical path, layout shift on load.

## 10. Content & distinctiveness
- Specific, benefit-led copy in a consistent voice; verbs on buttons; no filler.
- Real imagery and data; no lorem ipsum, fake metrics or John Doe.
- Placeholders or unfinished content (`{{…}}` tokens, "TBD", "coming soon" dead links) are a trust failure: cap this dimension at 2.
- **Distinctiveness**: if you removed the logo, could this be any company's site? Count AI-slop tells
  (see frontend-forge SKILL.md list): 0–1 → fine, 2–3 → generic, 4+ → templated.
- **Red flags**: "Unlock the power of…", sparkle icons, 3 identical feature cards, testimonial carousel of strangers.

## Fast tests
- **Squint test** — blur your eyes: is there one focal point and a clear path?
- **Logo test** — hide the logo: is it still identifiably *this* brand?
- **Keyboard test** — Tab through the whole page: always know where you are? Can you do everything?
- **375 test** — at 375px wide: nothing overflows, nothing is tiny, the primary action is reachable.
- **Grey test** — view in greyscale: does hierarchy survive without color?
- **Content test** — read only the headings: does the page tell its story?
