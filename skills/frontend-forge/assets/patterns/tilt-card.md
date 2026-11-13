# Tilt card (3D)
**What:** the card tilts toward the pointer with a moving glare, like a physical object. **Use for:**
product cards, collectibles, portfolio tiles. **Avoid when:** text-heavy cards (tilted text is harder to read).

**Accessibility:** tilt ≤ 6–8° (vestibular safety), mouse only, off under reduced motion; content stays
readable at rest. **Performance:** `transform` + one glare pseudo-element; `transform-style` only on the card.

```css
.tilt-stage { perspective: 900px; }
.tilt {
  --rx: 0deg; --ry: 0deg; --gx: 50%; --gy: 50%;
  position: relative; transform-style: preserve-3d; border-radius: var(--radius-lg, 16px);
  transform: rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 400ms var(--ease-out, cubic-bezier(.22,1,.36,1));
}
.tilt::after { /* glare */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(60% 60% at var(--gx) var(--gy), oklch(1 0 0 / .35), transparent 60%);
  mix-blend-mode: soft-light; transition: opacity 300ms;
}
.tilt:hover::after { opacity: 1; }
.tilt__layer { transform: translateZ(40px); }          /* inner element floats above the card */
@media (prefers-reduced-motion: reduce) { .tilt { transform: none !important; } .tilt::after { display: none; } }
```
```tsx
"use client";
import { useRef, type ReactNode, type PointerEvent } from "react";

export function TiltCard({ children, max = 6 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;   // 0..1
    el.style.setProperty("--ry", `${(px - 0.5) * 2 * max}deg`);
    el.style.setProperty("--rx", `${(0.5 - py) * 2 * max}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  };
  const reset = () => { const el = ref.current; if (el) { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); } };
  return <div className="tilt-stage"><div ref={ref} className="tilt" onPointerMove={move} onPointerLeave={reset}>{children}</div></div>;
}
```
**Variations:** add a shadow that shifts opposite to the tilt (`box-shadow: calc(var(--ry) * -1.5) …` via a
JS-set length) for a stronger sense of depth — see motion-forge `realism.md` §2.
