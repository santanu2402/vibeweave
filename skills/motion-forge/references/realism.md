# Realism: math, physics, masking, shadows & light, keyframes

What makes motion and surfaces feel *real* is physics and consistency, not more effects. This file gives
the formulas and the copy-paste helpers. Pattern implementations live in frontend-forge
`assets/patterns/` (realistic-shadows, lighting, tilt-card, magnetic-button, scroll-video).

## Contents
1. Motion math toolkit (lerp, remap, frame-rate-independent smoothing, easing)
2. Physics: springs, inertia, gravity & bounce, noise
3. Springs in pure CSS — generate `linear()` from a spring
4. Depth: parallax, perspective, z-ordering
5. Masking & clipping
6. Shadows & light — the rules
7. Keyframes, key poses and scroll keypoints
8. Realism checklist

## 1. Motion math toolkit
```js
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;                        // blend a→b by t (0..1)
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));            // where v sits between a and b
export const remap = (v, a1, b1, a2, b2) => lerp(a2, b2, invLerp(a1, b1, v)); // e.g. scroll px → opacity
// Frame-rate-independent smoothing (use instead of x += (t - x) * 0.1, which runs faster at 120Hz):
export const damp = (x, target, lambda, dt) => lerp(x, target, 1 - Math.exp(-lambda * dt)); // lambda ≈ 8–20, dt in seconds
// Easing curves (t in 0..1)
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
// Pointer → angle and distance (lighting, tilt, magnetic effects)
export const angleTo = (cx, cy, x, y) => Math.atan2(y - cy, x - cx);     // radians; * 180 / Math.PI for degrees
```
Rules: entrances ease **out**, exits ease **in**, moves between two on-screen points ease **in-out**; never
`linear` for spatial motion (only for continuous loops like marquees and rotation).

## 2. Physics
**Spring (damped harmonic oscillator)** — the most natural UI motion; responds to interruption gracefully.
```js
// stiffness k, damping c, mass m. Critical damping c = 2·√(k·m) → no overshoot; lower c → bounce.
export function springStep(state, target, { k = 170, c = 26, m = 1 } = {}, dt = 1 / 60) {
  const force = -k * (state.x - target) - c * state.v;     // Hooke's law + friction
  state.v += (force / m) * dt;                              // semi-implicit Euler (stable for UI)
  state.x += state.v * dt;
  return Math.abs(state.v) < 0.01 && Math.abs(state.x - target) < 0.01;   // settled?
}
```
Damping ratio ζ = c / (2√(km)): **ζ ≈ 1** for UI that must feel solid (menus, toggles), **0.6–0.8** for
playful/expressive (cards, buttons), never below 0.4 (wobbly, nauseating). Motion: `transition={{ type: "spring",
stiffness: 300, damping: 30 }}` or `{ bounce: 0.2, duration: 0.5 }`; GSAP: `ease: "elastic.out(1, 0.5)"` (sparingly).

**Inertia / momentum (flick, drag release):** keep velocity from the last pointer moves, then decay it:
`v *= Math.pow(friction, dt * 60)` (friction 0.92–0.96) until |v| is tiny; snap to the nearest item at the end
(GSAP InertiaPlugin is free and does this with snapping).

**Gravity & bounce:** `v += g * dt; y += v * dt; if (y > floor) { y = floor; v = -v * e }` with restitution
e = 0.3–0.6 (rubber ~0.8 feels toy-like). Squash on impact (scaleY 0.9, scaleX 1.1 for ~80ms), keeping volume.

**Organic motion:** replace `Math.random()` jitter with smooth noise (simplex/Perlin — e.g. the tiny
`simplex-noise` package, MIT) sampled over time: `x = noise(t * 0.3) * amplitude`. Random per frame = flicker;
noise over time = drift, breathing, floating.

## 3. Springs in pure CSS — generate `linear()` from a spring
`linear()` easing (Baseline since 2023) can encode any curve, so a real spring can run as a CSS transition
with no JS at runtime. Generate once, paste as a token:
```js
export function springToLinear({ k = 170, c = 18, m = 1, samples = 40, duration = 0.8 } = {}) {
  const pts = []; const s = { x: 0, v: 0 }; const dt = duration / samples;
  for (let i = 0; i <= samples; i++) { pts.push(+s.x.toFixed(3)); for (let j = 0; j < 10; j++) springStep(s, 1, { k, c, m }, dt / 10); }
  pts[pts.length - 1] = 1;              // land exactly on the target (pick a duration long enough to settle)
  return `linear(${pts.join(", ")})`;   // use with transition-duration: `${duration}s`
}
// → :root { --ease-spring: linear(0, 0.106, 0.333, …, 1.042, 1.012, 1); --dur-spring: 800ms; }
```
Use it for hover lifts, toggles, popovers: `transition: transform var(--dur-spring) var(--ease-spring);`.

