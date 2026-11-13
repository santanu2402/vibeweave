---
name: ui-optimize
description: Measure and fix frontend performance: Core Web Vitals (LCP, CLS, INP via TBT), the LCP element, layout-shift sources, long-task scripts, page weight and bundle contents; fix images, fonts, JavaScript, CSS and animation cost, and prove before → after. Use for slow pages, Lighthouse or PageSpeed scores, bundle size, jank or layout shift.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# UI Optimize — the performance engineer

Performance work without measurement is superstition. Measure, change one thing, measure again,
keep what helped. And keep the design intact: a fast page that lost its signature moment is a
regression too — propose trade-offs, don't impose them.

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Budget (unless REQUIREMENTS.md says otherwise)

| Metric | Good | Poor | Measured by |
|---|---|---|---|
| LCP | ≤ 2.5s | > 4s | `vitals.mjs` (lab), CrUX/RUM (field, 75th percentile) |
| INP | ≤ 200ms | > 500ms | field only; lab proxy = TBT ≤ 200ms |
| CLS | ≤ 0.1 | > 0.25 | `vitals.mjs` (load + after scroll) |
| JS (first load, marketing page) | ≤ 200KB gzip | — | `bundle.mjs`, framework build output |
| Fonts | ≤ 2 families, WOFF2, subset | — | `vitals.mjs`, `bundle.mjs` |

## Workflow

### 1. Baseline — on a production build
Dev servers are unoptimized; never judge performance there. Build and serve production
(`next build && next start`, `vite build && vite preview`, `astro build && astro preview`…), then:
```bash
node <skill-dir>/scripts/vitals.mjs http://localhost:3000            # mobile: 4× CPU, slow 4G, median of 3
node <skill-dir>/scripts/vitals.mjs http://localhost:3000 --desktop
node <skill-dir>/scripts/bundle.mjs                                   # auto-detects .next/static, dist, build, out…
```
- Whole-site pass with vitals in context: `npx vibeweave check <url> --pages /a,/b` (wiring, qa, responsive and
  mobile vitals, sequential so timings stay trustworthy → `.design-review/SCORECARD.md`).
- `vitals.mjs` reports LCP (and which element), CLS (and what shifted, during load and while
  scrolling), TBT, FCP, TTFB, long tasks before first paint, the scripts behind slow frames (Long
  Animation Frames), page weight by type, third parties, render-blocking resources, and
  opportunities: lazy-loaded LCP image, missing `fetchpriority`, oversized and eager offscreen
  images, too many fonts. Saves `.design-review/vitals.json`.
- `bundle.mjs` reports JS/CSS/image/font/media weight with gzip and brotli, the largest files,
  heavy libraries detected inside chunks (three.js, lottie-web, GSAP, Motion, moment, full
  lodash, chart libs, icon packs…), legacy font formats, big GIFs and models.
- Both need nothing but Node; `vitals.mjs` needs Playwright resolvable from the project (ask
  before installing) — or use `npx lighthouse <url> --only-categories=performance` (Lighthouse 13,
  Node 22+) or a Chrome DevTools MCP performance trace (`performance_start_trace`,
  `performance_analyze_insight`).
- Write the baseline into `.design-review/PERF-REPORT.md` before changing anything.

### 2. Diagnose — pick the biggest measured miss
Work the metric that fails the budget by the widest margin. Use the playbook for causes and fixes:
[references/playbook.md](references/playbook.md). Typical order of payoff:
1. LCP resource: lazy/late/oversized hero image, hero hidden behind an entrance animation, LCP
   text waiting on a web font or client-side rendering.
2. Layout shift: media without dimensions, late banners/embeds, font swaps without metric overrides.
3. Main-thread work: big hydration bundles, 3D/Lottie/charts on the critical path, synchronous
   third parties, expensive scroll handlers.
4. Weight: images first, then JS, then fonts, then CSS.

### 3. Fix — one change at a time
- Prefer framework primitives: `next/image` (with `preload` / `fetchPriority="high"` for the LCP
  image in Next 16; `priority` before), `next/font` or Fontsource with `size-adjust` fallbacks,
  Astro `<Image>`, `@nuxt/image`, route-level code splitting, server components.
- Lazy-load the heavy and the below-the-fold: `dynamic(() => import(...), { ssr: false })`,
  `React.lazy`, `import()` on `IntersectionObserver`, poster images for 3D/video/Lottie.
- Keep the motion, cut its cost: animate transform/opacity, pause offscreen loops, LazyMotion,
  register only the GSAP plugins used, `frameloop="demand"` in R3F.
- Don't break things to win points: no removing alt text, focus styles or reduced-motion paths;
  no hiding content from users to dodge LCP.

### 4. Verify
Re-run the same commands with the same profile; numbers vary run to run, so compare medians.
Check the visuals didn't change (`screenshot.mjs` from `ui-test` / `frontend-forge`, or eyeball).
Keep a change only if it moved its metric; revert it otherwise.

### 5. Report
```markdown
# Performance Report — <url> · <profile>
| Metric | Budget | Before | After | Status |
|---|---|---|---|---|
| LCP | ≤ 2.5s | 4.8s | 2.1s | ✅ |
| CLS | ≤ 0.1 | 0.19 | 0.02 | ✅ |
| TBT | ≤ 200ms | 640ms | 180ms | ✅ |
| JS (gzip) | ≤ 200KB | 412KB | 168KB | ✅ |
## Changes (each with its measured effect)
1. PERF-001 Hero image: removed loading="lazy", added fetchPriority="high", AVIF at 1280w → LCP −2.1s
2. PERF-002 three.js scene lazy-loaded behind a poster when in view → JS −190KB, TBT −380ms
## Remaining opportunities (ranked) · ## Not measured (field data, real devices)
```
End with a status line: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT` or `BLOCKED`.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/vitals.mjs <url> [--runs 3] [--desktop] [--no-throttle] [--json]` | lab Core Web Vitals + LCP element, CLS sources, TBT, long tasks, script culprits, weight, third parties, opportunities |
| `scripts/bundle.mjs [dir] [--top 15] [--budget-js 200] [--budget-css 60] [--strict] [--json]` | build-output weight by type with gzip/brotli, largest files, heavy-library detection, flags |
