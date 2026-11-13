# Frontend Bug Catalog — symptom → root cause → fix

The classics, checked November 2026. Each entry: how to confirm (often a `probe.mjs` section),
the cause, the fix, and the wrong fix to avoid.

## Contents
1. Layout & overflow · 2. Layering & positioning · 3. Styling pipeline (Tailwind, CSS) ·
4. Rendering & hydration · 5. Animation · 6. Assets & network · 7. State & effects · 8. Mobile

## 1. Layout & overflow

**Horizontal scrollbar / page wobbles sideways on mobile**
- Confirm: probe page mode → OVERFLOW ROOT CAUSES.
- Causes: `width: 100vw` (includes the scrollbar; plus any margin/offset), fixed pixel widths,
  long unbroken strings/URLs, `white-space: nowrap`, media without `max-width: 100%`, negative
  margins, off-canvas menus positioned past the right edge, decorative blobs translated out.
- Fix: `width: 100%`; fluid widths (`min(100%, 72rem)`); `overflow-wrap: anywhere` on user text;
  `img, video, svg { max-width: 100%; height: auto }`; clip decorative overflow on the *section*
  with `overflow-x: clip`.
- Wrong fix: `body { overflow-x: hidden }` — hides the symptom, breaks `position: sticky` and
  can still scroll on iOS.

**Flex/grid child overflows; `text-overflow: ellipsis` doesn't work**
- Confirm: probe → CONTENT SPILLING OUT OF ITS CONTAINER.
- Cause: flex/grid items default to `min-width: auto` (they refuse to shrink below content).
- Fix: `min-width: 0` on the item (and `overflow: hidden; text-overflow: ellipsis; white-space:
  nowrap` for truncation); in grid use `minmax(0, 1fr)` instead of `1fr`.

**Content jumps when a scrollbar appears / modal opens**
- Fix: `scrollbar-gutter: stable` on `html`; when locking scroll, compensate padding.

**Full-height hero too tall on phones / bottom cut off**
- Cause: `100vh` ignores mobile browser toolbars.
- Fix: `min-height: 100svh` (or `100dvh` when it should track toolbar changes); Tailwind `min-h-dvh`.

## 2. Layering & positioning

**`z-index: 9999` and it's still underneath**
- Confirm: probe `--selector` → ANCESTORS shows the nearest *stacking context*.
- Cause: z-index only competes within a stacking context; any ancestor with `transform`,
  `opacity < 1`, `filter`, `backdrop-filter`, `will-change`, `isolation: isolate`, `contain`,
  `mix-blend-mode`, or positioned + z-index starts a new one.
- Fix: raise the z-index of the *ancestor* that owns the context, remove the accidental context,
  or render the layer in a portal at `<body>` (dialogs, popovers, toasts). Define a z-index scale
  as tokens (base 0 · dropdown 10 · sticky 20 · overlay 40 · modal 50 · toast 60).
- Also: `z-index` on a `position: static` element does nothing (unless it's a flex/grid item) —
  probe → Z-INDEX WITH NO EFFECT.

**Button/link not clickable**
- Confirm: probe `--selector` → "X is on top at the element's centre".
- Causes: an invisible overlay (absolute pseudo-element, transparent cover, a container of an
  animation) on top; `pointer-events: none` on an ancestor; a disabled fieldset.
- Fix: `pointer-events: none` on decorative overlays, correct stacking, or move the overlay below.

**`position: sticky` doesn't stick**
- Confirm: probe → STICKY THAT CAN'T STICK.
- Causes: no `top` set; an ancestor with `overflow: hidden|auto|scroll` (it becomes the sticky
  container); parent only as tall as the element; stretched flex/grid item.
- Fix: set `top: 0`; replace the ancestor's `overflow: hidden` with `overflow: clip` (doesn't
  create a scroll container); `align-self: start` in flex/grid.

**`position: fixed` modal/header scrolls away or sits inside a card**
- Confirm: probe → FIXED ELEMENTS TRAPPED.
- Cause: an ancestor with `transform`, `filter`, `perspective`, `backdrop-filter`, `contain` or
  `will-change: transform` becomes the containing block (common with animation wrappers).
- Fix: portal to `<body>`, or remove the property from the ancestor.

**`backdrop-filter` shows no blur**
- Causes: the element's own background is opaque; nothing interesting behind it; an ancestor with
  `opacity`, `filter`, `mask` or `backdrop-filter` limits what it can see (backdrop root).
- Fix: translucent background (`oklch(1 0 0 / .12)`), move the glass element out of filtered
  ancestors; keep a solid fallback in `@supports not (backdrop-filter: blur(1px))`.

## 3. Styling pipeline

**Tailwind classes "don't work"**
- Dynamic class names (`bg-${color}-500`) are never generated → map to full strings
  (`{ red: "bg-red-500" }`) or `@source inline("bg-red-500 …")`.
- v4 scans the project automatically but skips `.gitignore`d files and `node_modules` → add
  `@source "../node_modules/@acme/ui"` for packages.
- v3 → v4 differences: JS config isn't auto-loaded (`@config "./tailwind.config.js"`), default
  border color is `currentColor`, `shadow-sm` → `shadow-xs`, `ring` → `ring-3`, important
  modifier moved to the end (`flex!`). Run `npx @tailwindcss/upgrade`.
- `dark:` ignores your toggle → v4 defaults to `prefers-color-scheme`; for class-based:
  `@custom-variant dark (&:where(.dark, .dark *));`.

