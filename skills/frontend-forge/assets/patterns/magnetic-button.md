# Magnetic button
**What:** the button leans toward the pointer and springs back. **Use for:** one or two playful CTAs, icon
buttons in expressive portfolios. **Avoid when:** forms and dense UIs — moving targets are harder to hit.

**Accessibility:** mouse only (touch and pen ignored); movement capped to a few pixels; disabled under
reduced motion; focus ring unaffected. **Performance:** writes `transform` only.

```tsx
"use client";
import { useRef, type ButtonHTMLAttributes, type PointerEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { strength?: number; max?: number };

export function MagneticButton({ strength = 0.3, max = 10, className = "", onPointerMove, onPointerLeave, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(e);
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const clamp = (v: number) => Math.max(-max, Math.min(max, v));
    el.style.transform = `translate(${clamp((e.clientX - r.left - r.width / 2) * strength)}px, ${clamp((e.clientY - r.top - r.height / 2) * strength)}px)`;
  };
  const leave = (e: PointerEvent<HTMLButtonElement>) => { onPointerLeave?.(e); if (ref.current) ref.current.style.transform = ""; };
  return (
    <button ref={ref} type="button" {...props} onPointerMove={move} onPointerLeave={leave}
      className={`transition-transform duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] ${className}`} />
  );
}
```
**Variations:** move the label at 1.5× the button's offset for a parallax feel; wrap with a larger invisible
hit area so the pull starts before the pointer reaches the button.
