# Aurora background
**What:** a slow, drifting field of soft color behind a hero. **Use for:** optimistic consumer, creative
and AI products. **Avoid when:** the brand is serious/data-heavy, or the default purple-pink-blue would be
the only idea — derive hues from the palette.

**Accessibility:** text sits on a solid or tinted layer with verified contrast (check the brightest spot).
It loops forever, so (WCAG 2.2.2) a small Pause control sits in the corner — constant label, state in
`aria-pressed`; no hover pause, because the pointer rests on a hero most of the time. The drift starts
only once that control exists (no JS → a still gradient) and never under reduced motion.
**Performance:** the blur is applied once to a pseudo-element and only its `transform` animates (GPU);
keep it to one hero.

```html
<section class="aurora">
  <button class="aurora__toggle" type="button" aria-pressed="false" hidden>Pause animation</button>
  …hero content…
</section>
```
```css
.aurora { position: relative; isolation: isolate; overflow: clip; background: var(--color-bg, oklch(0.98 0.01 250)); }
.aurora::before {
  content: ""; position: absolute; inset: -20%; z-index: -1; pointer-events: none;
  background:
    radial-gradient(40% 40% at 25% 30%, var(--aurora-1, oklch(0.80 0.12 190 / .8)), transparent 70%),
    radial-gradient(35% 35% at 75% 25%, var(--aurora-2, oklch(0.82 0.11 140 / .7)), transparent 70%),
    radial-gradient(45% 45% at 55% 80%, var(--aurora-3, oklch(0.86 0.10 85 / .6)), transparent 70%);
  filter: blur(60px) saturate(115%); opacity: .75;
}
@media (prefers-reduced-motion: no-preference) {
  .aurora[data-moving]::before { will-change: transform; animation: aurora-drift 28s ease-in-out infinite alternate; }
}
.aurora[data-paused]::before { animation-play-state: paused; }
.aurora::after { /* grain kills gradient banding */
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: .06;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='.8' numOctaves='3'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.aurora__toggle { position: absolute; inset-block-end: 1rem; inset-inline-end: 1rem; }  /* tokens + :focus-visible ring */
.aurora__toggle[aria-pressed="true"] { background: var(--color-accent); color: var(--color-on-accent); }
@keyframes aurora-drift { to { transform: translate3d(4%, -3%, 0) rotate(8deg) scale(1.06); } }
```
```js
// The drift starts only together with its Pause control, and never under reduced motion.
const still = matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll(".aurora").forEach((a) => {
  const button = a.querySelector(".aurora__toggle");
  const sync = () => { a.toggleAttribute("data-moving", !still.matches); button.hidden = still.matches; };
  button.addEventListener("click", () => {
    const paused = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(paused)); a.toggleAttribute("data-paused", paused);
  });
  still.addEventListener("change", sync);
  sync();
});
```
**Tokens:** `--aurora-1/2/3` from the palette (accent, a neighbor hue, a warm counterpoint). **Variations:**
dark mode — lower lightness (0.45–0.55) and opacity .5; scroll-linked drift with `animation-timeline: scroll()`
(it moves only while the user scrolls, so no Pause control is needed); several ambient loops on one site →
one site-wide "Pause animations" toggle that sets `data-paused` on each.
