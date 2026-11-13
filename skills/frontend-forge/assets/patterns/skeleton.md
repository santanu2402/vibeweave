# Skeleton loader
**What:** placeholders shaped like the content that's loading. **Use for:** lists, cards, profiles,
dashboards while data loads (pairs with ui-integrate's state matrix). **Avoid when:** loads under ~300ms
(show nothing, avoid flicker) or for actions (use a pending button state).

**Accessibility:** the container announces loading (`aria-busy="true"` + a visually hidden "Loading…" in a
live region); skeleton shapes are `aria-hidden`; shimmer stops under reduced motion. **Performance:**
`background-position` on small elements; match final dimensions so nothing shifts (CLS) when data arrives.

```css
.skeleton { --sk-base: var(--color-surface, #eee); --sk-hi: color-mix(in oklch, var(--sk-base), var(--color-text, #000) 6%);
  background: linear-gradient(90deg, var(--sk-base) 25%, var(--sk-hi) 37%, var(--sk-base) 63%) var(--sk-base);
  background-size: 400% 100%; border-radius: var(--radius-sm, 6px); animation: skeleton 1.4s ease infinite; }
.skeleton--text { height: 0.9em; margin-block: 0.35em; }
.skeleton--text:last-child { width: 60%; }
.skeleton--avatar { width: 40px; aspect-ratio: 1; border-radius: 50%; }
@keyframes skeleton { from { background-position: 100% 50%; } to { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```
```tsx
export function CardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-[var(--radius-lg)] border p-4">
      <div className="skeleton aspect-[16/9] w-full" />
      <div className="skeleton skeleton--text mt-3 w-3/4" />
      <div className="skeleton skeleton--text" />
    </div>
  );
}
export function CardList({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <section aria-busy={loading}>
      <p className="sr-only" aria-live="polite">{loading ? "Loading studios…" : ""}</p>
      {loading ? Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />) : children}
    </section>
  );
}
```
**Rule:** delay showing the skeleton ~200ms (and keep it ≥ 400ms once shown) to avoid flashes.
