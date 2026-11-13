# UI Style Catalog

Twenty-two style families with when-to-use guidance, a starter CSS recipe and the traps that make
each one look amateur. A style is a *vocabulary*, not a costume: borrow its grammar, then bend
it to the brief. Blend at most two (e.g. Swiss + Kinetic Type, Bento + Dark Premium).

## Contents
1. [Swiss / Minimalism](#1-swiss--minimalism)
2. [Editorial / Magazine](#2-editorial--magazine)
3. [Brutalism (raw)](#3-brutalism-raw)
4. [Neo-Brutalism](#4-neo-brutalism)
5. [Glassmorphism](#5-glassmorphism)
6. [Liquid Glass](#6-liquid-glass)
7. [Neumorphism (Soft UI)](#7-neumorphism-soft-ui)
8. [Claymorphism](#8-claymorphism)
9. [Skeuomorphism (modern tactile)](#9-skeuomorphism-modern-tactile)
10. [Maximalism](#10-maximalism)
11. [Bento Grid](#11-bento-grid)
12. [Spatial UI](#12-spatial-ui)
13. [Dark Premium (dev-tool / SaaS)](#13-dark-premium-dev-tool--saas)
14. [Aurora & Mesh Gradients](#14-aurora--mesh-gradients)
15. [Retro / Y2K / Pixel](#15-retro--y2k--pixel)
16. [Terminal / Hacker](#16-terminal--hacker)
17. [Organic / Natural](#17-organic--natural)
18. [Luxury / Refined](#18-luxury--refined)
19. [Playful / Toy](#19-playful--toy)
20. [Kinetic Typography](#20-kinetic-typography)
21. [Data-Dense / Pro Tool](#21-data-dense--pro-tool)
22. [Material 3 Expressive](#22-material-3-expressive)

---

## 1. Swiss / Minimalism
**Essence:** grid, typography and whitespace do all the work. Asymmetric balance, flush-left
text, strong scale contrast, almost no ornament.
**Best for:** studios, architecture, B2B with confidence, portfolios, docs, premium products.
**Recipe:** 12-col grid with deliberate empty columns · one sans family in 2–3 weights ·
type scale ratio 1.333–1.5 · monochrome + one accent used < 5% of area · radius 0–4px · no shadows.
```css
.swiss { --ink: oklch(0.18 0 0); --paper: oklch(0.985 0 0); --accent: oklch(0.6 0.22 28);
  color: var(--ink); background: var(--paper); font-family: "Switzer", "Hanken Grotesk", sans-serif; }
.swiss h1 { font-size: clamp(3rem, 8vw, 9rem); line-height: .92; letter-spacing: -.04em; font-weight: 600; }
.swiss .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 0 1.5rem; }
.swiss .lead { grid-column: 1 / span 7; } .swiss .aside { grid-column: 9 / span 4; }
```
**Traps:** "minimal" ≠ empty — without dramatic type scale and tension it becomes bland.
Grey-on-white low contrast. Centering everything (Swiss is flush-left).

## 2. Editorial / Magazine
**Essence:** the web as a printed spread — expressive serif display, columns, pull quotes,
drop caps, image-text interplay, captions.
**Best for:** publications, storytelling brands, culture, fashion, long-form, annual reports.
**Recipe:** display serif at huge sizes (Fraunces, Instrument Serif, Playfair Display, Gloock) +
readable body serif or neutral sans · multi-column text with `columns: 2 28ch` on desktop ·
full-bleed images with captions · rules (`border-top: 1px solid`) to separate stories.
```css
.editorial h1 { font-family: "Instrument Serif", serif; font-size: clamp(3.5rem, 9vw, 10rem); line-height: .9; }
.editorial .dropcap::first-letter { float: left; font-size: 4.2em; line-height: .8; padding: .05em .08em 0 0; font-family: "Instrument Serif"; }
.editorial .body { columns: 2 30ch; column-gap: 3rem; hyphens: auto; text-wrap: pretty; }
.editorial figcaption { font-size: .8125rem; color: var(--muted); }
```
**Traps:** newspaper-pastiche (hairlines everywhere, zero radius, dense columns *with nothing to
say*). Editorial needs real content and art-directed imagery.

## 3. Brutalism (raw)
**Essence:** honest, unpolished, default-HTML energy — system fonts, visible structure,
harsh contrast, intentional "wrongness".
**Best for:** artists, experimental studios, zines, music, counter-culture brands.
**Recipe:** monospace or Times-style system serif · pure black/white + one primary · visible
borders and tables · underlined blue links · no radius, no shadows, no easing.
```css
.raw { font-family: ui-monospace, "Courier New", monospace; background: #fff; color: #000; }
.raw a { color: #00e; text-decoration: underline; } .raw * { border-radius: 0 !important; }
.raw .block { border: 2px solid #000; padding: 1rem; }
```
**Traps:** looks unfinished unless *something* is exquisitely controlled (type scale, layout
tension). Must still pass accessibility.

## 4. Neo-Brutalism
**Essence:** brutalism's thick outlines and hard offset shadows, but friendly — saturated flat
colors, chunky type, playful tilt.
**Best for:** creator tools, indie SaaS, Gen-Z consumer, hackathon/community, education.
**Recipe:** `border: 3px solid ink` · hard shadow `6px 6px 0 ink` · flat bright fills · radius
0–12px · bold grotesk display (Archivo Black, Bricolage Grotesque, Lexend Mega).
```css
:root { --ink: #111; --y: #ffd23f; --pink: #ff6fb5; --blue: #4d9de0; --paper: #fffaf0; }
.nb-card { background: var(--y); border: 3px solid var(--ink); border-radius: 10px; box-shadow: 6px 6px 0 var(--ink); }
.nb-btn { border: 3px solid var(--ink); box-shadow: 4px 4px 0 var(--ink); transition: transform .12s, box-shadow .12s; }
.nb-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--ink); }
.nb-btn:active { transform: translate(4px, 4px); box-shadow: 0 0 0 var(--ink); }
```
**Traps:** every element shouting at once. Pick 2–3 fills; keep body text on calm surfaces.

## 5. Glassmorphism
**Essence:** frosted translucent panels over a colorful backdrop, with a light edge highlight.
**Best for:** overlays, media players, OS-like UIs, hero cards over imagery, widgets.
**Recipe:** needs something *behind* it worth blurring (photo, gradient, video).
```css
.glass { background: oklch(1 0 0 / 0.12); backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid oklch(1 0 0 / 0.25); border-radius: 20px;
  box-shadow: 0 8px 32px oklch(0.2 0.05 270 / 0.25), inset 0 1px 0 oklch(1 0 0 / 0.35); }
@supports not (backdrop-filter: blur(1px)) { .glass { background: oklch(0.25 0.02 270 / 0.85); } }
```
**Traps:** glass on a flat white page (nothing to blur = grey box); text contrast failures over
busy backgrounds — add a darker tint layer; too many stacked blurs kill GPU on mobile.

## 6. Liquid Glass
**Essence:** Apple's 2025 material — thicker, refractive, lens-like glass with specular rims,
adaptive tint and fluid morphing between shapes.
**Best for:** app shells, floating nav bars/tab bars, media controls, premium consumer products.
**Recipe:** layered highlights + optional SVG displacement for refraction (Chromium-only for
`backdrop-filter: url()`; degrade to plain frosted glass elsewhere).
```css
.liquid { position: relative; border-radius: 999px; isolation: isolate;
  background: oklch(1 0 0 / 0.08); backdrop-filter: blur(10px) saturate(180%) brightness(1.05);
  box-shadow: inset 0 1px 1px oklch(1 0 0 / .6), inset 0 -1px 1px oklch(0 0 0 / .15),
              inset 0 0 0 1px oklch(1 0 0 / .18), 0 10px 30px -10px oklch(0 0 0 / .35); }
.liquid::before { content: ""; position: absolute; inset: 0; border-radius: inherit; z-index: -1;
  background: radial-gradient(120% 80% at 30% 0%, oklch(1 0 0 / .35), transparent 60%); }
```
```html
<!-- Optional refraction (Chromium): apply with  backdrop-filter: url(#lg) blur(6px); -->
<svg width="0" height="0" style="position:absolute"><filter id="lg"><feTurbulence type="fractalNoise" baseFrequency="0.008" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="40"/></filter></svg>
```
**Traps:** illegible labels over bright content (raise tint opacity under text), heavy filters
on scroll containers, using it for *everything* instead of the floating chrome.

## 7. Neumorphism (Soft UI)
**Essence:** elements extruded from (or pressed into) the same-colored surface via paired
light and dark shadows.
**Best for:** small control surfaces — smart-home panels, music/audio controls, calculators,
single-purpose widgets. Rarely whole websites.
```css
:root { --base: #e6e9ef; --hi: #ffffff; --lo: #b8bec9; }
.neu { background: var(--base); border-radius: 18px; box-shadow: 8px 8px 16px var(--lo), -8px -8px 16px var(--hi); }
.neu--pressed { box-shadow: inset 6px 6px 12px var(--lo), inset -6px -6px 12px var(--hi); }
```
**Traps:** the style's core flaw is low affordance and low contrast. Add a colored accent for
active states, real text contrast, and visible focus rings. Don't use for dense forms.

## 8. Claymorphism
**Essence:** soft, inflated, pastel 3D blobs — like clay toys. Big radii, dual inner shadows,
playful 3D illustrations.
**Best for:** kids/education, consumer onboarding, fintech for young users, playful landing pages.
```css
.clay { background: #ffd6e0; border-radius: 32px;
  box-shadow: 14px 14px 28px oklch(0.5 0.08 10 / .25), inset -8px -8px 16px oklch(0.5 0.1 10 / .18),
              inset 8px 8px 16px oklch(1 0 0 / .7); }
```
Pair with rounded display fonts (Fredoka, Baloo 2, Gabarito) and 3D illustrations (Spline,
Blender renders) — flat icons break the illusion.
**Traps:** pastel text contrast; overuse makes serious content feel childish.

## 9. Skeuomorphism (modern tactile)
**Essence:** real-world materials and physical controls — but refined: subtle gradients, inner
light, noise texture, believable depth. The 2020s "tactile" revival.
**Best for:** audio/creative tools, hardware companions, games, premium product heroes,
anything where *feel* sells.
```css
.knob { width: 96px; aspect-ratio: 1; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fafafa, #c9ccd1 55%, #8d9299);
  box-shadow: 0 10px 20px -6px #0006, inset 0 -3px 6px #0003, inset 0 2px 2px #fff9; }
.surface { background: linear-gradient(#2b2d31, #1f2124); box-shadow: inset 0 1px 0 #ffffff14; }
.noise { background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence baseFrequency='.8' numOctaves='3'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.06'/></svg>"); }
```
**Traps:** 2010-era kitsch (stitched leather, wood grain). Keep materials abstract and
lighting consistent (one light source, top-left).

## 10. Maximalism
**Essence:** more is more — layered collage, clashing patterns, many typefaces, stickers,
oversized type, saturated color. Controlled chaos.
**Best for:** fashion, music, festivals, creative agencies, youth brands, campaign microsites.
**Recipe:** a strict underlying grid so the chaos reads as intent · 3–5 saturated colors ·
2–3 contrasting typefaces · overlapping layers with `mix-blend-mode`, rotated stickers,
marquees, cut-out imagery.
**Traps:** chaos without hierarchy. There must still be one obvious first read and one
obvious action. Watch performance with many large images.

## 11. Bento Grid
**Essence:** a modular grid of differently sized tiles, each containing one idea — like a
bento box. Great for summarizing many features or a personal profile on one screen.
**Best for:** feature overviews, product launches, portfolios/"about me", dashboards.
```css
.bento { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); grid-auto-rows: minmax(160px, auto); }
.bento .a { grid-column: span 2; grid-row: span 2; } .bento .b { grid-column: span 2; }
.bento .c, .bento .d { grid-column: span 1; }
@media (max-width: 768px) { .bento { grid-template-columns: repeat(2, 1fr); } .bento .a { grid-row: span 1; } }
@media (max-width: 480px) { .bento { grid-template-columns: 1fr; } .bento > * { grid-column: auto; } }
.bento > * { border-radius: 20px; padding: 20px; background: var(--surface); overflow: hidden; container-type: inline-size; }
```
Make tile size reflect importance; put *live* micro-demos, charts, product shots or type in
tiles, not just icon + title + sentence.
**Traps:** twelve identical tiles = a card grid, not bento. Inconsistent gaps/radii.

## 12. Spatial UI
**Essence:** interfaces with real depth — layered translucent planes, z-axis hierarchy,
perspective, parallax responding to pointer/gyro. visionOS-inspired.
**Best for:** XR/3D products, hardware, immersive launches, futuristic consumer tech.
**Recipe:** large radii (24–36px) · translucent materials (see Glass) · soft, large, low-opacity
shadows that grow with elevation · `perspective` + subtle `rotateX/Y` on pointer · real 3D
via React Three Fiber where it earns its weight.
```css
.stage { perspective: 1200px; } .plane { transform-style: preserve-3d; transition: transform .4s var(--ease-out); }
.plane:hover { transform: rotateX(4deg) rotateY(-6deg) translateZ(12px); }
```
**Traps:** motion sickness — honor reduced motion, keep tilt under ~8°. Pointer-only
interactions need a keyboard/touch equivalent.

## 13. Dark Premium (dev-tool / SaaS)
**Essence:** near-black hue-tinted canvas, crisp 1px borders, subtle radial glows, precise
small type, product UI as the hero. Think engineering tools and AI infra.
**Best for:** developer tools, infra, AI products, fintech pro.
```css
:root { --bg: oklch(0.15 0.012 265); --panel: oklch(0.19 0.012 265); --line: oklch(1 0 0 / .08);
  --text: oklch(0.96 0.005 265); --muted: oklch(0.70 0.015 265); --accent: oklch(0.78 0.14 200); }
.hero { background: radial-gradient(60% 50% at 50% 0%, oklch(0.45 0.12 265 / .35), transparent 70%), var(--bg); }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; }
```
**Traps:** this is the most-copied look of the decade — differentiate via a signature
(an unusual accent, a live product demo, distinctive type). Avoid pure `#000` and the
single acid-green accent cliché.

## 14. Aurora & Mesh Gradients
**Essence:** soft, slowly shifting multi-color light fields — atmospheric, optimistic.
**Best for:** AI/creative consumer apps, wellness, music, event pages, hero backgrounds.
```css
.aurora { background:
    radial-gradient(40% 50% at 20% 30%, oklch(0.75 0.15 200 / .55), transparent 70%),
    radial-gradient(35% 45% at 80% 20%, oklch(0.72 0.18 330 / .5), transparent 70%),
    radial-gradient(50% 60% at 60% 90%, oklch(0.80 0.14 90 / .45), transparent 70%), oklch(0.98 0.01 280);
  filter: saturate(1.1); }
```
Interpolate in OKLCH (`linear-gradient(in oklch, …)`) to avoid grey mud. Add grain (see
Skeuomorphism `.noise`) to prevent banding.
**Traps:** the default purple-pink-blue blend; animated blur on low-end phones.

## 15. Retro / Y2K / Pixel
**Essence:** nostalgia — Windows 95 bevels, early-web chrome, pixel fonts, CRT glow, chrome
type, stickers (neobrutalism.com — formerly RetroUI — components are a good base).
**Best for:** games, indie products, music, events, nostalgia marketing, playful dev tools.
```css
.win95 { background: #c0c0c0; border: 2px solid; border-color: #fff #808080 #808080 #fff; box-shadow: 1px 1px 0 #000; }
.pixel { font-family: "Press Start 2P", "VT323", monospace; image-rendering: pixelated; }
.crt { text-shadow: 0 0 6px oklch(0.85 0.2 145 / .7); }
```
**Traps:** pixel fonts for body text (illegible). Use retro type for display only.

## 16. Terminal / Hacker
**Essence:** command-line aesthetics — monospace, prompts, ASCII art, blinking cursor,
keyboard-first interaction.
**Best for:** CLIs, devtools, security, API products, technical personal sites.
**Recipe:** JetBrains Mono / Geist Mono / Martian Mono · dark tinted bg · syntax-colored accents
(not just green) · `ch`-based widths · keyboard shortcuts visible.
**Traps:** green-on-black monotony, low-contrast comment grey, gimmick typing effects that
delay content.

## 17. Organic / Natural
**Essence:** earthy palettes, soft irregular shapes, paper/grain textures, warm photography,
humanist or soft serif type.
**Best for:** wellness, food, sustainability, craft, hospitality, skincare, outdoor.
**Recipe:** palettes from materials (moss, clay, oat, stone, ink) · blob/clip-path shapes ·
generous whitespace · humanist type (Young Serif, Fraunces soft, Figtree, DM Sans).
```css
.blob { border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%; }
```
**Traps:** the beige-everything cliché; avoid cream + terracotta + serif as an unexamined default.

## 18. Luxury / Refined
**Essence:** restraint, space, precision — high-contrast serif or refined sans, thin rules,
slow elegant motion, exceptional photography.
**Best for:** fashion, jewelry, real estate, hotels, premium automotive, fine dining.
**Recipe:** display serif with high stroke contrast (Bodoni Moda, Cormorant Garamond, Italiana)
or wide refined sans · tracking +0.08–0.2em on small caps labels · black/ivory + one metallic
or deep jewel tone · large imagery, few words · 600–900ms eased transitions.
**Traps:** gold gradients and script fonts (cheap, not luxe). Tiny low-contrast text.

## 19. Playful / Toy
**Essence:** bouncy, colorful, character-driven — illustrations, rounded shapes, springy motion,
humor in microcopy.
**Best for:** consumer apps, kids, games, community, onboarding flows.
**Recipe:** rounded geometric type (Fredoka, Baloo 2, Gabarito, Shantell Sans) · 4–6 bright
colors on light base · spring easing (`cubic-bezier(.34, 1.56, .64, 1)`) · mascots, stickers,
hand-drawn SVG accents.
**Traps:** playful ≠ messy; keep a strict spacing system underneath.

## 20. Kinetic Typography
**Essence:** type *is* the visual — massive, animated, variable-font, scroll-reactive headlines.
**Best for:** agencies, events, launches, portfolios, campaigns with a strong message.
**Recipe:** variable fonts animated on weight/width axes · split text into lines/words for
staggered reveals (GSAP SplitText) · marquees · scroll-scrubbed scale/letter-spacing.
```css
@keyframes breathe { 50% { font-variation-settings: "wght" 800, "wdth" 125; } }
.kinetic { font-family: "Bricolage Grotesque", sans-serif; font-variation-settings: "wght" 300, "wdth" 75; animation: breathe 6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .kinetic { animation: none; } }
```
**Traps:** content hidden until animation finishes (bad LCP and accessibility). Ensure the
static state reads perfectly.

## 21. Data-Dense / Pro Tool
**Essence:** information first — compact rows, tabular numbers, keyboard shortcuts, quiet
chrome, color reserved for meaning (status, deltas, selection).
**Best for:** dashboards, admin panels, trading, analytics, IDE-like tools, CRMs.
**Recipe:** 13–14px base · tight scale (ratio 1.125–1.2) · `font-variant-numeric: tabular-nums` ·
neutral surfaces with 1px dividers · 4/8px spacing · semantic colors only · sticky headers.
```css
.table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.table tr:hover { background: oklch(0.97 0.005 260); }
.table th { position: sticky; top: 0; background: var(--surface); font-weight: 500; }
```
**Traps:** decorative gradients and big cards in dashboards; color-coding without legends;
charts without units or axis labels; red/green as the only signal (add icons, +/− signs).

## 22. Material 3 Expressive
**Essence:** Google's 2025 evolution of Material — emotionally vivid color, emphasized type, a
library of playful shapes (squircles, scallops, "cookie" and clover forms) that **morph** on
interaction, and spring-physics motion. Research behind it reported faster fixation on key
actions; the point is hierarchy through shape, size and color contrast, not decoration.
**Best for:** consumer apps, Android-adjacent products, media and productivity tools that want
warmth without losing usability.
**Recipe:** tonal palettes from one seed color (primary / secondary / tertiary containers) · a
heavier, larger display/headline style for the key moment · mixed shape scale (pill buttons,
24–32px containers, one expressive shape per screen) · springy state changes (press = shape
morph + scale, not just color) · button groups, split buttons, prominent FAB menus.
```css
:root { --m3-spring: linear(0, 0.38 9%, 0.88 22%, 1.06 31%, 1.09 38%, 1.03 52%, 0.99 66%, 1); /* fast spatial spring */
  --primary: oklch(0.52 0.17 290); --on-primary: oklch(0.99 0 0); --primary-container: oklch(0.9 0.06 290); }
.m3-btn { border-radius: 999px; padding: 0.875rem 1.5rem; background: var(--primary); color: var(--on-primary);
  transition: border-radius 350ms var(--m3-spring), scale 350ms var(--m3-spring); }
.m3-btn:active { border-radius: 12px; scale: 0.96; }           /* shape morphs on press */
.m3-hero-shape { clip-path: path("M60 0C93 0 120 27 120 60S93 120 60 120 0 93 0 60 27 0 60 0Z"); /* swap for a scallop/clover path */ }
@media (prefers-reduced-motion: reduce) { .m3-btn { transition: background-color 150ms; } }
```
**Traps:** using every expressive shape at once (pick one signature shape); springs on large
layout moves (motion sickness); low-contrast tonal pairs — check `on-*` colors with contrast.mjs.
