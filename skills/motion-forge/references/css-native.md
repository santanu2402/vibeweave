# Native CSS & Browser APIs for Motion

Zero-dependency motion. Check support notes; always wrap newer features in `@supports` with a
sensible static fallback.

## Contents
1. Transitions and keyframes
2. Enter animations with `@starting-style`
3. Scroll-driven animations
4. View Transitions API
5. Animating to `height: auto`
6. Recipes: marquee, spotlight card, progress bar, staggered entrance, shine button, underline

## 1. Transitions and keyframes
```css
.btn { transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out),
                   box-shadow var(--dur-fast) var(--ease-out); }
@media (hover: hover) { .btn:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); } }
.btn:active { transform: translateY(0) scale(.98); transition-duration: var(--dur-instant); }

@keyframes rise { from { opacity: 0; transform: translateY(16px); } }  /* "to" = the element's normal state */
.rise { animation: rise var(--dur-story) var(--ease-out) both; }
```
Writing only the `from` keyframe means the element's natural style is the end state — safe if the
animation never runs.

## 2. Enter animations with `@starting-style`
Animate elements appearing from `display: none` (popovers, dialogs, toasts, newly inserted nodes).
```css
.toast { transition: opacity .25s var(--ease-out), transform .25s var(--ease-out), display .25s allow-discrete; }
@starting-style { .toast { opacity: 0; transform: translateY(12px); } }

[popover] { opacity: 0; transform: translateY(6px) scale(.98);
  transition: opacity .18s, transform .18s, overlay .18s allow-discrete, display .18s allow-discrete; }
[popover]:popover-open { opacity: 1; transform: none; }
@starting-style { [popover]:popover-open { opacity: 0; transform: translateY(6px) scale(.98); } }

dialog[open] { animation: rise .3s var(--ease-out); }
dialog::backdrop { background: oklch(0 0 0 / .45); backdrop-filter: blur(2px); }
```
Supported in all evergreen browsers (2024+); older browsers simply skip the transition.

## 3. Scroll-driven animations
Runs on the compositor in supporting browsers (Chromium 115+, Safari 26+; Firefox behind a flag
at time of writing) — always feature-detect.
```css
/* Reveal as the element enters the viewport */
@supports (animation-timeline: view()) {
  .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
}
@keyframes reveal { from { opacity: 0; transform: translateY(32px) scale(.98); } }

/* Reading progress bar */
.progress { position: fixed; inset: 0 0 auto; height: 3px; background: var(--accent);
  transform-origin: 0 50%; transform: scaleX(0); }
@supports (animation-timeline: scroll()) {
  .progress { animation: grow linear both; animation-timeline: scroll(root block); }
}
@keyframes grow { to { transform: scaleX(1); } }

/* Parallax layer */
@supports (animation-timeline: view()) {
  .parallax { animation: drift linear both; animation-timeline: view(); }
}
@keyframes drift { from { transform: translateY(-8%); } to { transform: translateY(8%); } }

@media (prefers-reduced-motion: reduce) { .reveal, .parallax, .progress { animation: none; } }
```
Fallback for unsupported browsers: elements simply appear static (fine), or use
IntersectionObserver to add an `.is-visible` class.
Named timelines (`scroll-timeline-name`, `view-timeline-name`, `timeline-scope`) let one element's
scroll drive another's animation (e.g. a horizontal gallery driven by section scroll).

## 4. View Transitions API
**Same-document (SPA)**
```js
function navigate(update) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  document.startViewTransition(() => update());
}
```
```css
.product-hero { view-transition-name: product-hero; }   /* unique per page state */
::view-transition-old(root), ::view-transition-new(root) { animation-duration: .35s; animation-timing-function: var(--ease-in-out); }
::view-transition-group(product-hero) { animation-duration: .5s; }
```
**Cross-document (MPA, no JS)** — Chromium 126+, Safari 18.2+:
```css
@view-transition { navigation: auto; }
```
Frameworks: Astro `<ClientRouter />` + `transition:name`; SvelteKit `onNavigate` +
`document.startViewTransition`; Next.js/React have experimental view-transition support — check
your version's docs before relying on it.

