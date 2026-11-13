# GSAP (GreenSock)

The industry standard for complex, sequenced and scroll-driven animation. Since v3.13 (2025)
GSAP and **all** its plugins — ScrollTrigger, SplitText, Flip, MorphSVG, DrawSVG, ScrollSmoother,
Observer, Draggable, Inertia, CustomEase — are free, including commercial use.

`npm i gsap @gsap/react`

## Contents
1. Setup (React / Next.js / vanilla)
2. Tweens and timelines
3. ScrollTrigger: reveal, scrub, pin, horizontal
4. SplitText: line/word/char reveals
5. Flip: layout transitions
6. Responsive + reduced motion with matchMedia
7. Smooth scroll: Lenis or ScrollSmoother
8. Cleanup and debugging

## 1. Setup
```tsx
"use client";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

export function Hero() {
  const scope = useRef(null);
  useGSAP(() => {
    gsap.from(".hero-line", { yPercent: 100, opacity: 0, stagger: 0.08, duration: 0.9, ease: "expo.out" });
  }, { scope });              // selectors are scoped to this component; auto-cleanup on unmount
  return <section ref={scope}>…</section>;
}
```
Event handlers created later should be wrapped with `contextSafe` from `useGSAP` so they get cleaned up.
Vanilla: `const ctx = gsap.context(() => { … }, rootEl);` then `ctx.revert()` to clean up.

## 2. Tweens and timelines
```js
gsap.to(".box", { x: 200, duration: 0.6, ease: "power3.out" });
gsap.from(".box", { opacity: 0, y: 20 });                 // from → current state
gsap.fromTo(".box", { scale: 0.9 }, { scale: 1 });
gsap.set(".box", { transformOrigin: "50% 100%" });

const tl = gsap.timeline({ defaults: { duration: 0.7, ease: "power3.out" } });
tl.from(".eyebrow", { opacity: 0, y: 10 })
  .from(".headline .line", { yPercent: 100, stagger: 0.08 }, "<0.1")   // starts 0.1s after previous start
  .from(".cta", { opacity: 0, y: 10 }, "-=0.4")                          // overlaps the previous by 0.4s
  .from(".visual", { opacity: 0, scale: 0.96, duration: 1 }, "<");       // same time as previous
```
Eases: `power1–4.out/in/inOut`, `expo.out` (dramatic), `back.out(1.7)` (overshoot), `elastic.out(1, .4)`
(use rarely), `"none"` for scrubbed scroll. `CustomEase.create("brand", "M0,0 C.22,1 .36,1 1,1")`.
Utilities: `gsap.utils.toArray`, `clamp`, `mapRange`, `interpolate`, `random`, `wrap`; `gsap.quickTo` for
fast pointer-follow updates.

## 3. ScrollTrigger
**Reveal once on enter**
```js
gsap.from(".feature", {
  opacity: 0, y: 40, duration: 0.8, ease: "power3.out", stagger: 0.1,
  scrollTrigger: { trigger: ".features", start: "top 75%", once: true },
});
// Many items: batch them so they animate in groups as they enter
ScrollTrigger.batch(".card", { start: "top 85%", once: true,
  onEnter: (els) => gsap.from(els, { opacity: 0, y: 30, stagger: 0.08, overwrite: true }) });
```
**Scrub (animation tied to scroll position)**
```js
gsap.to(".hero-image", { scale: 1.15, yPercent: 10, ease: "none",
  scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
```
**Pinned storytelling section**
```js
const tl = gsap.timeline({
  scrollTrigger: { trigger: ".story", start: "top top", end: "+=200%", scrub: 1, pin: true, anticipatePin: 1 },
});
tl.from(".story .step-1", { opacity: 0, y: 40 })
  .to(".story .device", { rotateY: -20, scale: 0.9 }, "<")
  .from(".story .step-2", { opacity: 0, y: 40 })
  .to(".story .device", { rotateY: 0, scale: 1 });
```
**Horizontal scroll gallery**
```js
const track = document.querySelector(".h-track");
const panels = gsap.utils.toArray(".h-panel");
gsap.to(panels, {
  xPercent: -100 * (panels.length - 1), ease: "none",
  scrollTrigger: { trigger: track, pin: true, scrub: 1, snap: 1 / (panels.length - 1),
    end: () => "+=" + track.scrollWidth, invalidateOnRefresh: true },
});
```
`start`/`end` syntax: `"<trigger position> <viewport position>"`, e.g. `"top 80%"`, `"center center"`,
`"+=500"`. `toggleActions: "play none none reverse"` (onEnter onLeave onEnterBack onLeaveBack).
`markers: true` while developing. Call `ScrollTrigger.refresh()` after images/fonts change layout.
Keep pinned sections short (≤ 2–3 viewports) and provide a static mobile/reduced variant.

