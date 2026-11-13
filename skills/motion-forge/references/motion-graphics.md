# Motion Graphics for the Web

Motion graphics = designed, timed sequences (logo reveals, kinetic type, animated illustrations,
data stories, product promos) as opposed to UI feedback motion. Checked November 2026: GSAP 3.15
(all plugins free), Motion 14.11, anime.js 4.5, dotLottie-web 0.82, Rive runtimes (MIT), Remotion 4.

## Contents
1. Storyboard first
2. Principles that transfer to UI
3. SVG: draw, morph, follow a path
4. Kinetic typography
5. Numbers, counters, text scramble
6. Generative and shader backgrounds
7. Lottie: playback, authoring, writing JSON by hand
8. Rive: interactive motion graphics
9. Video: Remotion, Jitter, exports
10. Choosing the tool
11. Accessibility and performance

## 1. Storyboard first
Before any code, write the sequence as a table. It forces decisions about order, timing and
purpose — and it's the artifact the user can approve.

| # | t (ms) | What moves | How | Easing | Job | Reduced motion |
|---|---|---|---|---|---|---|
| 1 | 0–600 | logo mark strokes draw | DrawSVG / dashoffset | expo.out | expression | show final mark |
| 2 | 350–900 | wordmark letters rise 12px + fade | SplitText chars, stagger 25ms | power3.out | attention | fade only |
| 3 | 900–1400 | hero visual scales 0.96 → 1 | transform | ease-out | continuity | none |
| 4 | scroll 0–40% | route line draws along the map | ScrollTrigger scrub | none (scrub) | orientation | static full line |

Rules: overlap steps by 30–50% of their duration (sequences feel slow when steps wait for each
other); total intro ≤ 1.2–1.5s; the LCP element is visible from the first frame.

## 2. Principles that transfer to UI
Disney's 12 principles were made for characters; for interfaces, these matter most:
- **Timing & easing** — ease-out for entering, ease-in for leaving, ease-in-out for moving
  between two points on screen; ~100ms feedback, 200–300ms small UI moves, 400ms+ only for large
  travel (NN/g). Material 3 tokens are a good reference: standard `cubic-bezier(0.2,0,0,1)`,
  emphasized decelerate `(0.05,0.7,0.1,1)`, emphasized accelerate `(0.3,0,0.8,0.15)`.
- **Anticipation** — a tiny counter-move or press-in (scale 0.97) before a big action.
- **Follow-through & overlap** — parts settle at different times (stagger, springs); nothing stops dead.
- **Staging** — one focal motion at a time; everything else holds still.
- **Arcs** — natural paths curve (MotionPath) rather than moving in straight diagonals.
- **Secondary action** — a small supporting motion (icon wiggle after a toggle), never competing.
- **Squash & stretch** — only for playful brands; keep volume constant.
The "UX in Motion" principles add interface-specific ones worth knowing: offset & delay,
parenting (child moves with parent), transformation (one element becomes another), masking,
obscuration, dimensionality, dolly & zoom.

## 3. SVG: draw, morph, follow a path
**Line drawing (no library):**
```html
<svg viewBox="0 0 200 60"><path class="draw" pathLength="1" d="M5 50 C 60 -10, 140 110, 195 10"/></svg>
```
```css
.draw { fill: none; stroke: currentColor; stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: draw 1.2s var(--ease-out) forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .draw { animation: none; stroke-dashoffset: 0; } }
/* scroll-linked: animation-timeline: view(); animation-range: entry 10% cover 50%; (with @supports fallback) */
```
**GSAP (free plugins):**
```js
import gsap from "gsap"; import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"; import { MotionPathPlugin } from "gsap/MotionPathPlugin";
gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);
gsap.from(".logo path", { drawSVG: 0, duration: 1, stagger: 0.08, ease: "expo.out" });
gsap.to("#blob", { morphSVG: { shape: "#blob-2", smooth: "auto" }, duration: 1.2, ease: "power2.inOut" }); // smooth since 3.14
gsap.to(".dot", { motionPath: { path: "#route", align: "#route", autoRotate: true, alignOrigin: [0.5, 0.5] }, duration: 3 });
```
- Morph works best between shapes with similar point counts; `flubber` is a small library
  alternative. Shape generators for blobs/waves: see frontend-forge `references/icons-logos-shapes.md`.
- **anime.js 4**: `svg.createDrawable(el)` + `animate(drawable, { draw: ["0 0", "0 1"] })`;
  `svg.createMotionPath(path)` for path following. Named imports; `ease` not `easing`.
