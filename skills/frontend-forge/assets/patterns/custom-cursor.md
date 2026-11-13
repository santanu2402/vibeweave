# Custom cursor
**What:** a branded pointer — a dot + trailing ring that grows over links, shows labels ("View", "Drag")
and blends with content. **Use for:** expressive portfolios, agencies, galleries. **Avoid when:** apps,
forms, e-commerce checkout — users need the native cursor's precision and familiarity.

**Accessibility:** **never hide the native cursor without a working replacement** — the custom cursor only
activates for fine pointers (`(hover: hover) and (pointer: fine)`), not touch; keep the system cursor for
text fields (`cursor: text`) and when the user prefers reduced motion; the follower is `aria-hidden`.
**Performance:** one rAF loop writing `transform`; lerp smoothing; paused when the tab is hidden.

```css
@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
  html.has-cursor, html.has-cursor a, html.has-cursor button { cursor: none; }
  html.has-cursor input, html.has-cursor textarea, html.has-cursor [contenteditable] { cursor: text; }
}
.cursor-dot, .cursor-ring { position: fixed; top: 0; left: 0; pointer-events: none; z-index: 100; border-radius: 50%;
  translate: -50% -50%; will-change: transform; }
.cursor-dot { width: 6px; height: 6px; background: var(--color-text, #111); }
.cursor-ring { width: 36px; height: 36px; border: 1.5px solid var(--color-text, #111); mix-blend-mode: difference;
  display: grid; place-items: center; font: 600 10px/1 system-ui; text-transform: uppercase; color: #fff;
  transition: width .25s var(--ease-out, ease-out), height .25s var(--ease-out, ease-out), background-color .25s; }
.cursor-ring.is-hover { width: 64px; height: 64px; background: #fff; }
```
```js
// Plain JS (works in any framework; mount once in the root layout's client component)
const fine = matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches;
if (fine) {
  document.documentElement.classList.add("has-cursor");
  const dot = Object.assign(document.createElement("div"), { className: "cursor-dot" });
  const ring = Object.assign(document.createElement("div"), { className: "cursor-ring" });
  dot.ariaHidden = ring.ariaHidden = "true"; document.body.append(dot, ring);
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, raf = 0;
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)`; }, { passive: true });
  const loop = () => { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px, ${ry}px)`; raf = requestAnimationFrame(loop); };
  loop();
  document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) loop(); });
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("a, button, [data-cursor]");
    ring.classList.toggle("is-hover", !!t); ring.textContent = t?.dataset.cursor || "";
  });
  document.addEventListener("pointerleave", () => { dot.style.opacity = ring.style.opacity = "0"; });
  document.addEventListener("pointerenter", () => { dot.style.opacity = ring.style.opacity = "1"; });
}
```
**Variations:** a pure-CSS branded cursor with an image — `cursor: url("/cursor.svg") 4 4, auto;` (keep it
≤ 32×32, hotspot coordinates set, always a fallback keyword); magnetic snapping to buttons; image preview
following the cursor over list items (hide on touch).
