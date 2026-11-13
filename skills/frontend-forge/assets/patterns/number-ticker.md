# Number ticker
**What:** a statistic counts up to its value when it scrolls into view. **Use for:** a few real metrics.
**Avoid when:** the numbers are invented (never animate fake stats) or users compare many numbers at once.

**Accessibility:** the real number is in the server HTML (no-JS sees it) and screen readers get it at once
(visually hidden text); the animated digits are `aria-hidden`; reduced motion shows the final value with no
movement; a ticker already on screen at load keeps its real value (never count up first-screen content).
**Performance:** one `requestAnimationFrame` loop for ~1s, started once by IntersectionObserver; the width
is reserved so counting doesn't shift the layout.

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type Props = { value: number; duration?: number; format?: (n: number) => string };
const defaultFormat = (n: number) => Math.round(n).toLocaleString();

export function NumberTicker({ value, duration = 1200, format = defaultFormat }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatRef = useRef(format);
  formatRef.current = format;
  const [shown, setShown] = useState(() => format(value));          // SSR / no-JS: the real value

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < innerHeight) return;           // on screen at load: keep the real value
    let raf = 0;
    setShown(formatRef.current(0));
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - start) / duration);
        setShown(formatRef.current(value * (1 - Math.pow(1 - p, 3))));   // ease-out cubic
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      <span aria-hidden="true" className="inline-block text-end" style={{ minWidth: `${format(value).length}ch` }}>{shown}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
```
**Variations:** `format={(n) => `${n.toFixed(1)}%`}`; currency via `Intl.NumberFormat`; for rolling digit
columns use Number Flow (`@number-flow/react`, MIT).
