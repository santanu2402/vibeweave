# Marquee
**What:** an endless horizontal strip of logos, quotes or tags. **Use for:** "trusted by" rows, tickers.
**Avoid when:** the items carry essential information (people can't read moving text easily).

**Accessibility:** WCAG 2.2.2 — anything that moves for more than 5s needs a way to stop it. The Pause
button comes before the strip, keeps its label and reports state with `aria-pressed` (changing both the
label and the state confuses screen readers); the strip also pauses on hover and on keyboard focus inside
it; the duplicate track is `aria-hidden` + `inert` (its links can't be tabbed to). Without JS, or under
reduced motion, it is a static wrapped row and the button stays hidden. **Performance:** one `transform`
animation per track, GPU-composited.

```html
<section class="marquee" aria-label="Customers">
  <button class="marquee__toggle" type="button" aria-pressed="false" hidden>Pause</button>
  <div class="marquee__viewport">
    <ul class="marquee__track"><li>…</li><li>…</li></ul>
    <ul class="marquee__track" aria-hidden="true" inert><li>…</li><li>…</li></ul>  <!-- same items -->
  </div>
</section>
```
```css
.marquee { display: grid; gap: .75rem; }
.marquee__viewport { --gap: 3rem; --duration: 40s; display: flex; gap: var(--gap); overflow: hidden; }
.marquee__track { display: flex; flex-shrink: 0; gap: var(--gap); min-width: 100%; justify-content: space-around;
  margin: 0; padding: 0; list-style: none; }
/* Default (no JS, reduced motion): a static wrapped row. It moves only once the script has shown the button. */
.marquee:not([data-moving]) .marquee__track { flex-shrink: 1; flex-wrap: wrap; justify-content: center; }
.marquee:not([data-moving]) .marquee__track[aria-hidden="true"] { display: none; }
.marquee[data-moving] .marquee__viewport { mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
@media (prefers-reduced-motion: no-preference) {
  .marquee[data-moving] .marquee__track { animation: marquee var(--duration) linear infinite; }
}
.marquee:hover .marquee__track, .marquee:focus-within .marquee__track,
.marquee__toggle[aria-pressed="true"] ~ .marquee__viewport .marquee__track { animation-play-state: paused; }
.marquee__toggle { justify-self: end; }   /* style through tokens, with a visible :focus-visible ring */
.marquee__toggle[aria-pressed="true"] { background: var(--color-accent); color: var(--color-on-accent); }
@keyframes marquee { to { transform: translateX(calc(-100% - var(--gap))); } }
```
```js
// Motion starts only together with a working Pause control, and never under reduced motion.
const still = matchMedia("(prefers-reduced-motion: reduce)");
document.querySelectorAll(".marquee").forEach((m) => {
  const button = m.querySelector(".marquee__toggle");
  const sync = () => { m.toggleAttribute("data-moving", !still.matches); button.hidden = still.matches; };
  button.addEventListener("click", () =>
    button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true")));
  still.addEventListener("change", sync);
  sync();
});
```
**Tokens:** `--gap`, `--duration` (slower for text: 60s+), `--color-accent` / `--color-on-accent` for the
pressed state. **Variations:** reverse direction with `animation-direction: reverse` on a second row (one
button can pause both); vertical marquee with `translateY`.
