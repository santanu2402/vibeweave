# Accessibility, Performance & SEO

Beautiful and broken is still broken. These are the checks a senior reviewer runs.

## Accessibility (WCAG 2.2 AA essentials)

**Perceivable**
- Text contrast ≥ 4.5:1 (large ≥ 3:1); UI boundaries, icons, focus rings ≥ 3:1 (1.4.3, 1.4.11).
- Every meaningful image has `alt`; decorative images `alt=""`; complex charts get a text summary.
- Information not conveyed by color alone (1.4.1) — add icons, text, patterns.
- Content reflows at 320px wide and survives 200% zoom and 1.5× line-height / 2× letter-spacing
  text-spacing overrides (1.4.4, 1.4.10, 1.4.12).
- Video: captions; audio: transcript; no autoplaying sound.

**Operable**
- Everything works with keyboard alone; logical tab order; no keyboard traps (2.1.1, 2.4.3).
- Visible focus indicator on every focusable element (2.4.7) that isn't hidden behind sticky
  headers or overlays (2.4.11 Focus Not Obscured).
- Target size ≥ 24×24 CSS px or sufficient spacing (2.5.8); 44px+ recommended on touch.
- "Skip to main content" link; descriptive page `<title>`; link text that makes sense out of context.
- Motion: honor `prefers-reduced-motion`; nothing flashes > 3 times/second (2.3.1);
  auto-moving content (carousels, marquees) > 5s needs a pause control (2.2.2).
- Drag interactions have a single-pointer alternative (2.5.7).

**Understandable**
- `<html lang="…">`; labels and instructions for inputs; errors identified in text with suggestions
  (3.3.1, 3.3.3); consistent navigation; no unexpected context changes on focus/input.
- Don't make users re-enter info already provided in the same flow (3.3.7); allow paste and
  password managers in auth (3.3.8).

**Robust**
- Semantic HTML before ARIA. ARIA rule #1: don't use ARIA when a native element exists.
- Correct names/roles/states on custom widgets (`aria-expanded`, `aria-controls`, `aria-selected`,
  `aria-current`); live regions for async updates (`role="status"`, `aria-live="polite"`).
- Headings form an outline (one `h1`, no skipped levels); landmarks (`header nav main aside footer`).

**Reduced motion pattern**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```
Better: design a reduced variant (cross-fade instead of slide) rather than killing everything.

**Tools**: axe DevTools / `@axe-core/playwright`, Lighthouse, WAVE, keyboard-only walkthrough,
VoiceOver (macOS/iOS) or NVDA (Windows) for one real pass.

## Performance (Core Web Vitals)

Targets (75th percentile): **LCP < 2.5s · INP < 200ms · CLS < 0.1**.

**LCP (largest contentful paint)**
- Hero image: correct size, modern format (AVIF/WebP), `fetchpriority="high"`, never lazy-loaded,
  preloaded if discovered late (CSS backgrounds).
- Hero text must not wait for JS or animation to become visible. Entrance animations should start
  from a visible-enough state or run within ~300ms.
- Self-host fonts, preload the 1–2 critical files, `font-display: swap`.
- Server-render above-the-fold content.

**CLS (layout shift)**
- `width`/`height` or `aspect-ratio` on all media and embeds; reserve space for ads/banners/consent.
- Metric-matched font fallbacks (`size-adjust`) or `next/font`.
- Skeletons sized like final content; never insert content above existing content.

**INP (responsiveness)**
- Keep main-thread tasks < 50ms; split long work; defer non-critical JS; avoid heavy hydration
  for static sections (islands, Server Components).
- Animate only `transform`/`opacity`; avoid layout thrash (read then write); use `content-visibility: auto`
  for long off-screen sections.
- Debounce scroll/resize handlers or use `IntersectionObserver` / scroll-driven CSS.

**Weight budget (marketing page, rough)**: JS < 200KB gz, total < 1.5MB on first load,
≤ 3 font files, hero image < 200KB. 3D/video: lazy-load after first paint, poster images,
`preload="none"` for below-fold video.

**Images**: `<img srcset sizes>` or framework image components; `loading="lazy"` + `decoding="async"`
below the fold; SVG for icons/illustrations (optimized with SVGO).

## SEO & sharing basics

- Unique `<title>` (≤ 60 chars) and meta description (≤ 155) per page.
- One `h1` matching intent; descriptive headings; meaningful link text.
- Open Graph + Twitter card tags with a designed 1200×630 OG image.
- Canonical URLs, `sitemap.xml`, `robots.txt`; structured data (JSON-LD) for products, articles,
  FAQs, organizations.
- Fast, mobile-friendly, accessible pages rank better — the above sections *are* SEO.
- Favicon set: SVG favicon + 180px apple-touch-icon + web manifest; `theme-color` meta.
