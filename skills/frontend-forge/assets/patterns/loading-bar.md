# Loading bar (top route/fetch progress)
**What:** a thin bar at the top that creeps forward during navigations and long requests, then completes.
**Use for:** SPA route changes, long fetches, form submits that navigate. **Avoid when:** the wait is < 300ms
(skip it) or the content area already shows a skeleton.

**Accessibility:** decorative (`aria-hidden`) — announce state elsewhere (live region "Loading…"); stops
animating under reduced motion (it still appears/disappears). **Performance:** `transform: scaleX` only.

```html
<div class="loading-bar" aria-hidden="true"></div>
```
```css
.loading-bar { position: fixed; inset: 0 0 auto 0; height: 3px; z-index: 70; transform-origin: 0 50%; transform: scaleX(0);
  background: var(--color-accent, currentColor); opacity: 0; transition: transform 300ms var(--ease-out, ease-out), opacity 200ms; }
.loading-bar.is-active { opacity: 1; }
@media (prefers-reduced-motion: reduce) { .loading-bar { transition: opacity 200ms; } }
```
```js
// start() when a navigation/request begins, done() when it ends. Trickles toward 90%, never claims to finish early.
const bar = document.querySelector(".loading-bar");
let value = 0, trickle = 0, showTimer = 0, active = 0;
const set = (v) => { value = v; bar.style.transform = `scaleX(${v})`; };
export function start() {
  if (active++ > 0) return;                                   // nested requests share one bar
  showTimer = setTimeout(() => {                              // don't flash for fast loads
    bar.classList.add("is-active"); set(0.08);
    trickle = setInterval(() => set(value + (0.9 - value) * 0.08), 300);
  }, 200);
}
export function done() {
  if (--active > 0) return;
  clearTimeout(showTimer); clearInterval(trickle);
  if (!bar.classList.contains("is-active")) return;
  set(1); setTimeout(() => { bar.classList.remove("is-active"); setTimeout(() => set(0), 250); }, 200);
}
```
**Wire it:** Next.js App Router — call `start()` in a client `Link` wrapper on click and `done()` when `usePathname()`
changes; TanStack Query — `useIsFetching() > 0`; SvelteKit — `$navigating`; Nuxt ships `<NuxtLoadingIndicator>`.
