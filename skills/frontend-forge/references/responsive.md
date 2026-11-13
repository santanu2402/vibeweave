# Responsive Design — from 320px phones to 2560px monitors

Responsive means the layout **re-composes** for each context — not that it shrinks. Design mobile-first,
then let content (not device names) decide the breakpoints.

## Contents
1. Strategy & breakpoints
2. Fluid type and space
3. Layout tools: grid, flex, container queries
4. Navigation patterns
5. Media: images, video, art direction
6. Tables, forms and data on small screens
7. Touch, input modes and safe areas
8. Large screens
9. Zoom, reflow and text spacing (WCAG)
10. Testing (`responsive.mjs`)

## 1. Strategy & breakpoints
- Start at 360–390px; add a breakpoint **where the content breaks**, not at device widths. Typical results:
  ~40rem (640px), ~48rem (768px), ~64rem (1024px), ~80rem (1280px), ~96rem (1536px).
- Prefer **intrinsic** layouts that need few breakpoints: `grid-template-columns: repeat(auto-fit, minmax(min(18rem, 100%), 1fr))`.
- Use `rem`/`em` for breakpoints so they scale with user font size; `min-height: 100svh` / `100dvh`, never `100vh`.

## 2. Fluid type and space
```css
:root {
  --step-0: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);          /* body: never below 16px */
  --step-3: clamp(1.75rem, 1.3rem + 2vw, 2.75rem);             /* h2 */
  --step-5: clamp(2.5rem, 1.4rem + 5vw, 5.5rem);               /* display */
  --space-section: clamp(4rem, 2rem + 8vw, 10rem);
}
```
Always mix `rem` into `clamp()` (`1.4rem + 5vw`, not `5vw` alone) so text still scales when users zoom
(WCAG 1.4.4). Generate scales with Utopia (utopia.fyi). Limit line length to ~45–75ch (`max-inline-size: 65ch`).

## 3. Layout tools
- **Grid** for 2-D page structure (`grid-template-areas` that change per breakpoint), **flex** for 1-D groups.
- **Container queries** for components that live in different widths (cards in a sidebar vs main):
  `.card-host { container-type: inline-size; } @container (min-width: 32rem) { .card { grid-template-columns: 1fr 1fr; } }`
  — components adapt to their slot, so the same card works everywhere.
- `min-width: 0` on flex/grid children with long content; `minmax(0, 1fr)` instead of `1fr`; `overflow-wrap: anywhere` on user text.
- Avoid fixed widths and heights on containers; use `max-inline-size`, `aspect-ratio`, and padding.

## 4. Navigation patterns
| Context | Pattern |
|---|---|
| ≤ 5 top-level items, mobile | visible links in a scrollable row, or a bottom tab bar for apps |
| More items, mobile | disclosure menu ("Menu" button with `aria-expanded`), full-screen or sheet; primary CTA stays visible |
| Desktop | horizontal nav; mega-menus only when content truly needs it (and keyboard-operable) |
| Apps | sidebar ≥ 1024px → collapsible rail → bottom tabs or a menu on phones |
Keep the most important task reachable without opening the menu; never hover-only menus.

## 5. Media
- `<img srcset sizes>` (or the framework image component) so phones don't download desktop images:
  `sizes="(min-width: 64rem) 50vw, 100vw"`; always `width`/`height` or `aspect-ratio`.
- **Art direction** with `<picture>`: a tighter crop on mobile (`<source media="(max-width: 40rem)" srcset="hero-portrait.avif">`).
- Video: smaller encodes or a poster-only experience on mobile data; `object-fit: cover` with a focal point (`object-position`).
- SVG/icons scale freely; set `max-width: 100%` on embedded media and iframes (`aspect-ratio: 16/9` for embeds).

## 6. Tables, forms and data on small screens
- Tables: keep a real `<table>`; on narrow screens either horizontal scroll inside a labelled, focusable wrapper
  (`overflow-x: auto; tabindex="0"`) with a sticky first column, or switch to stacked "cards" with labels
  (`data-label` + `::before`) — only for simple tables.
- Charts: simplify (fewer ticks, direct labels), allow horizontal scroll, or show the key number instead.
- Forms: single column, full-width inputs, ≥ 16px input text (prevents iOS zoom), sticky submit on long forms,
  correct `inputmode`/`autocomplete` to bring up the right keyboard.

## 7. Touch, input modes and safe areas
- Targets ≥ 24×24 (WCAG 2.5.8 minimum), aim for 44×44 on touch with ≥ 8px between targets.
- Detect capabilities, not devices: `@media (hover: hover) and (pointer: fine)` for hover effects; never hide
  functionality behind hover.
- Notches and home indicators: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
  + `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` on fixed bars.
- On-screen keyboard: avoid fixed bottom elements over inputs; `interactive-widget=resizes-content` in the viewport meta
  makes `dvh` layouts resize with the keyboard (Chromium).
- Landscape phones (~360px tall): don't build layouts that need 600px of height; test them.

## 8. Large screens
Cap content width (`max-inline-size: 80rem`) and center it, but let backgrounds and imagery go full-bleed;
increase whitespace and type a step on very wide screens rather than stretching lines; use the space for
multi-column layouts or side panels in apps — not for 200-character lines.

## 9. Zoom, reflow and text spacing (WCAG)
- **1.4.10 Reflow:** content works at 320 CSS px wide (= 1280px at 400% zoom) without two-dimensional scrolling
  (except tables, maps, diagrams).
- **1.4.4 Resize text:** 200% text zoom without loss of content — no fixed-height text containers.
- **1.4.12 Text spacing:** layouts survive line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em.
- Never disable zoom (`user-scalable=no`, `maximum-scale=1`).

## 10. Testing
```bash
node <ui-test>/scripts/responsive.mjs http://localhost:3000 --screens      # 13 widths, 320 → 2560
node <ui-test>/scripts/screenshot.mjs http://localhost:3000 --widths 320,768,1440
```
`responsive.mjs` reports per width: horizontal overflow (with the root element), overlapping text, text cut off by
a box smaller than its content (it names the `overflow: hidden` box — fix that box's fixed height, flex-basis or
aspect ratio, not the neighbour), clipped text, text under 12px, targets under 24px (and under 44px on touch widths),
upscaled images, fixed bars covering the screen, and over-long lines. Then look at the screenshots: does each breakpoint *re-compose* well? Finish on real
devices (iOS Safari + an Android phone) for safe areas, the keyboard and scrolling feel.
