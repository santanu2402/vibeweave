# Icons, Logos, Favicons & Shapes

Checked November 2026. Iconify serves 260+ open-source icon sets (~460,000 icons counting style variants);
`scripts/icons.mjs` searches and exports them; `scripts/fetch-ui.mjs` pulls animated icon
components from shadcn registries.

## Contents
1. Choosing an icon family
2. Getting icons into the project (`icons.mjs`)
3. Icon packages, when you'd rather install one
4. Animated icons
5. Icon accessibility and sizing
6. Designing a logo (agent workflow)
7. Favicon and app-icon set
8. Shapes, blobs, waves, patterns and grain
9. Shape animation

## 1. Choosing an icon family
Pick **one** family for the product and stay in it — mixed stroke widths and corner styles are an
instant amateur tell. Match the family to the type and the radius personality:

| Family (Iconify prefix) | Count | Style | License | Fits |
|---|---|---|---|---|
| Lucide (`lucide`) | 2,000+ | 24px stroke, rounded | ISC | default for product UI; pairs with grotesk/humanist sans |
| Phosphor (`ph`) | 1,500 × 6 weights | thin, light, regular, bold, fill, duotone | MIT | warm consumer brands; duotone for illustrations |
| Tabler (`tabler`) | 6,000+ | 24px stroke + filled variants | MIT | dashboards, dense UIs |
| Material Symbols (`material-symbols`) | 15,000+ | outlined / rounded / sharp, fill variants | Apache-2.0 | Material/Android-flavored apps |
| Mingcute (`mingcute`) · Hugeicons (`hugeicons`) | 4.5k · 6k free | line + fill · free set is Stroke Rounded (Pro: 60k+, paid) | Apache-2.0 · MIT | broad coverage with personality |
| Remix (`ri`) | 3,200 | line + fill | **Remix Icon License v1.0 (Jan 2026)** — free commercial use, but **not in logos/trademarks**, no resale (Iconify still shows Apache-2.0) | apps; never for a brand mark |
| Heroicons (`heroicons`) | ~320 × 4 | outline 24 / solid 24 / mini 20 / micro 16 | MIT | Tailwind-flavored marketing sites |
| Solar (`solar`) · Streamline (`streamline`) | 7–9k / 3k | many styles | **CC BY 4.0 — attribution required** | only if you'll credit them |
| Simple Icons (`simple-icons`) · SVG Logos (`logos`) · svgl (api.svgl.app, light/dark variants) | 3,400 / 2,000 / ~680 | brand marks (mono / color) | CC0 / CC0 / none — the marks are trademarks | "works with" rows, social links — follow each brand's usage rules |
| Devicon (`devicon`) · Skill Icons (`skill-icons`) | 1,100 / 400 | tech logos | MIT | dev portfolios, stack sections |
| Fluent Emoji (`fluent-emoji`) | 3,000+ | 3D/flat emoji | MIT | playful accents — not UI icons |

Run `node <skill-dir>/scripts/icons.mjs sets --filter <word>` for the live list with counts and
licenses (filters: a set name, `logos`, `programming`, `emoji`, `flags`, `material`, `multicolor`, `animated`).

## 2. Getting icons into the project (`icons.mjs`)
```bash
node <skill-dir>/scripts/icons.mjs search "shopping cart" --sets lucide,ph,tabler
node <skill-dir>/scripts/icons.mjs get lucide:shopping-cart lucide:heart lucide:user \
     --format react --out src/components/icons --stroke 1.75          # → ShoppingCartIcon.tsx … + index.ts + ICONS.md
node <skill-dir>/scripts/icons.mjs get ph:house-duotone --format svg --color "#0f766e" --size 32 --out public/icons
node <skill-dir>/scripts/icons.mjs get lucide:menu lucide:x --format sprite --out public   # one sprite.svg, <use href="/sprite.svg#menu">
```
- Formats: `svg` · `react` (TSX, props spread, `aria-hidden` default) · `vue` · `svelte` (Svelte 5 `$props`) ·
  `astro` · `sprite`. Components land with an `index.ts` barrel that merges across runs.
