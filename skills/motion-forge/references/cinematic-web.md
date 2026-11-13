# Cinematic web — After-Effects-style sites

Award-site "videography" is film language translated to the browser: shots, camera moves, compositing,
match cuts, grading and sound-free storytelling. Use it for one story on a launch, portfolio or campaign —
never at the cost of speed, readability or accessibility.

## Contents
1. Plan it like a film: shot list
2. Camera moves in the browser
3. Compositing: layers, blend modes, masks, grading, grain
4. Video on the web: hero loops, scrubbing, frame sequences, transparency
5. Transitions that feel edited (cuts, match cuts, wipes)
6. Type in motion
7. Tooling map (After Effects → web)
8. Performance & accessibility guardrails

## 1. Plan it like a film: shot list
Write the sequence before building — it's the storyboard for scroll:

| Shot | Scroll range | Frame (what's on screen) | Camera / motion | Text | Fallback (reduced motion) |
|---|---|---|---|---|---|
| 1 Establish | 0–15% | kiln exterior, dawn light | slow push-in (scale 1 → 1.08) | "Every piece starts cold." | still frame + text |
| 2 Detail | 15–45% | hands on the wheel | pan right, parallax foreground clay | 3 short lines, staggered | still + all lines |
| 3 Reveal | 45–80% | product turns 180° | scrubbed frame sequence | spec callouts at keypoints | poster + callout list |
| 4 Resolve | 80–100% | product on plinth, CTA | settle, light sweep | CTA | same |

Each shot needs one idea, one motion, and a **keypoint** where it reads perfectly as a still.

## 2. Camera moves in the browser
| Film move | Web technique |
|---|---|
| Push-in / pull-out (dolly) | `scale` 1 → 1.05–1.15 on a scroll timeline; or R3F camera `position.z` |
| Pan / truck | `translate` of a wide layer; horizontal pinned section (`scroll-reveal.md` §3) |
| Parallax (multi-plane) | layers moving at `scroll × (1 − depth)` (realism.md §4) |
| Rack focus | animate `filter: blur()` on background vs foreground (small areas only) |
| Orbit | frame sequence or R3F `OrbitControls`-free scripted camera on scroll |
| Whip pan | 150–250ms translate + motion blur (directional blur via SVG `feGaussianBlur stdDeviation="20 0"`) |
Drive them with GSAP ScrollTrigger (`scrub: 0.5–1` for weight) or CSS `animation-timeline: view()/scroll()`.

## 3. Compositing: layers, blend modes, masks, grading, grain
- **Layers:** background plate (image/video) · midground subject · foreground elements · type · UI. Keep each
  a separate element so it can move at its own depth.
- **Blend modes** (`mix-blend-mode`): `screen` for light leaks and glows over dark footage, `multiply` for
  shadows/paper textures, `overlay`/`soft-light` for grading and glare, `difference` for cursor/type inversions.
  Use `isolation: isolate` on the container so blends don't leak into the page.
- **Masks:** shape reveals, text windows, wipes (realism.md §5).
- **Color grading (CSS filters on media):** teal-orange or warm film look with
  `filter: contrast(1.08) saturate(1.1) sepia(.08) hue-rotate(-4deg)`; a gradient overlay in `soft-light` for
  split toning; vignette with `radial-gradient(transparent 55%, oklch(0 0 0 / .45))`. Grade the asset itself when
  you can (cheaper than live filters).
- **Film grain:** an animated noise layer (SVG `feTurbulence` tile shifted with `steps()` keyframes, 3–6% opacity)
  — static grain is fine too; animated grain must stop under reduced motion.
- **Light leaks / lens flares:** soft radial gradients in `screen`, drifting slowly; one or two, not ten.

## 4. Video on the web
- **Hero loop:** `<video autoplay muted loop playsinline preload="metadata" poster="/hero.avif">` with MP4 (H.264)
  + WebM (VP9/AV1) sources, 1080p max, 4–8s, 1–3MB; a visible pause button (moves > 5s); poster = LCP; pause
  when offscreen (IntersectionObserver) and under reduced motion (show the poster).
- **Scroll scrubbing / frame sequences:** frontend-forge `assets/patterns/scroll-video.md` (encode every frame
  as a keyframe for scrubbing; or 60–150 WebP frames on a canvas).
- **Transparent video** (product cut-outs over the page): WebM VP9 with alpha for Chromium/Firefox + HEVC with
  alpha (`.mov`/`.mp4`, `hvc1`) for Safari, chosen by `<source type>`; or a Lottie/Rive/3D alternative.
- **Captions** for anything with speech (`<track kind="captions">`); no autoplaying sound, ever.

## 5. Transitions that feel edited
- **Hard cut:** instant swap at a keypoint — surprisingly effective when the frames are strong.
- **Match cut:** a shape or element in shot A becomes the same shape in shot B — on the web, a shared element
  (View Transitions `view-transition-name`, GSAP Flip, Motion `layoutId`). See `page-transitions.md`.
- **Wipe / iris:** animated `clip-path` (inset/circle) on the incoming layer.
- **Crossfade with scale:** outgoing 1 → 1.04 + fade, incoming 0.96 → 1 — the "breathing" cut.
- **Dip to color:** brief brand-color overlay between chapters (100–200ms).

## 6. Type in motion
Line-by-line mask reveals (GSAP SplitText `mask: "lines"`), oversized type moving at a different depth from
imagery, variable-font weight scrubbed with scroll, outlined → filled transitions, words swapping at keypoints.
Always keep a real, static text node for SEO and screen readers. Details: `motion-graphics.md` §4.

## 7. Tooling map (After Effects → web)
| In AE you'd… | On the web use |
|---|---|
| Animate shape layers, icons, illustrations | Lottie/dotLottie (export via Bodymovin/LottieFiles plugin) or Rive (interactive) |
| Composite footage + type | `<video>` + DOM layers + blend modes; or render the final film and scrub it |
| Camera + 3D layers | CSS 3D transforms for planes; React Three Fiber for real 3D |
| Expressions (wiggle, loops) | noise functions, `repeat: -1` GSAP tweens, CSS keyframes |
| Graph editor easing | `cubic-bezier()`, CSS `linear()` from springs (realism.md §3), GSAP CustomEase (free) |
| Render a promo video | Remotion (React → MP4; company license above 3 employees) or AE itself |

## 8. Performance & accessibility guardrails
- Budget: the cinematic section may add at most ~1–2MB *after* first paint; nothing in it blocks LCP.
- Load heavy media when the section approaches the viewport; pause everything offscreen and in hidden tabs.
- Animate transform/opacity/clip-path/filter on few, small layers; test at 4× CPU throttle and on a mid-range phone.
- Reduced motion: every shot has a still keyframe and text; no scroll-jacking; video doesn't autoplay.
- Keep pinned/scrubbed sequences short (≤ 3–4 viewport heights) and never trap keyboard users; provide a
  "skip intro" link for long sequences.
