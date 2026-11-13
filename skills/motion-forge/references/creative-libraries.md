# Creative Libraries — animation, 3D, particles, canvas, transitions

Versions, licenses and maintenance checked on npm/GitHub in November 2026. "Quiet" = no release
for 12+ months; "unmaintained" = no meaningful activity for 2+ years — fine for small, stable
needs, risky for anything you'll extend. **Check licenses**: a few popular libraries are not MIT.

## Contents
1. How to choose · 2. UI animation · 3. Scroll & smooth scroll · 4. Text & numbers ·
5. SVG & shapes · 6. Canvas, particles & physics · 7. 3D & WebGL · 8. Lottie & Rive tooling ·
9. Page transitions · 10. Avoid or replace

## 1. How to choose
Start with what the project has, then the lightest tool that does the job: CSS → Motion (React) or
anime.js (vanilla) → GSAP for complex timelines/scroll stories → canvas/WebGL only when DOM can't do
it. One animation library per project is the goal; two is the limit.

## 2. UI animation
| Library | Version · license | Status | Use for |
|---|---|---|---|
| CSS transitions/keyframes, `@starting-style`, scroll-driven, View Transitions | native | Baseline-ish (see css-native.md) | first choice for hover/enter/scroll basics |
| Motion (`motion`) | 14.x · MIT (Motion+ paid extras) | active | React/vanilla: gestures, layout, exit, springs, scroll |
| GSAP (+ all plugins) | 3.15 · free "Standard" license (not OSI; bans competing no-code builders) | active | timelines, ScrollTrigger, SplitText, Flip, MorphSVG |
| anime.js | 4.5 · MIT | active | light vanilla timelines, SVG draw, stagger, `splitText` |
| react-spring (`@react-spring/web`) | 10.1 · MIT | active | physics springs in React |
| AutoAnimate (`@formkit/auto-animate`) | 0.10 · MIT | active | one-line list add/remove/reorder animation (React, Vue, Svelte, Solid, Angular) |
| Motion Primitives | MIT · shadcn registry `https://motion-primitives.com/c/<name>.json` | active | ready Motion components (text effects, morphing dialogs) |

## 3. Scroll & smooth scroll
| Library | Version · license | Status | Notes |
|---|---|---|---|
| Lenis | 1.3 · MIT | active | smooth scroll; entry points `lenis`, `lenis/react`, `lenis/snap`, `lenis/vue`, `lenis/nuxt`; expressive sites only |
| Locomotive Scroll | 5.0 · MIT | active | built on Lenis + `data-scroll` parallax attributes |
| GSAP ScrollTrigger / ScrollSmoother | free | active | pinned stories, scrubbing |
| CSS `animation-timeline: view()/scroll()` | native (Chrome, Safari 26, Firefox 159) | — | off-main-thread reveals and progress bars, `@supports` fallback |

