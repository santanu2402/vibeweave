# Vibeweave Pattern Library

Original, MIT-licensed implementations of the effects people most often copy from component sites —
written from scratch, using design tokens, accessible, reduced-motion safe and lightweight. They're
**techniques, not looks**: re-skin every one through the project's own tokens, and use at most one or two
signature patterns per site so builds don't converge on the same effects. Read only
the pattern you need (each file is self-contained). Restyle through the project's tokens
(`--color-*`, `--radius-*`, `--dur-*`, `--ease-*`); the defaults below are placeholders.

| Pattern | What it does | Stack | File |
|---|---|---|---|
| Spotlight card | soft highlight follows the pointer over a card | CSS + tiny React handler | [spotlight-card.md](spotlight-card.md) |
| Marquee | infinite logo/testimonial strip with a Pause button, static without JS | CSS + tiny JS toggle | [marquee.md](marquee.md) |
| Shimmer button | sheen sweeps across a CTA on hover/focus | CSS | [shimmer-button.md](shimmer-button.md) |
| Border beam | light travels around a card's border | CSS `@property` | [border-beam.md](border-beam.md) |
| Aurora background | slow drifting color field behind a hero | CSS | [aurora-background.md](aurora-background.md) |
| Scroll reveal | below-the-fold content rises in as it enters the viewport, visible without JS | CSS scroll-driven | [scroll-reveal.md](scroll-reveal.md) |
| Number ticker | counts up to a value when seen | React | [number-ticker.md](number-ticker.md) |
| Magnetic button | button leans toward the pointer | React | [magnetic-button.md](magnetic-button.md) |
| Tilt card | card tilts in 3D with the pointer | React + CSS | [tilt-card.md](tilt-card.md) |
| Bento grid | responsive tiles of different sizes | CSS grid / Tailwind | [bento-grid.md](bento-grid.md) |
| Glass nav | sticky header that turns frosted on scroll | CSS + IntersectionObserver | [glass-nav.md](glass-nav.md) |
| Scroll progress | reading-progress bar | CSS scroll timeline (+ fallback) | [scroll-progress.md](scroll-progress.md) |
| Animated tabs | accessible tabs with a sliding indicator | React + Motion | [animated-tabs.md](animated-tabs.md) |
| Typewriter | types and rotates a few words, accessibly | React (no GPL deps) | [typewriter.md](typewriter.md) |
| Skeleton loader | layout-matching loading placeholders | CSS | [skeleton.md](skeleton.md) |
| Custom cursor | branded dot + ring that reacts to links, fine pointers only | CSS + vanilla JS | [custom-cursor.md](custom-cursor.md) |
| Custom scrollbar | themed scrollbars + snap carousels, without hiding them | CSS | [custom-scrollbar.md](custom-scrollbar.md) |
| Scroll-scrubbed video / frame sequence | product spins or assembles as you scroll (cinematic) | ffmpeg + canvas/video JS | [scroll-video.md](scroll-video.md) |
| Realistic shadows | layered, hue-tinted, light-direction-aware elevation | CSS | [realistic-shadows.md](realistic-shadows.md) |
| Real lighting | pointer-following specular light, SVG lighting filters, materials | CSS + SVG filters | [lighting.md](lighting.md) |
| Toast | accessible, dependency-free notifications with pause, actions, F8 | CSS + vanilla JS | [toast.md](toast.md) |
| Loading bar | top route/fetch progress that trickles and completes | CSS + vanilla JS | [loading-bar.md](loading-bar.md) |
| Progress | determinate, indeterminate and step indicators, uploads | HTML + CSS | [progress.md](progress.md) |

## Pattern card format (use it for new patterns)
Every pattern file has the same sections so any agent in any IDE can apply it without extra context:
1. **What / use for / avoid when** — one line each.
2. **Accessibility** — keyboard, screen reader, reduced motion (no movement, no delays), contrast; content
   visible without JS; a pause control for anything that loops > 5s; never on first-screen / LCP content.
3. **Performance** — what it animates and its cost.
4. **Code** — framework-agnostic CSS first, then the React/Tailwind version where JS is needed.
5. **Tokens it uses** and **variations**.

When you study an effect from another site (see the `visual-dna` skill's clean-room steps), save your
own implementation here in this format — never the site's source, markup or naming.
