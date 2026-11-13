# Page & Route Transitions

Checked November 2026. Same-document View Transitions are supported in Chrome/Edge 111+, Safari
18+ and Firefox 144+; cross-document (MPA) transitions in Chrome/Edge 126+ and Safari 18.2+
(Firefox partial). Framework integrations move fast — confirm flags against current docs.

## Contents
1. When a page transition earns its place
2. View Transitions API — same-document (SPA)
3. Cross-document transitions (MPA, static sites)
4. Framework recipes: Next.js, Astro, SvelteKit, Nuxt/Vue, React Router, plain JS
5. Patterns: crossfade, directional slide, shared element, persistent chrome, wipe
6. Library options (Motion, GSAP Flip, Swup, Barba)
7. Accessibility, performance and gotchas

## 1. When a page transition earns its place
Use one to show **continuity** (this detail page *is* that card), **direction** (forward/back in
a flow) or **persistence** (the player keeps playing). Skip it for dashboards and tools where
speed matters more than story, and never make navigation wait on an animation. Default length
200–350ms; shared-element morphs up to ~450ms.

## 2. View Transitions API — same-document (SPA)
```js
function navigate(update, { direction = "forward" } = {}) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return update();
  return document.startViewTransition({ update, types: [direction] });   // types: Chrome 125+, Safari 18.2+
}
```
```css
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 250ms; }
/* direction-aware slide using transition types */
html:active-view-transition-type(forward) {
  &::view-transition-old(root) { animation: 250ms ease-in both slide-out-left; }
  &::view-transition-new(root) { animation: 300ms cubic-bezier(.22,1,.36,1) both slide-in-right; }
}
@keyframes slide-out-left { to { translate: -8% 0; opacity: 0; } }
@keyframes slide-in-right { from { translate: 8% 0; opacity: 0; } }
```
- The browser snapshots the old state, runs your DOM update, snapshots the new state and animates
  between them with pseudo-elements: `::view-transition-group(name)`, `-old(name)`, `-new(name)`.
- `view-transition-name: hero` on one element in the old and one in the new state morphs them
  (position, size, crossfade). Names must be **unique on the page at that moment**.
- `view-transition-class: card` (Chromium 125+, Safari 18.2+) styles many named elements at once.

## 3. Cross-document transitions (MPA, static sites)
```css
@view-transition { navigation: auto; }          /* opt in on BOTH pages; same-origin navigations only */
.post-hero { view-transition-name: post-hero; } /* shared element across pages */
```
- `pageswap` (old page) and `pagereveal` (new page) events let you set names or types dynamically,
  e.g. only name the clicked card: `event.viewTransition.types.add("to-detail")`.
- No JS framework needed — ideal for Astro static output, Eleventy, plain HTML and server-rendered sites.
- Unsupported browsers simply navigate normally: progressive enhancement by default.

## 4. Framework recipes
**Astro** — built-in router with fallbacks:
```astro
---
import { ClientRouter } from "astro:transitions";   // (named ViewTransitions before Astro 5)
---
<head><ClientRouter /></head>
<img transition:name={`cover-${post.slug}`} … />     <!-- shared element -->
<audio transition:persist id="player" … />           <!-- keep playing across pages -->
<main transition:animate="slide">…</main>             <!-- fade | slide | none | custom -->
```
Or use native cross-document transitions (§3) with no client router at all.

**Next.js (App Router)** — two routes, check current docs before choosing:
- React's `<ViewTransition>` component with Next's `experimental.viewTransition` flag (React
  canary/experimental integration; verify it's stable in your versions before relying on it).
- Wrap navigations yourself: call `document.startViewTransition(() => router.push(href))` from a
  client `Link` wrapper (community package `next-view-transitions` does this), and add
  `view-transition-name` to shared elements.
- Avoid `AnimatePresence` around `{children}` in `layout.tsx` for exit animations — the App Router
  swaps segments in ways that make exit animations unreliable. Prefer View Transitions.

**SvelteKit** — wire the router into the API:
```js
// +layout.svelte (script)
import { onNavigate } from "$app/navigation";
onNavigate((navigation) => {
  if (!document.startViewTransition) return;
  return new Promise((resolve) => {
    document.startViewTransition(async () => { resolve(); await navigation.complete; });
  });
});
```

**Nuxt / Vue** — Nuxt: `experimental: { viewTransition: true }` in `nuxt.config`, or route
transitions with `<NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />` and CSS classes
`.page-enter-active` etc. Vue Router: `<RouterView v-slot="{ Component }"><Transition name="fade"
mode="out-in"><component :is="Component" /></Transition></RouterView>`.

**React Router / TanStack Router** — both offer view-transition options on navigation
(`viewTransition` prop / option); otherwise wrap `navigate()` with `startViewTransition`.

**Plain JS SPA** — call `navigate(() => renderRoute(path))` from §2 in your router; update
`history`, title and focus inside the update callback.

## 5. Patterns
| Pattern | How | Notes |
|---|---|---|
| Crossfade (default) | nothing — the root group crossfades | shorten to 200ms; often enough |
| Directional slide | transition types `forward`/`back` + keyframes (§2) | set type from history direction (popstate = back) |
| Shared element (card → detail) | same `view-transition-name` on card image and detail hero; name only the clicked card | `object-fit` mismatch → add `::view-transition-old(x){ object-fit: cover }` |
| Persistent chrome (header, player) | `view-transition-name: site-header` so it isn't part of the root crossfade; Astro `transition:persist` | keeps the frame steady while content changes |
| Wipe / reveal | `::view-transition-new(root) { animation: wipe 500ms; } @keyframes wipe { from { clip-path: inset(0 100% 0 0) } }` | expressive sites only |
| List → reorder / filter | named items + `view-transition-class` | or Motion `layout` / GSAP Flip in-page |

## 6. Library options
- **Motion**: `animateView()` (wraps View Transitions with springs, in `motion` and
  `motion/react-animate-view`); `AnimatePresence` + `layoutId` for in-app shared elements.
- **GSAP Flip**: in-page layout morphs (grid ↔ detail) without route changes; free plugin.
- **Swup** (maintained, plugin ecosystem) or **Barba.js** (check maintenance) for classic MPAs
  that want JS-driven transitions with page caching — today, native cross-document transitions
  cover most of these needs with zero JS.

## 7. Accessibility, performance and gotchas
- **Reduced motion:** skip the transition (`startViewTransition` not called) or neutralize it:
  `@media (prefers-reduced-motion: reduce) { ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; } }`.
- **Focus and announcements:** after a client-side navigation, move focus to the new page's `h1`
  (or a skip target) and update `document.title`; frameworks with routers usually announce route
  changes — verify with a screen reader.
- **Never block navigation:** the update callback must not wait on network data you could render
  progressively; long waits freeze the old snapshot on screen.
- **Unique names:** two elements with the same `view-transition-name` → the transition is skipped
  (console warning). Generate names from ids (`cover-${slug}`).
- **Stacking & clipping:** snapshots render in a top layer — content clipped by `overflow: hidden`
  ancestors can pop outside during the morph; give the group `overflow: clip` or name the container.
- **Cost:** snapshots are images; huge full-page morphs on low-end phones can drop frames — keep
  named elements few, durations short, and test at 4× CPU throttle.
- **Scroll position:** browsers restore scroll on back/forward; for custom routers, set scroll
  inside the update callback so the new snapshot is taken at the right position.