## 4. SplitText
```js
SplitText.create(".headline", {
  type: "lines, words",
  mask: "lines",          // wraps each line in an overflow-clip mask → classic "rise from below"
  autoSplit: true,        // re-splits on resize / font load; return the animation from onSplit
  onSplit(self) {
    return gsap.from(self.lines, { yPercent: 100, opacity: 0, stagger: 0.08, duration: 0.9, ease: "expo.out" });
  },
});
```
SplitText adds `aria-label` to the parent and `aria-hidden` to the pieces by default so screen
readers read the sentence normally. Split after fonts load (autoSplit handles it). Use `type: "chars"`
for short words only — hundreds of char tweens get heavy.

## 5. Flip (layout transitions)
```js
import { Flip } from "gsap/Flip"; gsap.registerPlugin(Flip);
const state = Flip.getState(".grid .item");
grid.classList.toggle("is-list");                 // any DOM/layout change
Flip.from(state, { duration: 0.6, ease: "power2.inOut", stagger: 0.03, absolute: true, nested: true });
```
Great for filter/sort grids, view-mode switches, expanding cards into detail views.

## 6. Responsive + reduced motion with matchMedia
```js
const mm = gsap.matchMedia();
mm.add({ desktop: "(min-width: 900px)", mobile: "(max-width: 899px)", reduce: "(prefers-reduced-motion: reduce)" },
  (ctx) => {
    const { desktop, reduce } = ctx.conditions;
    if (reduce) { gsap.from(".hero > *", { opacity: 0, duration: 0.4, stagger: 0.05 }); return; }
    if (desktop) { /* pinned, scrubbed story */ } else { /* simple reveals */ }
    return () => { /* optional custom cleanup */ };
  });
```
Animations created inside a matchMedia handler are reverted automatically when the query stops matching.
In React, put this inside `useGSAP`.

## 7. Smooth scroll: Lenis or ScrollSmoother
Only for expressive marketing/portfolio sites — never in apps, forms or docs.
```js
import Lenis from "lenis";            // npm i lenis   (React: import { ReactLenis } from "lenis/react")
const lenis = new Lenis({ autoRaf: false, lerp: 0.1 });
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
if (matchMedia("(prefers-reduced-motion: reduce)").matches) lenis.destroy();
```
Also import `lenis/dist/lenis.css` (or the recommended CSS from the Lenis README).
GSAP's own `ScrollSmoother` (requires `#smooth-wrapper > #smooth-content` markup) adds `data-speed`
parallax and `data-lag` effects with tight ScrollTrigger integration.

## 8. Cleanup and debugging
- React: always `useGSAP` (handles Strict Mode double-invocation and unmount cleanup).
- Kill/refresh on route change in SPAs: `ScrollTrigger.getAll().forEach(t => t.kill())` if not using contexts.
- `gsap.globalTimeline.timeScale(0.2)` to inspect a sequence in slow motion.
- Avoid animating the same property from two tweens — use `overwrite: "auto"`.
- Initial-state flash (FOUC): set initial styles via `gsap.set` inside the effect, or use
  `autoAlpha` and a CSS `visibility: hidden` class removed by JS — keep content visible when JS is off
  (e.g. only hide when `<html class="js">` is present).