**Styles differ between dev and production**
- CSS order changes with code splitting → avoid relying on source order between files; raise
  specificity deliberately or use cascade layers (`@layer`).
- Purged classes from CMS/markdown content → add the content path to `@source`.

**Focus ring missing**
- `outline: none` / `outline-none` without a replacement → `:focus-visible { outline: 2px solid
  var(--color-focus); outline-offset: 2px }`. `qa.mjs` keyboard walk flags elements without one.

## 4. Rendering & hydration

**"Hydration failed" / "Text content does not match server-rendered HTML"**
- Confirm: probe page mode → hydration line; the console names the element.
- Causes: `Date.now()`, `Math.random()`, `toLocaleString()` in render; `typeof window` branches;
  `localStorage` reads during render; invalid nesting (`<p><div>`, `<a><a>`, `<button><button>`);
  browser extensions injecting attributes; iOS auto-linking phone numbers.
- Fix: compute client-only values in `useEffect` (or a mounted flag) or render that piece
  client-only (`dynamic(..., { ssr: false })`); fix nesting; `<meta name="format-detection"
  content="telephone=no">`; `suppressHydrationWarning` only for intentional mismatches (e.g. a
  timestamp, the `<html>` class set by a theme script).

**Dark-mode flash (FOUC) on load**
- Cause: theme applied after first paint by client JS.
- Fix: tiny inline script in `<head>` that sets the class/attribute before paint (next-themes does
  this) + `suppressHydrationWarning` on `<html>`; `color-scheme` meta/CSS for native controls.

**Hooks error / "window is not defined" in Next.js**
- Component using state/effects/browser APIs lacks `"use client"`; or browser API used at module
  top level. Fix: mark the leaf component client, guard browser access in effects.

**Env var undefined in the browser**
- Must be prefixed `NEXT_PUBLIC_` (Next) / `VITE_` (Vite) / `PUBLIC_` (Astro, SvelteKit) and the
  dev server restarted. Never put secrets in public env vars.

## 5. Animation

**Content invisible until JS runs / blank page when JS fails**
- Confirm: `qa.mjs` no-JS check (`ui-test`).
- Cause: CSS sets `opacity: 0` and JS reveals it.
- Fix: default to visible; set the hidden start state from JS (`gsap.set`, Motion `initial`) or
  gate it with a class added by an inline script (`.js .reveal { opacity: 0 }`).

**GSAP ScrollTrigger positions wrong / pins jump**
- Causes: images/fonts loading after triggers were measured, content changing height, triggers
  created out of page order, `scroll-behavior: smooth` on `html`.
- Fix: `ScrollTrigger.refresh()` after images/fonts load (or `document.fonts.ready`); explicit
  image dimensions; create triggers top-to-bottom or use `refreshPriority`; function-based values
  with `invalidateOnRefresh: true`; remove CSS smooth scrolling when using ScrollTrigger. Debug
  with `markers: true`.

**GSAP animations duplicate or leak in React**
- Cause: no cleanup (Strict Mode runs effects twice in dev).
- Fix: `useGSAP(() => { … }, { scope: ref })` from `@gsap/react`; `contextSafe` for event handlers.

**Motion `AnimatePresence` exit animation never runs**
- Causes: `AnimatePresence` itself unmounts; the conditional is outside it; children lack a
  stable unique `key`; `mode="popLayout"` child doesn't forward a ref.
- Fix: keep `AnimatePresence` mounted, put the condition inside, give each child a stable `key`.

**Janky animation**
- Animating layout properties (`width`, `top`, `margin`) or big blurs/shadows on scroll → animate
  `transform`/`opacity`; animate a pseudo-element's opacity for shadow changes; check the
  Performance panel at 4× CPU throttle.

## 6. Assets & network

**Font not applied / fallback font showing**
- Confirm: probe → FONT FALLBACKS.
- Causes: wrong family name in CSS vs `@font-face`; 404 font URL; cross-origin font without
  `Access-Control-Allow-Origin`; preload without `crossorigin` (font downloads twice); next/font
  variable not applied to `<html>`/`<body>`.

**Images 404 only in production**
- Base path / asset prefix not applied (`basePath`, `base` in Vite, GitHub Pages subpaths); case-
  sensitive file names on Linux hosts; files outside `public/`.

**Works locally, fails deployed**
- Env vars missing on the host; case-sensitive imports; API URL pointing at localhost; CSP blocking
  inline scripts/styles or third-party origins (check the console for CSP errors).

## 7. State & effects (React and friends)
- **Effect runs twice in dev** — Strict Mode by design; write cleanup (AbortController for
  fetches, unsubscribe listeners). Not a production bug.
- **Stale value in a handler/interval** — closure captured old state; use the functional updater
  (`setN(n => n + 1)`) or a ref.
- **List items swap state when reordered** — index used as `key`; use a stable id.
- **Infinite render loop** — setting state during render or in an effect whose dependency it
  changes; derive values instead of syncing them into state.
- **Controlled/uncontrolled input warning** — `value` goes from `undefined` to defined; initialize
  with `""`.

## 8. Mobile
- **iOS zooms into inputs** — font-size below 16px on inputs → use ≥ 16px (don't block zoom).
- **Hover-only menus unusable on touch** — provide click/tap and keyboard paths; `@media (hover: hover)` for hover-only polish.
- **Tap targets too small** — `screenshot.mjs` reports targets < 24px; aim for 44px on touch UIs.
- **Fixed bottom bars hidden behind the home indicator** — `padding-bottom: env(safe-area-inset-bottom)` with `viewport-fit=cover`.
