---
name: motion-forge
description: Animation, motion graphics and 3D for the web: micro-interactions, scroll stories, page transitions, kinetic type, SVG drawing and morphing, Lottie, Rive, Remotion, Three.js / React Three Fiber, physics springs, masking, realistic shadows and lighting, cinematic video scrubbing — with CSS, Motion, GSAP or anime.js and reduced-motion paths. Use whenever the user wants something animated, alive, cinematic, 3D or "award-winning".
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# Motion Forge

Motion is a material, like color. Used with intent it explains, guides and delights; used
by default it's noise that costs performance and makes some people physically ill.

**Every animation needs a job.** Before adding one, name it:

| Job | Example |
|---|---|
| **Feedback** — confirm an action happened | button press, toggle, saved check |
| **Orientation** — show where something came from / went | drawer slides from its trigger, item flies to cart |
| **Continuity** — connect two states | shared-element transition, layout morph, accordion |
| **Attention** — direct the eye once | a single hero entrance, a new notification |
| **Expression** — brand character | the signature moment: a scroll story, a kinetic headline, a 3D object |

No job → no animation. One orchestrated *expression* moment per page beats twenty effects. But a still page is
not a safe default: unless the owner chose "subtle" or "none", a marketing page gets page-load choreography,
staggered scroll reveals, one signature motion graphic tied to the subject, and micro-interactions — each with a job.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Workflow

1. **Storyboard the moments** (3–5 for subtle pages, 6–10 for rich ones) as a table: what moves, why (job), when
   (trigger: load, hover, click, in-view, scroll position), timing, easing, tool and the
   reduced-motion fallback. Follow the owner's Round 2 answer (`REQUIREMENTS.md` → Motion & animation) and the
   motion dial in `DESIGN.md`; with neither, build **rich** (dial 7). 1–3 subtle, 4–6 expressive, 7–10 cinematic. Show it to the user for anything
   bigger than micro-interactions — it's cheaper to change a table than a timeline.
2. **Pick the lightest tool that does it well** (table below). Use what the project already has.
3. **Implement with motion tokens** (durations, easings) so everything feels like one system.
4. **Build the reduced-motion variant at the same time**, not afterwards.
5. **Verify**: 60fps on a throttled CPU (DevTools Performance, 4× slowdown), content visible
   with JS disabled or before animations run, LCP not delayed, no layout shift, works on touch.

## Choosing the tool

| Need | First choice | Why / alternatives |
|---|---|---|
| Hover, focus, press, small state changes | **CSS transitions** | zero JS; `@starting-style` for enter |
| Element entering when scrolled into view | **CSS scroll-driven** (`animation-timeline: view()`) with fallback, or Motion `whileInView` | off-main-thread in supporting browsers |
| Scroll progress bars, simple parallax | **CSS scroll-driven** (`scroll()`) | Motion `useScroll` as fallback |
| React component enter/exit, layout morphs, shared elements, gestures, springs | **Motion** (`motion/react`) | `AnimatePresence`, `layout`, `layoutId` |
| Complex timelines, pinned scroll stories, scrubbing, text splitting, SVG morph, Flip | **GSAP** + ScrollTrigger/SplitText/Flip | all GSAP plugins are free (since 3.13); 3.15 current |
| Logo reveal, line drawing, path motion, kinetic type, counters, scramble | **CSS + SVG `pathLength`**, then GSAP DrawSVG / MorphSVG / MotionPath / SplitText / ScrambleText | anime.js 4 (`svg.createDrawable`, `splitText`) for a light vanilla timeline |
| Animated icons | animated SVG sets via `frontend-forge/scripts/icons.mjs` (`line-md`, `svg-spinners`), Motion-animated Lucide icons, Lordicon / LottieFiles (Lottie) | CSS hover/active states on static icons cover most needs |
| Promo / social video made from code | **Remotion** (frame-driven React) | company license needed above 3 employees |
| Smooth/inertial scroll | **Lenis** (or GSAP ScrollSmoother) | only for expressive sites; never for apps |
| Page/route transitions | **View Transitions API** (Astro `ClientRouter`, SvelteKit `onNavigate`, `document.startViewTransition`, MPA `@view-transition`) — see page-transitions.md | Motion `animateView`, GSAP Flip, Swup for fully custom |
| Designer-authored vector animation, icons, illustrations | **Lottie** (dotLottie) or **Rive** (interactive state machines) | Rive for interactive, Lottie for playback |
| 3D objects, product viewers, shader backgrounds, particles | **React Three Fiber + drei** (React), Three.js (vanilla), TresJS (Vue), Threlte (Svelte), Spline (no-code) | lazy-load, always provide a fallback |
| Svelte / Vue native | Svelte `transition:`/`animate:` + `svelte/motion`; Vue `<Transition>` + `motion-v` | |