## 4. Text & numbers
| Library | Version · license | Status | Notes |
|---|---|---|---|
| GSAP SplitText | free | active | masks, `autoSplit`, accessible output |
| anime.js `splitText` | MIT | active | vanilla alternative |
| Number Flow (`@number-flow/react` / vue / svelte) | 0.6 · MIT | active (2026) | animated digit transitions; respects reduced motion; no non-Latin digits or RTL |
| Splitting.js | 1.1 · MIT | quiet | CSS-variable-based splitting |
| Typed.js | 3.0 · **GPL-3.0 + paid commercial license since Jan 2026** | active | typewriter effect — for commercial closed-source use v2.1.0 (last MIT) or write the effect yourself (it's ~20 lines) |

## 5. SVG & shapes
| Library | Version · license | Status | Notes |
|---|---|---|---|
| GSAP DrawSVG / MorphSVG / MotionPath | free | active | best-in-class SVG motion |
| flubber | 0.4 · MIT | unmaintained (2022), still works | morph between shapes with different point counts |
| KUTE.js | 2.2 · MIT | active (2026) | niche SVG morph/cubic-morph engine |
| Vivus | 0.4 · MIT | unmaintained | line drawing — CSS `pathLength` does this natively now |
| blobs (`blobs/v2`) | 2.3 beta · MIT | quiet | seeded blob paths + animation; or the snippet in frontend-forge icons-logos-shapes.md |
| SVGO | 4.1 · MIT | active | optimize SVGs (v4 keeps viewBox and title by default) |
| roughjs · paper.js · svg-path-commander | MIT | rough quiet · others active | hand-drawn style · boolean path ops · path parsing/transforms |

## 6. Canvas, particles & physics
| Library | Version · license | Status | Notes |
|---|---|---|---|
| tsParticles | 4.5 · MIT | very active | v4 React API: `<ParticlesProvider init={fn}><Particles options/></ParticlesProvider>`; define `init` at module level |
| PixiJS | 8.22 · MIT | active | fast 2D WebGL/WebGPU; `await app.init()`; `@pixi/react` 8 needs React 19 |
| p5.js | 2.3 · **LGPL-2.1** | active | creative coding; v2 uses async `setup()` instead of `preload()` |
| Matter.js | 0.20 · MIT | quiet | 2D physics (falling tags, playful hero toys) |
| Hand-written canvas | — | — | a 40-line `requestAnimationFrame` loop is often lighter than a library; pause offscreen |

## 7. 3D & WebGL (details in 3d-and-rich-media.md)
| Library | Version · license | Status | Notes |
|---|---|---|---|
| three.js | r187 · MIT | active | WebGPURenderer + TSL with WebGL2 fallback (pin versions) |
| React Three Fiber · drei | 9.8 · 10.7 · MIT | active | R3F 9 ↔ React 19 (8 ↔ React 18); v10 alpha makes WebGPU default |
| @react-three/postprocessing | 3.2 · MIT | active | bloom, DOF, vignette — R3F ≥ 9.7 |
| @react-three/rapier | 2.2 · MIT | active | physics (WASM; wrap in Suspense) |
| @react-three/uikit · @react-three/xr | 1.0 · 6.6 | active | flexbox UI in 3D · WebXR |
| gltfjsx · @gltf-transform/cli | 6.5 (maintenance) · 4.5 · MIT | ok · active | `npx gltfjsx m.glb --transform --types` · `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024` |
| TresJS (Vue) · Threlte (Svelte 5) | 5.10 · 8.7 · MIT | active | framework-native Three.js |
| Spline (`@splinetool/react-spline`) | 4.x | active | no-code scenes; heavy runtime — lazy-load |
| Babylon.js · PlayCanvas | 9.x Apache-2.0 · 2.x MIT | active | full engines (games, configurators) |
| OGL | 1.0 · Unlicense | quiet | tiny WebGL for shader effects |
| Needle Engine | 5.1 stable (npm `latest` is a 6.0 alpha — install `@stable`) | active | free only non-commercial with logo; commercial needs a paid plan |
| cobe · globe.gl / react-globe.gl | 2.0 · MIT · 2.4x · MIT | active | ~5KB dotted globe with markers/arcs · full data globes |
| troika-three-text | 0.53 · MIT | active | crisp SDF text in 3D (drei `<Text>` uses it) |
| Paper shaders · ShaderGradient · Unicorn Studio | Apache-2.0 0.0.x (pin) · MIT · hosted | active | shader backgrounds without writing GLSL (motion-graphics.md §6) |

## 8. Lottie & Rive tooling
| Tool | Version · license | Notes |
|---|---|---|
| `@lottiefiles/dotlottie-web` / `-react` / `-wc` | 0.82 / 0.21 / 0.11 · MIT (0.x — pin) | player; WASM renderer; workers; state machines; `-wc` = framework-free web component |
| `@dotlottie/dotlottie-js` | 1.9 | build `.lottie` bundles (animations + themes + state machines); `/node` entry for Node |
| `@lottiefiles/lottie-js` · `@lottiefiles/relottie` | 0.4 · 1.16 · MIT | read/edit Lottie JSON (colors, properties) programmatically |
| python `lottie` (+ Glaxnimate editor) | 0.7 · **AGPL-3.0** | SVG → Lottie, render to GIF/video — keep it a build-time tool |
| lottie-api | 1.0 | unmaintained — skip |
| Lordicon (`@lordicon/element`, `@lordicon/react`) | 3.0 / 2.0 · code MIT | animated Lottie icons; free plan requires attribution; triggers hover/click/in/loop/morph |
| Rive runtimes (`@rive-app/canvas` / `webgl2` 2.50, `@rive-app/react-canvas` 4.39, `canvas-lite`) | MIT | interactive state machines; editor is freemium; community files are CC BY (credit them) |

## 9. Page transitions (details in page-transitions.md)
Native View Transitions (same-document and cross-document) first; Astro `ClientRouter`; SvelteKit
`onNavigate`; Nuxt `experimental.viewTransition`; Motion `animateView`; Swup 4.10 (MIT, active)
for JS-driven MPA transitions; Barba.js 2.10 (MIT, low activity since 2024).

## 10. Avoid or replace
| Instead of | Use | Why |
|---|---|---|
| Vanta.js (unmaintained, pins three r134) | paper shaders, ShaderGradient, a small R3F shader | old three, global `THREE` |
| Zdog (unmaintained) | SVG/CSS 3D transforms or R3F | no updates since 2022 |
| Theatre.js, Motion Canvas (no public releases since 2024) | GSAP timelines, Remotion for video | stalled |
| lottie-web for new work (5.13, last published May 2025) | dotLottie web player | smaller files, WASM renderer, workers, actively released |
| Typed.js 3 in closed-source commercial work | v2.1.0 (MIT) or a tiny custom typewriter | GPL-3.0 since 3.0 |
| GIFs for UI animation | `<video muted loop playsinline>`, Lottie or CSS | 5–10× smaller, sharper |
| Animating with `setInterval` / scroll listeners | `requestAnimationFrame`, CSS scroll timelines, IntersectionObserver | jank and battery |
