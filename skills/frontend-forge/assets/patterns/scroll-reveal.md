# Scroll reveal
**What:** elements rise and fade in as they enter the viewport; scrub variants follow scroll position.
**Use for:** below-the-fold section entrances, image reveals, staggered lists. **Avoid when:** every element
on the page (pick the few that matter), content users need instantly (forms, prices), or anything in the
first screen.

**Accessibility:** content is **visible by default** — the hidden "before" state applies only under a `.js`
class, where scroll-driven animations are supported and motion is allowed, so no-JS, older-browser and
reduced-motion users always see everything. **Never on the first screen:** keep `.reveal` off the headline,
lead paragraph and hero image (the LCP element) — they must paint at full opacity immediately.
**Performance:** CSS scroll timelines run off the main thread (Chrome/Edge, Safari 26+, Firefox 159+).

```html
<!-- In <head>, before the stylesheet: the only JS this needs. Without it, nothing is ever hidden. -->
<script>document.documentElement.classList.add("js")</script>
```
```css
/* 1. Enter once, driven by the element's own visibility (below-the-fold content only) */
@keyframes reveal-up { from { opacity: 0; translate: 0 1.5rem; } to { opacity: 1; translate: 0 0; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .js .reveal { animation: reveal-up linear both; animation-timeline: view(); animation-range: entry 5% cover 30%; }
    .js .reveal-stagger > * { animation: reveal-up linear both; animation-timeline: view(); }
    .js .reveal-stagger > *:nth-child(2) { animation-range: entry 10% cover 34%; }
    .js .reveal-stagger > *:nth-child(3) { animation-range: entry 15% cover 38%; }
  }
}
/* 2. Image wipe as it scrolls through (scrubbed) */
@keyframes wipe { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .js .reveal-wipe { animation: wipe linear both; animation-timeline: view(); animation-range: entry 0% cover 45%; }
  }
}
/* 3. Horizontal gallery driven by vertical scroll, no JS. The default (older browsers, reduced motion) is a
   swipeable row: give .h-scroll__sticky tabindex="0" role="region" aria-label="…" so keyboards can scroll it. */
.h-scroll__sticky { overflow-x: auto; }
.h-scroll__track { display: flex; gap: 2rem; padding-inline: 5vw; width: max-content; }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .h-scroll { height: 300vh; view-timeline-name: --hs; }
    .h-scroll__sticky { position: sticky; top: 0; height: 100dvh; overflow: hidden; display: flex; align-items: center; }
    .h-scroll__track { animation: slide-x linear both; animation-timeline: --hs; animation-range: contain 0% contain 100%; }
  }
}
@keyframes slide-x { to { translate: calc(-100% + 100vw) 0; } }
```
**Fallback for older browsers (optional):** an IntersectionObserver that adds `.is-visible`, with the hidden
state written as `.js .reveal:not(.is-visible)` — skip elements already on screen at load, and keep the
default state visible. **Variations:** GSAP ScrollTrigger for pinned multi-step stories (motion-forge
`gsap.md`), Motion `whileInView` in React (same rules: below the fold, visible without JS).
