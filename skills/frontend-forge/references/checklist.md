# Pre-Delivery Checklist

Run through before handing over. Fix, don't just note.

## Direction
- [ ] I can state the concept in one sentence, and the page visibly expresses it.
- [ ] There is one clear signature element; everything else supports it.
- [ ] Squint test: the reading order is obvious in 2 seconds on every viewport.
- [ ] Nothing from the AI-slop list is present by accident (see SKILL.md).
- [ ] I removed one unnecessary accessory.

## System
- [ ] All colors, fonts, spacing, radii, shadows, durations come from tokens.
- [ ] ≤ 2 font families, ≤ 3 weights in use; type scale is consistent.
- [ ] One radius personality, consistent nesting; shadows tinted and consistent.
- [ ] Accent used sparingly; one primary action per view.
- [ ] Dark mode (if present) is designed: elevation via lighter surfaces, no pure black/white.

## Content
- [ ] Real, specific copy — no lorem ipsum, "Feature 1", fake metrics or John Doe.
- [ ] Headlines concrete; button labels are verb + object.
- [ ] Images are real/purposeful, consistently art-directed, correctly cropped, with alt text.
- [ ] Empty, loading and error states are designed and written.

## Accessibility
- [ ] Text ≥ 4.5:1, large text/UI ≥ 3:1 (`scripts/contrast.mjs`).
- [ ] Full keyboard pass: visible focus everywhere, logical order, no traps, Esc closes overlays.
- [ ] Semantic landmarks, one h1, ordered headings, labeled inputs, named icon buttons.
- [ ] `prefers-reduced-motion` handled; no flashing; autoplay media muted with controls.
- [ ] Targets ≥ 24px (44px on touch-primary UI).

## Responsive
- [ ] No horizontal scroll at 320/375px; layouts verified at 375 / 768 / 1280 / 1920.
- [ ] `dvh` instead of `100vh` for full-height sections; no hover-only functionality.
- [ ] Type and spacing scale fluidly; images use `srcset`/`sizes` or framework components.

## Performance
- [ ] LCP element (hero image/text) prioritized and not blocked by animation/JS.
- [ ] Media has dimensions/aspect-ratio (no CLS); below-fold media lazy-loaded.
- [ ] Fonts self-hosted/subset, `font-display: swap`; heavy libs (3D, Lottie) lazy-loaded.
- [ ] Animations use transform/opacity only.

## Code
- [ ] `node scripts/audit.mjs <src>` reviewed; real issues fixed.
- [ ] No console errors or failed requests (`scripts/screenshot.mjs` report).
- [ ] Components follow the project's existing conventions and file structure.
- [ ] Every link goes somewhere; every button does something.
- [ ] Title, meta description, OG tags, favicon, `lang` set — verify with `ui-test`'s `seo.mjs <url>`
      if installed (it fetches and measures the share image and checks the sitemap).