- Customize: `--size` (default `1em` so icons scale with font-size), `--color` (default keeps
  `currentColor` so CSS controls it — usually what you want), `--stroke` (stroke-based sets only).
- `ICONS.md` records every icon's set, license and author; sets that need attribution are flagged.
- Generated files have no runtime dependency and tree-shake perfectly — better than importing a
  whole icon package for 20 icons.

## 3. Icon packages, when you'd rather install one
- `lucide-react` v1 (`<Heart size={20} strokeWidth={1.75} nonScalingStroke />` — `absoluteStrokeWidth` is
  deprecated; v1 hides icons from screen readers by default and dropped brand icons), `@phosphor-icons/react`
  (`<HouseIcon weight="duotone" />`; `/ssr` entry for server components), `@tabler/icons-react`
  (`<IconHome stroke={1.5} />`), `@heroicons/react/24/outline` — import icons individually.
- `@iconify/react` (`<Icon icon="ph:house-duotone" />`) fetches from the API at runtime and renders
  nothing on the server — fine for prototypes; for SSR pass icon data or use the options below.
- `unplugin-icons` (Vite/webpack/Next; ESM, Node 20+) compiles `~icons/lucide/heart` imports at build
  time from `@iconify-json/<set>` packages (install only the sets you use — `@iconify/json` is ~120MB).
- Tailwind v4: `@plugin "@iconify/tailwind4";` then `<span class="icon-[lucide--heart]"></span>` (needs
  `@iconify-json/lucide`) — icons as CSS masks, no JS.

## 4. Animated icons
Use motion on icons for **feedback** (copy → check, play → pause, menu → close) and **state**
(loading, success, error) — not as decoration on every icon.

| Source | How | Notes |
|---|---|---|
| SMIL/CSS-animated SVG sets: `line-md` (1,200, MIT), `svg-spinners` (46 loaders), `meteocons` (animated weather), `eos-icons` | `icons.mjs get line-md:loading-loop line-md:confirm-circle --format react` | no JS; animations live inside the SVG; React export keeps them |
| Motion-animated icon registries in shadcn's index: `@lucide-animated` (468, MIT; ref API `startAnimation()`), Animate UI icons (~770; **MIT + Commons Clause** — no resale), itshover (Apache-2.0), `@heroicons-animated`, `@hugeicons-animated`, `@animateicons`, `@icons-animated` | `node <skill-dir>/scripts/fetch-ui.mjs list @lucide-animated heart` then `fetch-ui.mjs @lucide-animated/heart` (or `npx shadcn@latest add @lucide-animated/heart`) | React + Motion, `"use client"`; animate on hover/tap/in-view; check each registry's license |
| `react-useanimations` | `npm i react-useanimations` | 300 icons, MIT, SSR-safe |
| Lottie icon libraries: Lordicon (`@lordicon/element` / `@lordicon/react`; free plan 9,700 icons **with attribution**, PRO paid; triggers hover/click/in/loop/morph), LottieFiles free animations (Lottie Simple License — commercial use, no attribution needed) | dotLottie player (motion-forge `motion-graphics.md` §7) or Lordicon's element | heavier; great for onboarding/empty states |
| Rive | state-machine icons that react to hover/press/progress | best for interactive, stateful icons; community files are CC BY — credit them |
| Your own | CSS on a static SVG: `transform` on groups, `stroke-dashoffset` for draw-in, `@starting-style` for enter | cheapest; see recipe below |

```css
/* Micro-interaction on a static Lucide-style icon */
.icon-btn svg { transition: transform var(--dur-fast) var(--ease-out); }
.icon-btn:hover svg { transform: translateY(-1px) rotate(-8deg); }
.icon-btn:active svg { transform: scale(0.92); }
.check path { stroke-dasharray: 1; stroke-dashoffset: 1; }          /* needs pathLength="1" on the path */
.check.is-done path { stroke-dashoffset: 0; transition: stroke-dashoffset 320ms var(--ease-out); }
@media (prefers-reduced-motion: reduce) { .icon-btn svg, .check path { transition: none; } }
```
Animated icons must stop looping under reduced motion, must not be the only signal of state
(pair with text or `aria-live` status), and loaders should be `role="status"` with a label.

