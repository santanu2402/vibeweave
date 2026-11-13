# Optimization Playbook — symptom → cause → fix

Checked November 2026 (Next.js 16, React 19 + React Compiler 1.0, Vite, Astro, Lighthouse 13).
Each fix names how to confirm it worked.

## Contents
1. LCP
2. CLS
3. INP / TBT (main-thread work)
4. Images and media
5. Fonts
6. JavaScript and bundles
7. CSS
8. Animation, 3D, Lottie cost
9. Network, caching, third parties
10. Framework specifics
11. Tools

## 1. LCP (largest contentful paint)
| Symptom (vitals.mjs) | Cause | Fix |
|---|---|---|
| LCP image has `loading="lazy"` | lazy defers the hero | remove it; `fetchpriority="high"`; Next 16 `preload` (or `priority` < 16) |
| LCP ≫ FCP, LCP element is text | hero hidden by an entrance animation (opacity 0 until JS), or web font blocking | render the hero visible; animate from a visible state or only secondary elements; `font-display: swap` + metric-matched fallback |
| LCP ≫ FCP, LCP is an image | discovered late (CSS background, JS-inserted, carousel) | real `<img>` in the HTML; `<link rel="preload" as="image" imagesrcset … fetchpriority="high">` |
| High TTFB | server rendering on every request, no CDN | static generation / ISR, caching headers, edge/CDN |
| Long tasks before first paint | blocking scripts in `<head>`, big hydration | `defer`/`async`, move scripts after content, split the bundle, server components |
| "forced style/layout before first paint" (vitals.mjs) | a startup script reads layout — `scrollHeight`, `getBoundingClientRect`, `offsetWidth`, `getComputedStyle`, **`document.fonts.ready`** — so the browser lays out the whole page synchronously inside the script | move every startup read into `requestAnimationFrame(() => setTimeout(fn))`; sort elements by DOM order (`compareDocumentPosition`), not by position; load motion libraries (GSAP, Lenis) after the first frame with a dynamic `import()` |
| Entrance curtain / intro overlay | the page is painted but hidden, so FCP and LCP wait for the animation | no full-screen intro on every visit; animate the headline in from a visible state |
| Render-blocking CSS/fonts | large global CSS, third-party font CSS | inline critical CSS, self-host fonts, purge unused CSS |
Confirm: `vitals.mjs` LCP element + time; Chrome DevTools "LCP breakdown" insight (TTFB → load delay → load time → render delay) tells you which phase to attack.

## 2. CLS (layout shift)
| Cause | Fix |
|---|---|
| images/video/iframes without size | `width`/`height` attributes or `aspect-ratio`; framework image components do this |
| late banners, cookie bars, ads, embeds pushing content | reserve space (`min-height`), overlay instead of push, or render server-side |
| web font swap changes metrics | `size-adjust`/`ascent-override` fallback (next/font does it; fontaine or Capsize elsewhere); `font-display: optional` for body text if acceptable |
| content injected above existing content after load | insert below, or animate with `transform` from a reserved slot |
| animating `top/left/width/height/margin` | animate `transform`/`opacity` (layout animations count as shifts) |
| skeleton height ≠ real content height | match skeleton dimensions to the loaded layout |
Confirm: `vitals.mjs` CLS sources (load) and "after scrolling" value.

## 3. INP / TBT (main-thread work)
- Split long tasks: yield with `await scheduler.yield()` (fallback `setTimeout(0)`) inside loops;
  move heavy computation to a Web Worker.
- Reduce hydration: server components / islands (Astro, Next RSC), `"use client"` only on leaves
  that need it, lazy-hydrate below-the-fold widgets.
- React: enable the React Compiler (stable 1.0; Next 16 `reactCompiler: true`) instead of hand
  `useMemo`; virtualize long lists (TanStack Virtual); `useTransition`/`useDeferredValue` for
  expensive updates; avoid context values that change every render.
- Event handlers: do the visible update first, defer analytics and non-urgent work.
- Scroll: no layout reads in `scroll` listeners — CSS scroll-driven animations, IntersectionObserver
  or ScrollTrigger; `passive: true` listeners.
- Find culprits: `vitals.mjs` "scripts behind the slow frames" (Long Animation Frames), React
  DevTools profiler, `npx -y react-scan@latest init` (React Scan) or React Doctor for agents.

## 4. Images and media
- Formats: AVIF first, WebP fallback (Next 16: `images.formats: ['image/avif','image/webp']`;
  AVIF ≈ 20% smaller, slower to encode). SVG for logos/icons (run SVGO).
- Size to display: `srcset` + `sizes`; never ship a 3000px image into a 600px slot.
- `loading="lazy"` + `decoding="async"` below the fold; never on the LCP image.
- Animated GIF → muted looping `<video autoplay muted loop playsinline>` (MP4/WebM), with a poster.
- Hero video: poster image as LCP, `preload="none"` or `metadata`, compressed ≤ 2–3 MB, pause offscreen.
- Next 16: `images.qualities` must list the qualities you use (default `[75]`).

