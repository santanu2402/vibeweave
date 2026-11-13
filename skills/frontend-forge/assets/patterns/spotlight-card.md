# Spotlight card
**What:** a soft radial highlight follows the pointer across a card. **Use for:** feature grids, pricing,
dark premium UIs. **Avoid when:** touch-first screens (it simply doesn't show), dense data views.

**Accessibility:** purely decorative — the highlight also appears on `:focus-within` so keyboard users get
the same cue. **Performance:** updates two CSS variables on `pointermove`; the gradient repaints only the card.

```css
.spotlight { position: relative; overflow: hidden; isolation: isolate; }
.spotlight > * { position: relative; }                       /* content above the glow */
.spotlight::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(320px circle at var(--x, 50%) var(--y, 50%),
              color-mix(in oklch, var(--color-accent, oklch(0.7 0.15 250)) 20%, transparent), transparent 70%);
  transition: opacity var(--dur-base, 220ms) var(--ease-out, ease-out);
}
.spotlight:hover::before, .spotlight:focus-within::before { opacity: 1; }
@media (hover: none) { .spotlight::before { display: none; } }
```

```tsx
"use client";
import { useRef, type ReactNode, type PointerEvent } from "react";

export function SpotlightCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div ref={ref} onPointerMove={move}
      className={`spotlight rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 ${className}`}>
      {children}
    </div>
  );
}
```
**Tokens:** `--color-accent`, `--color-surface`, `--color-border`, `--radius-lg`. **Variations:** larger circle
(480px) for big tiles; use a border-only glow by masking the pseudo-element with `mask: linear-gradient(#000 0 0)
content-box exclude, linear-gradient(#000 0 0)` and `padding: 1px`.