## 5. Icon accessibility and sizing
- Decorative icons (next to a visible label): `aria-hidden="true"` (the generated components default to it).
- Meaningful standalone icons: `role="img"` + `aria-label`, or visually hidden text next to them.
- Icon-only buttons: the **button** gets the name (`<button aria-label="Close dialog">`), the icon stays hidden.
- Sizes on a 4px grid: 16 (dense), 20 (default UI), 24 (touch/primary); stroke 1.5–2 at 20–24px;
  keep stroke visually consistent when scaling (`nonScalingStroke` in lucide-react v1, or `vector-effect: non-scaling-stroke`).
- Align icons optically with text: `display: inline-block; vertical-align: -0.125em` for 1em icons, or flex with `gap`.
- Hit area ≥ 24×24px (44px on touch) even when the glyph is 16px — pad the button, not the icon.

## 6. Designing a logo (agent workflow)
Agents can produce a solid, simple SVG mark. Keep it geometric and honest; complex illustration
belongs to a human illustrator.
1. **Brief:** name, what it does, the feeling, where it appears (favicon at 16px, app icon, social
   avatar, header), competitors to avoid resembling. Ask if the user has an existing mark.
2. **Choose the type:** wordmark (name in a distinctive type treatment) · lettermark/monogram ·
   symbol (abstract or pictorial) · combination (symbol + wordmark). Most new products → a simple
   symbol + wordmark, with the symbol doubling as the favicon.
