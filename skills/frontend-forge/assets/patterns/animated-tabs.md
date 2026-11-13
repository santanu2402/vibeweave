# Animated tabs
**What:** accessible tabs whose indicator glides to the selected tab. **Use for:** pricing toggles, settings,
segmented controls. **Avoid when:** the "tabs" navigate to other pages (use links with an active state).

**Accessibility:** WAI-ARIA tabs pattern — `role="tablist"/"tab"/"tabpanel"`, `aria-selected`,
`aria-controls`, roving `tabIndex`, ←/→/Home/End keys; Motion respects reduced motion via `MotionConfig`.
**Performance:** Motion's `layoutId` animates the indicator with transforms (FLIP).

```tsx
"use client";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, MotionConfig } from "motion/react";

type Tab = { id: string; label: string; panel: ReactNode };

export function Tabs({ tabs, initial = tabs[0]?.id }: { tabs: Tab[]; initial?: string }) {
  const [active, setActive] = useState(initial);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const onKey = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
      : e.key === "Home" ? 0 : e.key === "End" ? last : null;
    if (next === null) return;
    e.preventDefault(); setActive(tabs[next].id); refs.current[next]?.focus();
  };
  return (
    <MotionConfig reducedMotion="user" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}>
      <div role="tablist" className="relative inline-flex gap-1 rounded-full bg-[var(--color-surface)] p-1">
        {tabs.map((t, i) => {
          const selected = t.id === active;
          return (
            <button key={t.id} ref={(el) => { refs.current[i] = el; }} role="tab" id={`${uid}-tab-${t.id}`}
              aria-selected={selected} aria-controls={`${uid}-panel-${t.id}`} tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)} onKeyDown={(e) => onKey(e, i)}
              className="relative rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2">
              {selected && <motion.span layoutId={`${uid}-indicator`} className="absolute inset-0 -z-0 rounded-full bg-[var(--color-bg)] shadow-sm" />}
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`${uid}-panel-${t.id}`} aria-labelledby={`${uid}-tab-${t.id}`} hidden={t.id !== active} tabIndex={0} className="mt-6">
          {t.panel}
        </div>
      ))}
    </MotionConfig>
  );
}
```
**Variations:** without Motion, position the indicator with CSS anchor positioning or a measured
`translateX` + `width` transition; underline style instead of pill.
