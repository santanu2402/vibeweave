# Shimmer button
**What:** a sheen sweeps across the primary button on hover/focus. **Use for:** one hero CTA.
**Avoid when:** more than one button per view would shimmer — it stops meaning "primary".

**Accessibility:** the sheen runs once per hover/focus (no endless loop); text contrast must pass on the
base color *and* at the brightest point of the sheen; reduced motion removes it. **Performance:** animates
`background-position` on a single small element — cheap.

```css
.shimmer {
  --base: var(--color-accent, oklch(0.55 0.18 160));
  --sheen: color-mix(in oklch, var(--base), white 35%);
  color: var(--color-on-accent, white); border: 0; border-radius: var(--radius-md, 10px);
  padding: 0.75rem 1.25rem; font-weight: 600; cursor: pointer;
  background: linear-gradient(110deg, var(--base) 42%, var(--sheen) 50%, var(--base) 58%) var(--base);
  background-size: 250% 100%; background-position: 100% 0;
  transition: transform var(--dur-fast, 140ms) var(--ease-out, ease-out);
}
.shimmer:hover, .shimmer:focus-visible { animation: shimmer 1.1s var(--ease-out, ease-out) 1; }
.shimmer:active { transform: scale(0.97); }
.shimmer:focus-visible { outline: 2px solid var(--color-focus, currentColor); outline-offset: 3px; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -50% 0; } }
@media (prefers-reduced-motion: reduce) { .shimmer:hover, .shimmer:focus-visible { animation: none; } }
```
```tsx
export function ShimmerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`shimmer ${props.className ?? ""}`} />;
}
```
**Variations:** a continuous slow shimmer (every 6s) only for a "new" badge, never for body controls.