## 5. Animating to `height: auto`
```css
/* Modern (Chromium 129+): opt in to keyword interpolation */
:root { interpolate-size: allow-keywords; }
details::details-content { height: 0; overflow: clip; transition: height .3s var(--ease-out), content-visibility .3s allow-discrete; }
details[open]::details-content { height: auto; }

/* Universal fallback: grid rows trick */
.collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .3s var(--ease-out); }
.collapse[data-open="true"] { grid-template-rows: 1fr; }
.collapse > .inner { overflow: hidden; }
```

## 6. Recipes

**Infinite marquee** — duplicate the items once inside the track, hidden from screen readers and the tab
order (`aria-hidden="true"` + `inert`). Accessibility: WCAG 2.2.2 needs a way to stop it — it pauses on
hover and keyboard focus, and a Pause button (constant label, state in `aria-pressed`) stops it; it moves
only once JS has shown that button (no JS → a static row) and never under reduced motion.
```html
<section class="marquee" aria-label="Customers">
  <button class="marquee__toggle" type="button" aria-pressed="false" hidden>Pause</button>
  <div class="marquee__viewport">
    <ul class="marquee__track"><li>…</li><li>…</li><li aria-hidden="true" inert>…</li><li aria-hidden="true" inert>…</li></ul>
  </div>
</section>
```
```css
.marquee__viewport { overflow: hidden; }
.marquee__track { display: flex; flex-wrap: wrap; gap: 3rem; margin: 0; padding: 0; list-style: none; }  /* static default */
.marquee:not([data-moving]) .marquee__track > [aria-hidden="true"] { display: none; }
@media (prefers-reduced-motion: no-preference) {
  .marquee[data-moving] .marquee__viewport { mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
  .marquee[data-moving] .marquee__track { flex-wrap: nowrap; width: max-content; animation: marquee 40s linear infinite; }
}
.marquee:is(:hover, :focus-within) .marquee__track,
.marquee__toggle[aria-pressed="true"] + .marquee__viewport .marquee__track { animation-play-state: paused; }
@keyframes marquee { to { transform: translateX(calc(-50% - 1.5rem)); } }   /* half the track + half a gap */
```
```js
const still = matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll(".marquee").forEach((m) => {
  const b = m.querySelector(".marquee__toggle");
  const sync = () => { m.toggleAttribute("data-moving", !still.matches); b.hidden = still.matches; };
  b.addEventListener("click", () => b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")));
  still.addEventListener("change", sync);
  sync();
});
```

**Spotlight / glow-follow card**
```css
.spot { --x: 50%; --y: 50%; position: relative; background: var(--surface); border-radius: 16px; }
.spot::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(320px circle at var(--x) var(--y), oklch(from var(--accent) l c h / .14), transparent 65%);
  transition: opacity .2s; }
.spot:hover::before { opacity: 1; }
```
```js
for (const el of document.querySelectorAll(".spot")) {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  });
}
```

**Staggered entrance without JS** (set `--i` per item: `style="--i: 2"`)
```css
.stagger > * { animation: rise .6s var(--ease-out) both; animation-delay: calc(var(--i, 0) * 60ms); }
```

**Shine sweep on a button**
```css
.shine { position: relative; overflow: hidden; }
.shine::after { content: ""; position: absolute; inset: 0; transform: translateX(-120%);
  background: linear-gradient(100deg, transparent 30%, oklch(1 0 0 / .35) 50%, transparent 70%); }
@media (hover: hover) { .shine:hover::after { transform: translateX(120%); transition: transform .7s var(--ease-out); } }
```

**Animated underline link**
```css
.link { background: linear-gradient(currentColor 0 0) 0 100% / 0 1px no-repeat; transition: background-size .3s var(--ease-out); }
.link:hover, .link:focus-visible { background-size: 100% 1px; }
```

**Spring-like easing with `linear()`** — approximates a spring curve in pure CSS; generate
precise ones with Jake Archibald's linear() easing generator:
```css
--ease-bounce: linear(0, 0.36 9%, 0.9 22%, 1.06 30%, 1.03 38%, 0.99 52%, 1);
```
