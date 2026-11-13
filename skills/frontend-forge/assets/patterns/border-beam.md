# Border beam
**What:** a short beam of light travels around a card's border. **Use for:** the one featured card (a
recommended plan, a new feature). **Avoid when:** several cards at once — it becomes noise.

**Accessibility:** decorative, and it never moves on its own for more than 5s (WCAG 2.2.2): one lap on
load, then it rests; it circles again only while the card is hovered or has keyboard focus, and stops
when the user leaves. Reduced motion shows a static accent border instead. **Performance:** animates a
registered custom property (`@property`) driving a conic gradient — repaints the card's border box only;
all modern browsers support `@property`.

```css
@property --beam-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
.beam {
  --beam-lap: 4s;                                    /* keep ≤ 5s: it runs once without user action */
  border: 1px solid transparent; border-radius: var(--radius-lg, 16px);
  background:
    linear-gradient(var(--color-surface, #fff), var(--color-surface, #fff)) padding-box,
    conic-gradient(from var(--beam-angle), transparent 72%, var(--color-accent, oklch(0.65 0.17 250)) 86%, transparent 94%) border-box,
    linear-gradient(var(--color-border, #ddd), var(--color-border, #ddd)) border-box;
  animation: beam var(--beam-lap) linear 1 both;
}
.beam:is(:hover, :focus-within) { animation-iteration-count: infinite; }   /* user-started, stops on leave */
@keyframes beam { to { --beam-angle: 360deg; } }
@media (prefers-reduced-motion: reduce) {
  .beam { animation: none; background:
    linear-gradient(var(--color-surface, #fff), var(--color-surface, #fff)) padding-box,
    linear-gradient(var(--color-accent, #36c), var(--color-accent, #36c)) border-box; }
}
```
```tsx
export function BeamCard({ children }: { children: React.ReactNode }) {
  return <div className="beam p-6">{children}</div>;
}
```
**Variations:** `2px` border for dark UIs; two beams with `conic-gradient(... 40%, accent 50%, transparent 60%, ... 90%, accent 100%)`.
An endless beam (`infinite` with no user trigger) needs a visible Pause control like the marquee's.