## 4. Depth: parallax, perspective, z-ordering
- **Parallax speed by depth:** a layer at depth `d` (0 = foreground, 1 = horizon) moves `scroll × (1 − d)`.
  Keep total parallax subtle (≤ 10–20% of the scroll distance) and disable under reduced motion. CSS-only:
  `animation-timeline: scroll()` with `translate` keyframes per layer.
- **Perspective scale:** apparent size `s = f / (f + z)`; with CSS `perspective: 900px`, `translateZ(z)` does it for you.
  900–1400px feels natural; < 500px looks distorted (fisheye).
- **Atmospheric depth:** far layers get lower contrast, slight blur and a tint toward the background color —
  three cues that sell distance more than movement alone.
- **Occlusion:** foreground elements overlapping background ones (with a soft shadow) creates depth instantly.

## 5. Masking & clipping
- **Fade edges:** `mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)` (carousels,
  marquees, scroll areas).
- **Reveal from a point (click ripple / page wipe):**
  ```css
  @property --r { syntax: "<length-percentage>"; inherits: false; initial-value: 0%; }
  .reveal-circle { clip-path: circle(var(--r) at var(--cx, 50%) var(--cy, 50%)); transition: --r 700ms cubic-bezier(.65,0,.35,1); }
  .reveal-circle.is-open { --r: 150%; }
  ```
- **Text as a window onto video/image:** an SVG `<mask>` or `<clipPath>` with `<text>`, or a big headline with
  `background-clip: text` over an image; for video, put white text on black in an overlay with
  `mix-blend-mode: multiply` (shows video through the text) — keep a readable fallback and a real `<h1>`.
- **Border-only effects:** `mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)` with
  `padding: 1px` turns any background into a border (gradient borders, glow rims).
- **Luminance masks:** `mask-mode: luminance` with an image — white shows, black hides (grunge edges, paper tears).
- **Animate masks** via `@property`-registered variables (positions, radii, gradient stops) — cheap and smooth;
  avoid animating complex `clip-path: path()` on large areas every frame.

## 6. Shadows & light — the rules
1. **One light source per page** (usually top or top-left). Shadows fall away from it, highlights face it,
   gradients brighten toward it. Mixed directions = instantly fake.
2. **Shadows are layered and tinted:** a tight dark contact shadow + wide soft ambient layers, colored with the
   surface's hue (not black). Elevation increases offset and blur, decreases opacity. Formula and tokens:
   frontend-forge `assets/patterns/realistic-shadows.md`.
3. **Highlights describe the material:** small and bright = glossy; broad and soft = matte; anisotropic streak =
   brushed metal. Pointer-driven specular light and SVG lighting filters: `assets/patterns/lighting.md`.
4. **Dark mode:** elevation comes from lighter surfaces and faint top highlights, not heavier shadows.
5. **In 3D (R3F/Three.js):** three-point lighting (key ~45° above/side, fill at ~30–50% intensity opposite,
   rim behind for separation) or an HDRI environment (`<Environment preset="studio" />`) for realistic
   reflections; `<ContactShadows />` or `<AccumulativeShadows />` for grounded objects; tone mapping
   (ACES/AgX) and sRGB output; keep shadow-map sizes modest (1024–2048) and set bias to avoid acne.

## 7. Keyframes, key poses and scroll keypoints
- **Key poses first** (animation's "keys"): define the 2–4 states that tell the story (start, anticipation,
  peak, settle), then the in-betweens via easing. Write them as a timing chart in the storyboard:
  `0ms rest → 120ms anticipate (scale .96) → 380ms peak (y −24, scale 1.02) → 600ms settle (y 0, scale 1)`.
- **Holds** make motion readable: pause 100–300ms on important poses; constant motion reads as noise.
- **Overlap & offset:** parts arrive at slightly different times (stagger 30–80ms), followers lag leaders
  (secondary action) — this is what makes a sequence feel physical instead of mechanical.
- **CSS keyframes** with percentages for key poses; **WAAPI** (`el.animate([...], { duration, easing })`) for JS
  control; **GSAP timelines** with labels (`tl.addLabel("peak")`, position `"<0.1"`) for complex choreography.
- **Scroll keypoints:** decide the scroll positions where something must be fully visible (labels in a GSAP
  timeline + `ScrollTrigger({ snap: { snapTo: "labelsDirectional" } })`), or CSS `scroll-snap-type` on a
  container of full-height scenes. Each keypoint should be a readable, static-looking frame on its own.

## 8. Realism checklist
- [ ] One light direction; shadows, highlights and gradients agree with it.
- [ ] Motion uses springs or proper easing; nothing spatial is linear; durations scale with distance.
- [ ] Objects have weight: anticipation before big moves, settle after; no instant starts/stops.
- [ ] Depth cues: overlap, shadow, scale, atmospheric fade — not just parallax.
- [ ] Frame-rate independent (`dt`-based) and interruption-safe (springs/GSAP `overwrite: "auto"`).
- [ ] Reduced-motion path keeps the realism of the *static* frame (light, shadow, material) and drops movement.