Reference files with code:
- [references/css-native.md](references/css-native.md) — transitions, keyframes, scroll-driven, view transitions, `@starting-style`, recipes (marquee, spotlight, accordion, progress bar)
- [references/motion-library.md](references/motion-library.md) — Motion for React/vanilla: variants, stagger, in-view, scroll, layout, gestures, springs
- [references/gsap.md](references/gsap.md) — GSAP core, timelines, ScrollTrigger (pin/scrub/horizontal), SplitText, Flip, `useGSAP`, Lenis, `matchMedia`
- [references/3d-and-rich-media.md](references/3d-and-rich-media.md) — R3F/drei scenes, glTF pipeline, shaders, Spline, Lottie, Rive, video, 3D ecosystem
- [references/motion-graphics.md](references/motion-graphics.md) — storyboards, animation principles for UI, SVG draw/morph/path, kinetic type, counters, shader backgrounds, writing Lottie JSON, Rive, Remotion
- [references/page-transitions.md](references/page-transitions.md) — View Transitions (same- and cross-document), Next.js, Astro, SvelteKit, Nuxt/Vue, React Router recipes, shared-element and directional patterns, a11y
- [references/realism.md](references/realism.md) — motion math (lerp, remap, frame-rate-independent damping, easing), spring/inertia/gravity physics, springs in pure CSS via `linear()`, parallax & perspective depth, masking & clipping, shadow and light rules, keyframes/key poses and scroll keypoints
- [references/cinematic-web.md](references/cinematic-web.md) — After-Effects-style sites: shot lists, camera moves, compositing (blend modes, grading, grain, light leaks), video loops/scrubbing/transparent video, edited transitions, type in motion, AE → web tooling
- [references/creative-libraries.md](references/creative-libraries.md) — catalog of animation, 3D, particle, canvas and page-transition libraries with versions, licenses, status and what to avoid

## Motion tokens

```css
:root {
  --dur-instant: 80ms;  /* toggles, checkboxes */
  --dur-fast: 140ms;    /* hover, press, small fades */
  --dur-base: 220ms;    /* dropdowns, tooltips, small moves */
  --dur-slow: 360ms;    /* drawers, dialogs, larger moves */
  --dur-story: 700ms;   /* hero entrances, expressive moments */
  --ease-out: cubic-bezier(.22, 1, .36, 1);       /* entering — fast start, gentle settle */
  --ease-in: cubic-bezier(.55, 0, 1, .45);        /* leaving — gentle start, quick exit */
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);    /* moving on screen A → B */
  --ease-expo: cubic-bezier(.16, 1, .3, 1);       /* dramatic reveals */
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1); /* playful overshoot — use sparingly */
}
```
Rules of thumb: bigger distance or bigger element → longer duration; exits ≈ 70–80% of the
enter duration; UI feedback must start within 100ms; nothing a user waits on should exceed
~400ms; springs feel natural for direct manipulation (drag, toggle, layout).

## Choreography

- **Stagger** related items 30–80ms apart; cap the total sequence around 600–800ms — users
  shouldn't wait for a list to finish arriving.
