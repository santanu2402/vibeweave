# Custom scrollbar
**What:** scrollbars that match the theme (thin, tinted, rounded), plus styled horizontal scrollers.
**Use for:** dark UIs, panels, code blocks, carousels. **Avoid when:** you'd hide scrollbars on main content —
users rely on them to see position and length.

**Accessibility:** keep scrollbars visible and ≥ 8px where users drag them; the thumb needs ≥ 3:1 contrast
against the track; never `scrollbar-width: none` on scrollable content without another visible affordance;
keyboard scrolling must still work (focusable scroll containers get `tabindex="0"` and a label).
**Performance:** none — native scrollbars stay native.

```css
/* Standard properties (Chrome/Edge 121+, Firefox; newer Safari) — use first. The @supports block below covers older Safari. */
:root { scrollbar-color: color-mix(in oklch, var(--color-text, #111) 35%, transparent) transparent; scrollbar-gutter: stable; }
.panel { overflow: auto; scrollbar-width: thin; }

/* WebKit fallback for older Safari — only applies where the standard properties aren't supported */
@supports not (scrollbar-color: auto) {
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: color-mix(in oklch, var(--color-text, #111) 35%, transparent);
    border-radius: 999px; border: 3px solid transparent; background-clip: content-box; }
  ::-webkit-scrollbar-thumb:hover { background-color: color-mix(in oklch, var(--color-text, #111) 55%, transparent); }
}

/* Horizontal scroller with snap + edge fades (cards, logos) */
.h-scroller { display: grid; grid-auto-flow: column; grid-auto-columns: min(80%, 20rem); gap: 1rem;
  overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scroll-padding-inline: 1rem;
  padding: 0 1rem 0.75rem; scrollbar-width: thin;
  mask-image: linear-gradient(90deg, transparent, #000 1rem, #000 calc(100% - 1rem), transparent); }
.h-scroller > * { scroll-snap-align: start; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
```
```html
<div class="h-scroller" tabindex="0" role="region" aria-label="Featured studios">…cards…</div>
```
**Variations:** `scrollbar-gutter: stable both-edges` to keep centered layouts from shifting; overlay-style
thin scrollbars only inside small panels, never for the page.
