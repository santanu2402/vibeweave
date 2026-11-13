# Motion (formerly Framer Motion)

`npm install motion` · React: `import { … } from "motion/react"` · Vanilla JS: `import { … } from "motion"`
· Vue: `motion-v`. Older projects may import from `framer-motion` — same API; keep what's installed.

## Contents
1. Basics and transitions
2. Variants and stagger
3. In-view reveals
4. Scroll-linked animation
5. Exit animations (AnimatePresence)
6. Layout and shared-element animation
7. Gestures, drag, springs
8. Reduced motion and performance
9. Vanilla JS API
10. Recipes: magnetic button, counter, tilt card, text reveal, page transition

## 1. Basics and transitions
```tsx
"use client";
import { motion } from "motion/react";

<motion.div
  initial={{ opacity: 0, y: 16 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
/>
// Springs: physical feel for direct manipulation and layout
transition={{ type: "spring", stiffness: 380, damping: 30 }}
transition={{ type: "spring", bounce: 0.2, visualDuration: 0.4 }}
```
Use `x`, `y`, `scale`, `rotate` (independent transforms) rather than a `transform` string.

## 2. Variants and stagger
```tsx
const list = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

<motion.ul variants={list} initial="hidden" animate="show">
  {items.map((i) => <motion.li key={i.id} variants={item}>{i.label}</motion.li>)}
</motion.ul>
```
Newer versions also accept `delayChildren: stagger(0.06)` (import `stagger` from `motion/react`).

## 3. In-view reveals
```tsx
<motion.section
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
/>
```
`useInView(ref, { once: true, margin: "-10% 0px" })` gives a boolean for custom logic.
Don't reveal *every* section — reserve it for content that benefits from arriving.

## 4. Scroll-linked animation
```tsx
import { motion, useScroll, useTransform, useSpring } from "motion/react";

function ParallaxImage({ src, alt }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  return (
    <div ref={ref} style={{ overflow: "hidden", borderRadius: 24 }}>
      <motion.img src={src} alt={alt} style={{ y, scale: 1.2 }} />
    </div>
  );
}

// Page progress bar
const { scrollYProgress } = useScroll();
const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
<motion.div style={{ scaleX, transformOrigin: "0 50%" }} className="fixed inset-x-0 top-0 h-[3px] bg-(--accent)" />
```
Motion uses native ScrollTimeline when possible (compositor-driven).

## 5. Exit animations (AnimatePresence)
```tsx
import { AnimatePresence, motion } from "motion/react";
<AnimatePresence mode="wait">
  {open && (
    <motion.div key="panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }} />
  )}
</AnimatePresence>
```
Children need stable `key`s. `mode="popLayout"` lets surrounding layout animate while an item exits.

## 6. Layout and shared-element animation
```tsx
// Animate any layout change (size/position) with FLIP under the hood
<motion.div layout transition={{ type: "spring", bounce: 0.15, visualDuration: 0.35 }} />

// Shared element: same layoutId in two places → morphs between them
{tabs.map((t) => (
  <button key={t} onClick={() => setActive(t)} className="relative px-3 py-1.5">
    {active === t && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-(--surface-2)" />}
    <span className="relative">{t}</span>
  </button>
))}
```
Wrap independent groups in `<LayoutGroup>`; use `layout="position"` to avoid text distortion.

## 7. Gestures, drag, springs
```tsx
<motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
<motion.div drag="x" dragConstraints={{ left: -200, right: 0 }} dragElastic={0.1} />
```
`useMotionValue` + `useSpring` + `useTransform` build pointer-driven effects without re-renders.

## 8. Reduced motion and performance
```tsx
import { MotionConfig } from "motion/react";
<MotionConfig reducedMotion="user">{children}</MotionConfig>   // disables transform/layout animations for users who ask
```
`useReducedMotion()` returns a boolean for custom branches (e.g. swap parallax for a static image).
Motion values update outside React render — prefer them over state for per-frame values.
For server components, `import * as motion from "motion/react-client"`. To reduce bundle size, use
`LazyMotion` + `m` components with `domAnimation` features.

## 9. Vanilla JS API
```js
import { animate, inView, scroll, stagger } from "motion";
animate(".card", { opacity: [0, 1], y: [16, 0] }, { delay: stagger(0.06), duration: 0.5, ease: [0.22, 1, 0.36, 1] });
inView(".reveal", (el) => { animate(el, { opacity: [0, 1], y: [24, 0] }, { duration: 0.6 }); });
scroll(animate(".progress", { scaleX: [0, 1] }));
```

## 10. Recipes

**Magnetic button** (pointer devices only)
```tsx
function Magnetic({ children }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 300, damping: 20 }), y = useSpring(0, { stiffness: 300, damping: 20 });
  const reduce = useReducedMotion();
  return (
    <motion.div ref={ref} style={{ x, y }}
      onPointerMove={(e) => { if (reduce || e.pointerType !== "mouse") return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25); y.set((e.clientY - r.top - r.height / 2) * 0.25); }}
      onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}
```

**Number counter on view**
```tsx
function Counter({ to, format = (n) => Math.round(n).toLocaleString() }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const text = useTransform(value, format);
  useEffect(() => { if (inView) animate(value, to, { duration: 1.2, ease: [0.16, 1, 0.3, 1] }); }, [inView]);
  return <motion.span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>{text}</motion.span>;
}
```
(Render the final number for screen readers / no-JS, e.g. an `aria-label` with the real value.)

**3D tilt card**
```tsx
const rx = useSpring(0, { stiffness: 200, damping: 20 }), ry = useSpring(0, { stiffness: 200, damping: 20 });
<motion.div style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
  onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 10); rx.set(-((e.clientY - r.top) / r.height - 0.5) * 10); }}
  onPointerLeave={() => { rx.set(0); ry.set(0); }} />
```
Keep tilt ≤ 8–10°; disable under reduced motion.

**Word-by-word headline reveal**
```tsx
const words = text.split(" ");
<motion.h1 aria-label={text} initial="hidden" animate="show"
  variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
  {words.map((w, i) => (
    <span key={i} aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
      <motion.span style={{ display: "inline-block" }}
        variants={{ hidden: { y: "110%" }, show: { y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}>
        {w}&nbsp;
      </motion.span>
    </span>
  ))}
</motion.h1>
```

**Route/page transition (Next.js App Router)** — use a `template.tsx` (re-mounts per navigation):
```tsx
"use client";
export default function Template({ children }) {
  return <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.main>;
}
```