3. **Concepts:** sketch 3 directions as tiny SVGs, each with one idea (e.g. "K formed by a potter's
   wheel arc", "kiln door silhouette", "fingerprint swirl"). Show them side by side at 16, 32 and 128px.
4. **Construct on a grid:** a 24 or 48 unit `viewBox`, simple primitives (circle, rect, one or two
   paths), consistent stroke or solid fill, optical corrections (circles slightly larger than squares).
5. **Wordmark:** choose the typeface from the type system (`scripts/fonts.mjs`); tune letter-spacing and
   weight. For a portable logo file, convert text to outlines in a design tool or with opentype.js
   (`font.getPath(text, x, y, size).toPathData()`) — live `<text>` in SVG depends on the font being
   installed. In HTML headers, live text + the symbol is fine. Check the font license allows logo use;
   don't build marks from icon sets whose license forbids it (Remix Icon).
6. **Variants:** horizontal, stacked, symbol-only; full color, one-color (`currentColor`), inverse;
   clear-space and minimum-size notes in `DESIGN.md`.
7. **Test:** 16px favicon legibility, light and dark backgrounds, grayscale, a quick "does it look like
   a known brand?" check (search the main competitors and Simple Icons). Optimize with `npx svgo logo.svg`
   (SVGO 4 keeps `viewBox` and `<title>` by default).

```svg
<!-- Example symbol: rounded square + arc, 48-unit grid, inherits color -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Kiln">
  <rect x="4" y="4" width="40" height="40" rx="12" fill="currentColor"/>
  <path d="M14 32a10 10 0 0 1 20 0" fill="none" stroke="var(--logo-accent, #fff)" stroke-width="4" stroke-linecap="round"/>
</svg>
```

## 7. Favicon and app-icon set
| File | Size | Use |
|---|---|---|
| `favicon.ico` | 32×32 (can embed 16) | legacy browsers, `/favicon.ico` requests |
| `icon.svg` | vector | modern browsers; can adapt to dark mode with an internal `@media (prefers-color-scheme: dark)` style |
| `apple-touch-icon.png` | 180×180, no transparency | iOS home screen |
| `icon-192.png`, `icon-512.png` | 192, 512 | web app manifest |
| `icon-maskable-512.png` | 512, key content inside the central 80% | Android adaptive icons (`"purpose": "maskable"`) |
| `og-image.png` | 1200×630 | social sharing (`og:image`) |

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
```
- **Next.js App Router:** drop `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and
  `app/opengraph-image.png` (or `.tsx` generated) — the framework emits the tags.
- **Pipeline from one `icon.svg`** (512 viewBox; dark mode via `<style>@media (prefers-color-scheme: dark){…}</style>` inside):
  1. Optimize — **SVGO's default preset deletes that media query**; keep it with
     `optimize(svg, { multipass: true, plugins: [{ name: "preset-default", params: { overrides: { inlineStyles: false } } }] })`.
  2. Rasterize — `sharp(Buffer.from(svg), { density: 384 }).resize(n, n).png()` for 16, 32, 180, 192, 512;
     maskable 512 = logo inside the central ~80% on a solid background.
  3. `favicon.ico` — `png-to-ico` from the 16 + 32 PNGs. Or do it all with `favicons` (npm) or RealFaviconGenerator
     (`npx realfavicon check <url>` audits an existing setup).
  Ask before adding these dev dependencies; with Playwright available you can also render the SVG at each size and
  `page.screenshot({ omitBackground: true })`.

## 8. Shapes, blobs, waves, patterns and grain
- **CSS blob:** `border-radius: 63% 37% 54% 46% / 55% 48% 52% 45%` — animate the radii for a slow wobble.
- **SVG blob from code** (smooth closed path through jittered points on a circle):
```js
export function blob({ points = 7, radius = 100, jitter = 0.25, seed = 1 } = {}) {
  let s = seed; const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);   // deterministic
  const pts = Array.from({ length: points }, (_, i) => {
    const a = (i / points) * Math.PI * 2, r = radius * (1 - jitter + rand() * jitter * 2);
    return [radius + Math.cos(a) * r, radius + Math.sin(a) * r];
  });
  // Catmull-Rom → cubic Bézier, closed
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < points; i++) {
    const p0 = pts[(i - 1 + points) % points], p1 = pts[i], p2 = pts[(i + 1) % points], p3 = pts[(i + 2) % points];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1.map((n) => n.toFixed(1))} ${c2.map((n) => n.toFixed(1))} ${p2.map((n) => n.toFixed(1))}`;
  }
  return `${d}Z`;   // viewBox with room for the jitter: `${-radius * jitter} ${-radius * jitter} ${radius * 2 * (1 + jitter)} ${radius * 2 * (1 + jitter)}`
}
```
  Same `points` count with different seeds gives shapes that morph smoothly into each other.
- **Wave divider:** `<svg viewBox="0 0 1440 120" preserveAspectRatio="none"><path d="M0,64 C240,120 480,0 720,48 C960,96 1200,24 1440,64 L1440,120 L0,120Z" fill="var(--color-surface)"/></svg>`
- **Patterns:** CSS (`radial-gradient` dots, `repeating-linear-gradient` stripes, `conic-gradient`
  checkers) or SVG `<pattern>`; keep contrast low behind text.
- **Grain:** SVG `feTurbulence` noise as a background image at 4–8% opacity (styles.md "Skeuomorphism")
  — also kills gradient banding.
- **Generators** (web apps — use them by hand, or generate in code as above): Haikei (free SVG export;
  terms forbid building a similar generator), fffuel (free for commercial use, no redistribution),
  getwaves.io, blobmaker.app, Hero Patterns, Pattern Monster. In code: the snippet above or `blobs/v2`
  (`svgPath({ seed, extraPoints: 8, randomness: 4, size: 256 })`). Export SVG, then run SVGO.
- Decorative shapes get `aria-hidden="true"`, live in their own layer (`pointer-events: none`), and are
  clipped by their section (`overflow: clip`) so they never cause horizontal scroll.

## 9. Shape animation
- Morph between same-structure paths: GSAP MorphSVG (free, `smooth: "auto"`), flubber (old but works)
  or KUTE.js for differing point counts, or CSS `d: path(...)` transitions in Chromium (progressive enhancement).
- Slow organic motion: animate border-radius or a blob's control points over 8–20s, ease-in-out,
  paused offscreen, removed under reduced motion.
- Generative backgrounds: canvas noise fields or shader gradients — see motion-forge
  `motion-graphics.md` §6 and `creative-libraries.md`.
