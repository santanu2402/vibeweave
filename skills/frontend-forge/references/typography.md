# Typography

Type is 90% of most interfaces. Getting it right is the single highest-leverage design move.

## Contents
1. Choosing typefaces
2. Pairings by mood
3. Type scale
4. Rules that separate pros from defaults
5. Loading fonts properly

## 1. Choosing typefaces

- **One family is often enough.** A variable family with wide weight/width range (Bricolage
  Grotesque, Hanken Grotesk, Fraunces, Geist) gives display and body from one file.
- **Two families must be clearly different** (serif + sans, grotesk + mono). Two similar sans
  fonts look like a mistake.
- Choose by **personality** first (what does the brief's "feeling" sound like?), then by
  **function** (x-height and legibility for body; character for display; tabular figures for data).
- Inter, Roboto, Arial, Open Sans, Poppins are excellent at their job — invisible UI text — and
  that is exactly why they say nothing on a brand page. Use them for dense product UI if you like;
  for marketing/brand surfaces make a deliberate choice.
- Free, high-quality sources: Google Fonts, Fontshare (free commercial use, by Indian Type
  Foundry), Vercel's Geist (`npm i geist`), Uncut.wtf (curated free fonts), Collletttivo (open-source libre fonts).
  Check licenses for anything else.

## 2. Pairings by mood

`G` = Google Fonts · `F` = Fontshare · `N` = npm. Display / Body / (Mono if useful).

| Mood | Pairing | Notes |
|---|---|---|
| Swiss precision | Switzer (F) solo · Hanken Grotesk (G) solo | tight tracking on display, big scale contrast |
| Editorial elegance | Instrument Serif (G) / Instrument Sans (G) | italic serif display is a strong signature |
| Literary / long-read | Newsreader (G) / Newsreader · Source Serif 4 (G) | serif body, 1.6–1.7 leading |
| Expressive editorial | Fraunces (G, use SOFT & WONK axes) / Figtree (G) | soft optical-size serif, distinctive |
| Bold startup | Clash Display (F) / Satoshi (F) | high-impact headings, clean body |
| Confident product | Cabinet Grotesk (F) / General Sans (F) | warmer than Inter, still neutral |
| Characterful grotesk | Bricolage Grotesque (G) solo | variable width/weight, great for kinetic type |
| Technical / dev | Geist (N/G) / Geist Mono (N/G) | coherent family, mono for code/data |
| Engineering-classic | IBM Plex Sans (G) / IBM Plex Mono (G) | corporate-credible, excellent mono |
| Neo-brutal | Archivo Black (G) / Archivo (G) · Lexend Mega (G) / Lexend | chunky display, wide body |
| Futuristic | Unbounded (G) / Sora (G) · Syne (G) / Manrope (G) | wide geometric, use sparingly |
| Luxury fashion | Bodoni Moda (G) / Jost (G) · Italiana (G) / Tenor Sans (G) | high contrast serif, tracked caps |
| Classic luxury | Cormorant Garamond (G) / Hanken Grotesk (G) | Cormorant is display-only (thin at small sizes) |
| Warm organic | Young Serif (G) / DM Sans (G) · Gloock (G) / Figtree (G) | friendly, food/wellness |
| Fintech trust | Schibsted Grotesk (G) solo · Onest (G) solo · Manrope (G) solo | sturdy, tabular numerals |
| Playful | Fredoka (G) · Baloo 2 (G) · Gabarito (G) / Nunito (G) | rounded; keep body readable |
| Handwritten accent | Caveat (G) or Shantell Sans (G) | accents/annotations only, never body |
| Kids / education | Lexend (G) · Atkinson Hyperlegible (G) | designed for reading ease |
| Retro / pixel | Press Start 2P (G) · VT323 (G) · Silkscreen (G) · Pixelify Sans (G) / Space Mono (G) | display only |
| Condensed impact | Anton (G) · Bebas Neue (G) · Big Shoulders Display (G) / Inter Tight (G) | posters, sports, events |
| Dashboard | Geist · IBM Plex Sans · Inter (G) with `tnum` | Inter is fine *here* |
| Serif + mono intellectual | Gambetta (F) / JetBrains Mono (G) | research, AI labs, writing tools |
| Sharp display serif | Zodiak (F) / Switzer (F) · Erode (F) / Satoshi (F) | modern editorial |

## 3. Type scale

Pick a ratio by density, generate steps, and make the top steps fluid.

| Ratio | Name | Use |
|---|---|---|
| 1.125 | major second | dense apps, dashboards |
| 1.2 | minor third | product UI, docs |
| 1.25 | major third | general marketing |
| 1.333 | perfect fourth | confident marketing |
| 1.5 – 1.618 | perfect fifth / golden | editorial, portfolio display |

Fluid sizes interpolate between a mobile and desktop value. Formula:
`clamp(minRem, calc(intercept + slope·vw), maxRem)` — e.g. 2.5rem at 375px → 6rem at 1440px:

```css
:root {
  --step--1: clamp(0.83rem, 0.80rem + 0.15vw, 0.94rem);
  --step-0:  clamp(1rem, 0.96rem + 0.19vw, 1.13rem);
  --step-1:  clamp(1.25rem, 1.17rem + 0.38vw, 1.5rem);
  --step-2:  clamp(1.56rem, 1.42rem + 0.66vw, 2rem);
  --step-3:  clamp(1.95rem, 1.71rem + 1.08vw, 2.67rem);
  --step-4:  clamp(2.44rem, 2.05rem + 1.7vw, 3.55rem);
  --step-5:  clamp(3.05rem, 2.43rem + 2.65vw, 4.73rem);
  --step-display: clamp(3.5rem, 1.6rem + 8vw, 9rem);
}
```
(Utopia.fyi generates these for any ratio and viewport range.)

## 4. Rules that separate pros from defaults

- **Line length** 45–75 characters for body (`max-width: 65ch`). Serif body tolerates slightly longer.
- **Leading** body 1.5–1.7; headings 1.0–1.2; display 0.88–1.0. Bigger type → tighter leading.
- **Tracking** display −0.02 to −0.045em; body 0; small uppercase labels +0.04 to +0.1em.
  Never track lowercase body text.
- **Weight contrast** beats size contrast for hierarchy in dense UI (400 vs 600). Limit to 2–3 weights.
- **`text-wrap: balance`** on headings (no orphan words), **`text-wrap: pretty`** on paragraphs.
- **Numbers**: `font-variant-numeric: tabular-nums` in tables, prices, timers, counters;
  `oldstyle-nums` in editorial serif text if the font supports it.
- **Real typographic characters**: “curly quotes”, apostrophes ’, en dash – for ranges,
  em dash — for breaks, × for dimensions, … ellipsis, non-breaking space between number and unit.
- **Hierarchy check**: squint at the page. If you can't tell the order of reading in 2 seconds,
  hierarchy is broken.
- **Minimum sizes**: body ≥ 16px on mobile (prevents iOS zoom on inputs too), captions ≥ 12px,
  never thin weights (≤300) below 20px.
- **ALL CAPS** only for very short labels, always with added tracking — and not above every section.
- **Optical sizes**: variable fonts with an `opsz` axis (Fraunces, Newsreader, Roboto Flex)
  adapt automatically with `font-optical-sizing: auto`.

## 5. Loading fonts properly

- **Next.js**: `next/font/google` or `next/font/local` (self-hosts, no layout shift, auto `size-adjust`).
  ```ts
  import { Bricolage_Grotesque } from "next/font/google";
  const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
  ```
- **Nuxt**: `@nuxt/fonts` (auto-detects families used in CSS). **Astro**: built-in fonts API or Fontsource.
- **Anywhere**: Fontsource packages (`npm i @fontsource-variable/fraunces`) or self-hosted WOFF2
  with `@font-face { font-display: swap; }` and `<link rel="preload" as="font" type="font/woff2" crossorigin>`
  for the one or two above-the-fold files.
- Google Fonts CDN: add `&display=swap`, request only the weights used, and `preconnect` to
  `fonts.gstatic.com`.
- Subset to the languages needed. Budget: ≤ 2–3 font files on first load.
- Provide metric-compatible fallbacks (`size-adjust`, `ascent-override`) or use `next/font`,
  which does it for you, to avoid layout shift on swap.
