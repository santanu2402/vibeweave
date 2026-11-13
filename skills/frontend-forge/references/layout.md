# Layout & Composition

## Contents
1. Grid and containers
2. Spacing rhythm
3. Hero patterns (beyond "headline + 2 buttons")
4. Presenting features without the 3-card row
5. Social proof, pricing, CTA, footer
6. Bento recipe
7. Responsive strategy
8. Composition techniques

## 1. Grid and containers

- Content max width 1120–1280px for marketing, up to 1440px+ for media-rich layouts; text
  columns capped at ~65ch. Dashboards can go full width with a sidebar.
- 12 columns on desktop, 8 on tablet, 4 on mobile; gutters 16–32px.
- A modern full-bleed-capable container:
```css
.layout { display: grid; grid-template-columns:
  [full-start] minmax(1rem, 1fr) [content-start] min(72rem, 100% - 2rem) [content-end] minmax(1rem, 1fr) [full-end]; }
.layout > * { grid-column: content; } .layout > .bleed { grid-column: full; }
```
- **Asymmetry creates interest**: a 7/5 or 8/4 split beats 6/6. Offset a column start
  (`grid-column: 2 / span 6`) to create tension.

## 2. Spacing rhythm

- Use the token scale only (4 8 12 16 24 32 48 64 96 128).
- **Proximity = relationship**: space inside a group < space between groups < space between
  sections. E.g. label→input 8, field→field 20, group→group 40, section→section 96–160.
- Section padding: `padding-block: clamp(4rem, 3rem + 6vw, 10rem)`.
- Vary section density on purpose: a tight, information-rich section next to an airy statement
  section creates rhythm. Uniform padding everywhere flattens the page.

## 3. Hero patterns (beyond "headline + 2 buttons")

Pick the pattern that best expresses the concept sentence.

| Pattern | What it is | Good for |
|---|---|---|
| **Product-as-hero** | the real UI, interactive or looping, dominates the fold | SaaS, dev tools, apps |
| **Typographic statement** | one huge, well-set line; minimal else | agencies, manifestos, luxury |
| **Full-bleed media** | photo/video edge to edge, text on a calm area or scrim | travel, food, fashion, hardware |
| **Split asymmetric** | 7/5 text vs visual, visual breaks the container edge | most marketing |
| **Live demo / playground** | user types or toggles and sees the result instantly | APIs, AI, design tools |
| **Scroll story** | hero pins, then transforms as you scroll into the next chapter | launches, hardware |
| **Bento hero** | headline + a bento of 4–6 proof tiles | multi-feature products |
| **Editorial cover** | magazine-cover composition: masthead, cover line, image | publications, culture |
| **Collage / maximal** | layered cut-outs, stickers, marquee | music, events, youth brands |
| **Utility-first** | the tool itself (search box, converter, calculator) is the hero | utilities, marketplaces |

Hero checklist: the one-line value proposition is specific ("Invoices that chase themselves",
not "The future of finance") · one primary action · the visual proves the claim · fold leaves a
hint of what's next (cropped content invites scroll).

## 4. Presenting features without the 3-card row

- **Zig-zag with real visuals** — alternating text/visual rows, each visual a genuine screenshot,
  crop or animation of *that* feature.
- **Tabbed or stepped demo** — one large visual, tabs switch the feature shown.
- **Sticky scroll narrative** — text steps scroll on one side, a pinned visual updates on the other.
- **Annotated hero shot** — one big product image with callout lines/labels.
- **Bento** — see §6.
- **Comparison** — before/after slider, "old way vs new way" table.
- **Numbered workflow** — only when it really is a sequence.
- **Single feature per viewport** — for flagship features worth a full screen.
If you do use cards: vary sizes, include real content in each, and avoid the identical
icon-in-rounded-square header.

## 5. Social proof, pricing, CTA, footer

- **Logos**: real ones only, monochrome, evenly optically sized (not equal widths), ≤ 8.
- **Testimonials**: real names, roles, photos; a single strong quote large beats a carousel of
  ten. Carousels hide content — prefer a static grid or masonry.
- **Metrics**: only true, specific numbers with context ("Cut month-end close from 9 to 3 days").
- **Pricing**: highlight one plan via elevation/border, not a rainbow of colors; show annual/monthly
  toggle with honest savings; put the comparison table below the cards.
- **Final CTA**: restate the value prop in new words; one action; can break the visual pattern
  (full-bleed color block, big type).
- **Footer**: organized sitemap, legal, social, newsletter; it's a design surface — give it the
  same care (big wordmark, a final flourish).

## 6. Bento recipe

```css
.bento { display: grid; gap: clamp(.5rem, 1vw, 1rem);
  grid-template-columns: repeat(6, 1fr); grid-auto-rows: minmax(9rem, auto); grid-auto-flow: dense; }
.tile { border-radius: 1.25rem; padding: 1.25rem; background: var(--surface);
  border: 1px solid var(--border); overflow: hidden; position: relative; container-type: inline-size; }
.t-hero { grid-column: span 4; grid-row: span 2; } .t-tall { grid-column: span 2; grid-row: span 2; }
.t-wide { grid-column: span 3; } .t-sq { grid-column: span 2; }
@media (max-width: 900px) { .bento { grid-template-columns: repeat(2, 1fr); }
  .t-hero, .t-wide { grid-column: span 2; } .t-tall, .t-sq { grid-column: span 1; } }
@media (max-width: 520px) { .bento { grid-template-columns: 1fr; } .bento > * { grid-column: auto; grid-row: auto; } }
```
Rules: 5–9 tiles; size ∝ importance; each tile = one idea with a *visual* (micro-demo, chart,
type, product crop); consistent gap and radius; one tile may break style for emphasis.

## 7. Responsive strategy

- **Mobile-first CSS**; breakpoints where the *content* breaks (common: 640, 768, 1024, 1280, 1536).
- **Container queries** for components that live in different widths:
  `.card-wrap { container-type: inline-size } @container (min-width: 28rem) { .card { grid-template-columns: 1fr 1fr } }`
- **Fluid everything**: `clamp()` for type and spacing, `min()` for widths, `aspect-ratio` for media.
- Viewport units: `100dvh`/`min-h-dvh` for full-height sections (not `100vh`, which ignores
  mobile browser chrome).
- **Touch**: targets ≥ 44px recommended (≥ 24px minimum per WCAG 2.2), no hover-only affordances,
  `@media (hover: hover)` for hover effects.
- Reflow at 320px width without horizontal scroll (WCAG 1.4.10).
- Mobile nav: a real `<button aria-expanded>` toggling a menu, focus moved into it, Esc closes.
- Tables on mobile: horizontal scroll inside a labeled container, or card transformation.
- Test at 375, 768, 1024, 1440 and one ultra-wide (1920+). `scripts/screenshot.mjs` does this.

## 8. Composition techniques

- **Focal point**: every viewport has one dominant element. Squint test.
- **Scale contrast**: pair something very big with something very small.
- **Overlap and layering**: let images cross section boundaries, text overlap images (with
  contrast), elements break the container — controlled overlap signals craft.
- **Alignment**: everything aligns to something. Optical alignment beats mathematical for
  icons, quotes and punctuation (hanging punctuation, nudging play icons right).
- **Negative space** is an element: deliberate emptiness next to dense content makes both read.
- **Visual weight balance**: a large light element balances a small dark one.
- **Z-pattern / F-pattern**: marketing pages are scanned in Z; content and dashboards in F —
  put key information on those paths.
- **Repetition with variation**: a consistent system with one deliberate exception per page.
