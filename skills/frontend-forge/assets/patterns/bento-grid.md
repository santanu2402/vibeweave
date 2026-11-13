# Bento grid
**What:** tiles of different sizes, each holding one idea. **Use for:** feature overviews, launches,
"about me", dashboards' summary rows. **Avoid when:** items are truly parallel and equal (use a list or table).

**Accessibility:** DOM order = reading order (don't reorder visually with `order` or dense packing for
meaningful content); each tile has a heading; works at 200% zoom. **Performance:** static layout; put live
demos in only one or two tiles.

```css
.bento { display: grid; gap: var(--space-3, 12px); grid-template-columns: repeat(6, minmax(0, 1fr)); grid-auto-rows: minmax(10rem, auto); }
.bento > * { container-type: inline-size; border-radius: var(--radius-lg, 20px); padding: var(--space-6, 24px);
  background: var(--color-surface); border: 1px solid var(--color-border); overflow: hidden; }
.bento .hero { grid-column: span 4; grid-row: span 2; }
.bento .wide { grid-column: span 4; }
.bento .tall { grid-column: span 2; grid-row: span 2; }
.bento .small { grid-column: span 2; }
@media (max-width: 64rem) { .bento { grid-template-columns: repeat(4, minmax(0, 1fr)); } .bento .hero, .bento .wide { grid-column: span 4; } }
@media (max-width: 40rem) { .bento { grid-template-columns: minmax(0, 1fr); } .bento > * { grid-column: auto !important; grid-row: auto !important; } }
/* tile content adapts to the tile, not the viewport */
@container (min-width: 28rem) { .tile__body { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } }
```
```tsx
// Tailwind v4 equivalent
<section className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6 auto-rows-[minmax(10rem,auto)]">
  <article className="@container rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 md:col-span-4 lg:row-span-2">…</article>
  <article className="@container rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 md:col-span-2 lg:row-span-2">…</article>
  <article className="@container rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 md:col-span-2">…</article>
</section>
```
**Rule:** tile size encodes importance; put real product UI, a chart or a short demo in tiles — not just
icon + title + sentence (that's a card grid wearing a bento costume).