- **Motion**: `<motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />`.

## 4. Kinetic typography
- **Split text**: GSAP SplitText (free; rewritten in 3.13 — `autoSplit` re-splits on resize/font
  load, `mask: "lines"` for reveal-from-below, adds aria so screen readers read the whole text).
  anime.js 4 has `splitText`. Motion's `splitText` is in paid Motion+.
```js
SplitText.create(".headline", { type: "lines, words", mask: "lines", autoSplit: true,
  onSplit: (self) => gsap.from(self.lines, { yPercent: 100, duration: 0.8, stagger: 0.08, ease: "expo.out" }) });
```
- **Variable-font motion**: animate `font-variation-settings` / `font-weight` / `font-stretch`
  (see styles.md "Kinetic Typography"); scroll-scrub weight with CSS scroll timelines.
- **Marquee**: CSS `@keyframes` on a duplicated track (`translateX(-50%)`), pause on hover/focus,
  stop under reduced motion; or GSAP `horizontalLoop` helper.
- **Rules**: wait for `document.fonts.ready` before splitting; never split body copy; keep the
  static state perfectly readable; one kinetic moment per page.

## 5. Numbers, counters, text scramble
- Counters: `@number-flow/react` style digit rolling, Motion `animate(0, 1234, { onUpdate })`,
  or GSAP `snap: { textContent: 1 }`. Use `font-variant-numeric: tabular-nums` so digits don't jitter.