- **Lead with the important thing**: headline, then supporting text, then the visual, then
  secondary UI. Or the reverse when the visual *is* the message.
- **Move less than you think**: 8–24px translate for entrances; 0.96–1 scale for presses.
- **One direction of travel** per sequence; things enter from where they logically come from.
- **Don't animate on every scroll** — reveal once (`once: true`) unless scrubbing is the point.
- **Hover is a hint, not a show**: color/shadow/2–4px lift, 140–200ms.

## Performance rules

- Animate `transform` and `opacity` (and `filter`/`clip-path` carefully). Never width, height,
  top/left, margin — use transforms, FLIP (GSAP Flip, Motion `layout`), or `grid-template-rows`.
- `will-change: transform` only on elements about to animate, removed after; never on everything.
- Avoid animating large `box-shadow`/`backdrop-filter` areas on scroll; animate a pseudo-element's opacity instead.
- Batch scroll work: CSS scroll timelines, `IntersectionObserver`, ScrollTrigger — no raw `scroll` listeners doing layout reads.
- Lazy-load heavy libraries (Three.js, Lottie, Rive, GSAP plugins) with dynamic `import()` when
  the section nears the viewport; render a static poster first.
- Pause offscreen loops (IntersectionObserver / `frameloop="demand"` in R3F) and when the tab is hidden.
- Clean up on unmount (Motion handles it; GSAP via `useGSAP` or `gsap.context().revert()`).

## Accessibility rules (non-negotiable)

- Honor `prefers-reduced-motion: reduce`: replace movement/scale/parallax with a short opacity
  fade or no animation; disable smooth-scroll libraries and autoplaying loops.
  - CSS: `@media (prefers-reduced-motion: reduce) { … }` (or Tailwind `motion-safe:` / `motion-reduce:`)
  - Motion: `<MotionConfig reducedMotion="user">` or `useReducedMotion()`
  - GSAP: `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` condition
- Content must be visible and usable without the animation (no `opacity: 0` content that only JS
  can reveal — if JS fails or is slow, the page is blank). Set initial hidden states in JS, or use
  CSS that defaults to visible.
- Anything auto-moving for more than 5s (marquees, carousels, looping video, ambient particles) needs a visible
  Pause motion button that stops CSS loops (`animation-play-state`) and JS/canvas loops alike — and "Play" must start
  them again. Never pause on `:focus-within` of a region that contains the toggle (after "Play" it keeps focus and
  the loops stay frozen); pause on focus inside the moving content itself (`qa.mjs` clicks the toggle twice).
- Scroll reveals use IntersectionObserver with threshold 0 and no negative bottom rootMargin, so the last rows of
  the page can still reveal (`qa.mjs` flags content still hidden after a full scroll).
- Decorative canvas, particles and WebGL start after `load`, in `requestIdleCallback` (with a timeout), never at
  boot: sizing a canvas forces layout and can land before first paint (`vitals.mjs` names such scripts).
- No flashing more than 3 times per second. Keep parallax and 3D tilt modest (vestibular safety).
- Scroll-jacking (taking over scroll speed/direction) breaks expectations — use pinned scenes
  sparingly, keep them short, and never trap keyboard users.
- Keep focus management correct during transitions (focus the new view's heading after route change).

## Framework gotchas

- **Next.js / RSC**: animation code lives in `"use client"` components; register GSAP plugins
  client-side; avoid random values that differ between server and client render.
- **React Strict Mode** runs effects twice in dev — `useGSAP` and Motion handle this; hand-rolled
  `useEffect` animations must clean up.
- **SPA route changes**: refresh ScrollTrigger (`ScrollTrigger.refresh()`) after layout changes and kill
  triggers on unmount.
- **Fonts and images shift layout** → measure after `document.fonts.ready` / image load before
  computing scroll positions or splitting text (SplitText `autoSplit` re-splits on font load/resize).

## Handing over

Summarize: the moments you added (job + trigger + tool), the tokens used, how reduced motion is
handled, and performance notes (lazy-loaded libraries, measured fps if checked).