## 5. Fonts
- ≤ 2 families; prefer one variable font over many static weights; WOFF2 only; subset to the
  scripts you need (latin, latin-ext).
- Self-host (next/font, Fontsource, Astro fonts) — no third-party CSS on the critical path.
- Preload only the font used above the fold, with `crossorigin` (fonts are CORS requests even
  same-origin).
- Metric-matched fallbacks to kill swap shift: next/font `adjustFontFallback` (default on),
  fontaine (`FontaineTransform.vite({ fallbacks: [...] })`) or Capsize `createFontStack`.
- A late, un-preloaded web font re-shapes every text node when it swaps in — on a mid-range phone a monospace
  font with heavy ligature tables cost ~2 s of layout. For code and labels, the system monospace stack
  (`ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace`) costs nothing and reads well.
  Diagnose: a trace shows `InlineNode::ShapeTextIncludingFirstLine` dominating the layout right after
  `BeginRemoteFontLoad`; confirm by swapping the font for a system one and re-measuring.

## 6. JavaScript and bundles
- Find weight: `bundle.mjs`; Next 16 `npx next experimental-analyze` (Turbopack) or
  `@next/bundle-analyzer` with `next build --webpack`; Vite `rollup-plugin-visualizer` or
  `npx vite-bundle-visualizer`; any build with source maps: `npx source-map-explorer 'dist/**/*.js'`.
- Remove dead weight: `npx knip` (unused files, exports, dependencies).
- Code-split by route (default in Next/Nuxt/SvelteKit/Astro) and by interaction (`import()` on
  click/hover/in-view for modals, editors, maps, charts, 3D).
- Swap heavy deps: moment → `Intl.DateTimeFormat`/date-fns; full lodash → per-method or native;
  icon packs → per-icon imports or generated components (`frontend-forge/scripts/icons.mjs`).
- Motion: `LazyMotion` + `m` components with `domAnimation` features; GSAP: import core +
  only the plugins used, register once.
- Ship modern JS: no legacy polyfills for evergreen-only audiences (check browserslist).

## 7. CSS
- Tailwind v4 only generates used classes; check `@source` isn't pulling in huge folders.
- Remove unused global CSS and duplicate resets; avoid `@import` chains.
- `content-visibility: auto` + `contain-intrinsic-size` for long below-the-fold sections.
- Avoid large `backdrop-filter`/`filter: blur()` areas, especially on scroll containers.

## 8. Animation, 3D, Lottie cost
- Compositor-only properties (transform, opacity); `will-change` only while animating.
- 3D: lazy-load the canvas when near the viewport, poster first, `dpr={[1, 2]}`, `frameloop="demand"`
  where possible, compress models (gltf-transform: Draco/Meshopt + KTX2), cap texture sizes, pause
  when offscreen or the tab is hidden.
- Lottie: dotLottie (`.lottie`, compressed) with `@lottiefiles/dotlottie-web`; `DotLottieWorker`
  renders off the main thread; don't autoplay offscreen; prefer CSS/SVG for tiny icon animations.
- Rive: `@rive-app/canvas-lite` when you don't need the full renderer; one shared runtime.
- Reduced motion is also a performance win on low-end devices — honor it.

## 9. Network, caching, third parties
- Long-cache hashed assets (`Cache-Control: public, max-age=31536000, immutable`); revalidate HTML.
- Compression: brotli for text assets (most hosts do it — verify the `content-encoding` header).
- `preconnect` only to origins needed in the first seconds (≤ 2–3).
- Third-party scripts (chat, analytics, A/B, tag managers): load after interaction or idle,
  `async`/`defer`, Partytown or the framework's script strategy (`next/script` `lazyOnload`).
  `vitals.mjs` lists third-party weight by host.

## 10. Framework specifics
- **Next.js 16**: server components by default; `"use client"` at the leaves; `next/image`,
  `next/font`; `dynamic()` for client-only heavy widgets; static where possible; check the route
  table in `next build` output for First Load JS.
- **Vite/React SPA**: route-level `lazy()`; consider prerendering marketing routes; `vite preview` for measurement.
- **Astro**: zero JS by default — keep islands minimal (`client:visible`, `client:idle`).
- **Nuxt / SvelteKit**: lazy components (`Lazy` prefix / dynamic import), `@nuxt/image`, prerender static routes.

## 11. Tools
`vitals.mjs` · `bundle.mjs` · Lighthouse 13 (`npx lighthouse <url> --preset=desktop
--only-categories=performance --output=json`) · Unlighthouse (`npx unlighthouse --site <url>`,
whole-site scan) · Lighthouse CI (`lhci autorun`) · Chrome DevTools MCP performance traces ·
PageSpeed Insights / CrUX for field data · WebPageTest for filmstrips on real devices.
