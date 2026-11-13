# Scroll progress
**What:** a thin bar shows how far through the page the reader is. **Use for:** articles, docs, long
case studies. **Avoid when:** short pages or app screens.

**Accessibility:** decorative (`aria-hidden`); informative motion, fine under reduced motion. **Performance:**
CSS scroll timeline on `transform` — off the main thread; the JS fallback uses one passive listener + rAF.

```html
<div class="progress" aria-hidden="true"></div>
```
```css
.progress { position: fixed; inset: 0 0 auto 0; height: 3px; z-index: 30; transform-origin: 0 50%;
  transform: scaleX(var(--p, 0)); background: var(--color-accent, currentColor); }
@supports (animation-timeline: scroll()) {
  .progress { animation: progress-grow linear both; animation-timeline: scroll(root block); }
  @keyframes progress-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
}
```
```js
if (!CSS.supports("animation-timeline: scroll()")) {          // fallback for older browsers
  const bar = document.querySelector(".progress"); let queued = false;
  addEventListener("scroll", () => {
    if (queued) return; queued = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty("--p", max > 0 ? String(scrollY / max) : "0"); queued = false;
    });
  }, { passive: true });
}
```
**Variations:** progress of one article only — use a named `view-timeline` on the `<article>`; a circular
indicator with `stroke-dashoffset` driven by the same timeline.