- Scramble: GSAP ScrambleTextPlugin (free). Keep it short (< 800ms) and announce the final
  value only (`aria-live` on the container if it's meaningful data, not decoration).

## 6. Generative and shader backgrounds
- **CSS first**: animated gradients (`@property --angle` + conic/radial gradients), grain via SVG
  `feTurbulence`, blobs via border-radius keyframes — cheap and reduced-motion friendly.
- **Shaders without writing GLSL**: `@paper-design/shaders-react` (`<MeshGradient>`,
  `<DotOrbit>`, … Apache-2.0; pin the version — still 0.0.x), `@shadergradient/react` (MIT,
  needs R3F + three), Unicorn Studio embeds (`data-us-project`, lazyload/fps/scale attributes).
- **Canvas 2D / particles**: tsParticles, or a hand-written canvas loop with
  `requestAnimationFrame`, paused offscreen and when `document.hidden`.
- Always: a static poster/gradient first, cap DPR, pause offscreen, disable under reduced motion.

## 7. Lottie: playback, authoring, writing JSON by hand
**Playback** — dotLottie (compressed `.lottie`, multiple animations, themes, state machines):
```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";   // 0.x — pin the version
<DotLottieReact src="/anim/success.lottie" autoplay loop={false} style={{ width: 160, height: 160 }} />
```
Vanilla: `new DotLottie({ canvas, src, autoplay: true })`; `DotLottieWorker` renders in a worker.
**Sources**: LottieFiles free animations (Lottie Simple License: commercial use, no attribution needed;
premium needs a plan), Lordicon (animated icons; free plan requires attribution), IconScout. **Authoring**: After Effects + Bodymovin or the LottieFiles AE
plugin; LottieFiles Creator (browser); Jitter exports Lottie too.

**Writing Lottie JSON directly** works for simple shape animations (loaders, checkmarks, pulses).
This minimal file (a dot that pulses over 2s at 30fps) validates against the official Lottie schema
(https://lottie.github.io/lottie-spec/latest/lottie.schema.json, spec 1.0.1):
```json
{"v":"5.12.0","fr":30,"ip":0,"op":60,"w":200,"h":200,"nm":"pulse","ddd":0,"assets":[],
"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"circle","sr":1,"ip":0,"op":60,"st":0,"bm":0,
 "ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[100,100,0]},"a":{"a":0,"k":[0,0,0]},
  "s":{"a":1,"k":[{"t":0,"s":[100,100,100],"o":{"x":[0.33],"y":[0]},"i":{"x":[0.67],"y":[1]}},
   {"t":30,"s":[140,140,100],"o":{"x":[0.33],"y":[0]},"i":{"x":[0.67],"y":[1]}},{"t":60,"s":[100,100,100]}]}},
 "shapes":[{"ty":"gr","nm":"dot","it":[
  {"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[80,80]}},
  {"ty":"fl","c":{"a":0,"k":[1,0.34,0.2,1]},"o":{"a":0,"k":100},"r":1},
  {"ty":"tr","p":{"a":0,"k":[0,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]},"r":{"a":0,"k":0},"o":{"a":0,"k":100}}]}]}]}
```
Rules: `fr` frame rate, `ip`/`op` in/out **frames** (not seconds), `w`/`h` canvas; layer `ty: 4` = shape
layer, `ind` unique, the **first layer in the array draws on top**; `ks` = transform (`o` opacity 0–100,
`s` scale %, `p` position, `r` rotation, `a` anchor); animated properties are `{"a":1,"k":[{t,s,i,o}…]}`
(`i`/`o` = bezier easing handles); colors are **0–1 floats**, not 0–255; inside a group (`gr`) the `tr`
transform must be **last**. Shape types: `el` ellipse, `rc` rectangle, `sh` path, `fl` fill, `st` stroke,
`gf` gradient fill, `tm` trim path (line-drawing). Validate against the schema, then play it in the dotLottie
player or lottiefiles.com/preview — invalid JSON fails silently as a blank canvas.
**Tooling:** `@lottiefiles/lottie-js` (load/edit, e.g. recolor to brand tokens), `@lottiefiles/relottie`
(syntax tree), `@dotlottie/dotlottie-js` (bundle animations + themes + state machines into `.lottie`),
python `lottie` (SVG → Lottie; AGPL — build-time only). For anything beyond simple shapes, use an
authoring tool (After Effects + Bodymovin / LottieFiles plugin, LottieFiles Creator, Jitter) or the
official `LottieFiles/motion-design-skill` (`npx skills add LottieFiles/motion-design-skill`).

## 8. Rive: interactive motion graphics
Best when motion must *respond* (hover, toggles, progress, data). Runtimes are MIT; the editor has
a free tier (exports carry a splash screen) and paid seats.
```tsx
import { useRive } from "@rive-app/react-canvas";   // react-webgl2 for the full Rive Renderer; canvas-lite smallest
const { RiveComponent } = useRive({ src: "/anim/toggle.riv", stateMachines: "main", autoplay: true, autoBind: true });
<div style={{ width: 240, height: 240 }}><RiveComponent aria-hidden /></div>   // parent needs an explicit size
```
Drive it with data binding (`useViewModelInstanceNumber/Boolean/Trigger`) rather than raw state
machine inputs; set initial values in `onRiveReady`; clean up on unmount.

## 9. Video: Remotion, Jitter, exports
- **Remotion** — motion graphics/promo videos written in React, rendered to MP4/WebM.
  `npx create-video@latest`; animate from the frame number (`useCurrentFrame()`, `interpolate`,
  `spring`, `<Sequence>`) — CSS transitions and timers don't render deterministically. Official
  agent skills: `npx skills add remotion-dev/skills`. **License:** free for individuals and
  companies with ≤ 3 employees; larger companies need a paid company license — tell the user.
- **Jitter** — browser tool for motion design; exports video, GIF and Lottie; no code SDK.
- Shipping video on the web: muted, `playsinline`, poster, compressed, pause offscreen, captions
  for anything with speech, a pause control if it loops > 5s.
- Stale tools to avoid for new work: Theatre.js (no public releases since 2024), Motion Canvas
  (no releases since late 2024).

## 10. Choosing the tool
| Need | Reach for |
|---|---|
| Logo/line draw, simple loops | CSS + SVG `pathLength` |
| Sequenced intro, text splitting, SVG morph, path motion, scroll stories | GSAP (+ SplitText, DrawSVG, MorphSVG, MotionPath, ScrollTrigger) |
| React component motion, layout morphs, gestures | Motion |
| Lightweight timeline in vanilla JS | anime.js 4 |
| Designer-made illustration animation, playback only | Lottie / dotLottie |
| Interactive, stateful animated graphics | Rive |
| Animated backgrounds | CSS gradients → paper shaders → ShaderGradient / R3F |
| Rendered video for social/promo | Remotion (check license) or Jitter |
| 3D motion | React Three Fiber + drei (see 3d-and-rich-media.md) |

## 11. Accessibility and performance
- Reduced motion: final frame or a fade, no loops, no parallax; Lottie/Rive paused on their
  first meaningful frame; video not autoplaying.
- Decorative animations get `aria-hidden="true"`; meaningful ones get a text equivalent.
- Nothing flashes more than 3 times per second; loops longer than 5s need a pause control.
- Lazy-load players and libraries near the viewport; static poster first; pause offscreen and when
  the tab is hidden; transform/opacity only for DOM motion.
