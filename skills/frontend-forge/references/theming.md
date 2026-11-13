# Theming — light/dark, high contrast, multi-brand, design tokens

Checked November 2026: Tailwind 4.3, shadcn CLI 4.x, W3C DTCG design tokens 2025.10 (first stable),
Style Dictionary 5, next-themes 0.4.6 (no release since March 2025 — see §4).

## Contents
1. Token architecture (primitive → semantic → component)
2. Light/dark with CSS (`light-dark()`, `color-scheme`)
3. Tailwind v4 theming (`@theme`, `@theme inline`, variants)
4. Switching themes without a flash
5. shadcn/ui themes
6. Multi-brand / multi-tenant
7. High contrast, forced colors, user preferences
8. Design tokens as data (DTCG, Style Dictionary, Figma)
9. Theme QA checklist

## 1. Token architecture
- **Primitives** (raw scales): `--blue-500: oklch(0.6 0.17 255)` — from `scripts/palette.mjs`. Never used in components.
- **Semantic** (roles): `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`,
  `--color-accent`, `--color-on-accent`, `--color-focus`, `--color-danger` … — the only layer components use, and
  the only layer themes override.
- **Component** (optional, for libraries): `--button-bg: var(--color-accent)`.
A theme = a set of semantic values. Switching theme = changing which values the semantic variables point to.

## 2. Light/dark with CSS
```css
:root { color-scheme: light dark; }                       /* native controls & scrollbars follow the theme */
:root {
  --color-bg:      light-dark(oklch(0.985 0.004 250), oklch(0.16 0.012 260));
  --color-surface: light-dark(oklch(0.96 0.006 250),  oklch(0.21 0.014 260));
  --color-text:    light-dark(oklch(0.22 0.02 260),   oklch(0.95 0.008 260));
  --color-accent:  light-dark(oklch(0.52 0.16 160),   oklch(0.74 0.13 160));   /* lighter + less chroma in dark */
}
:root[data-theme="light"] { color-scheme: light; }        /* user override */
:root[data-theme="dark"]  { color-scheme: dark; }
```
`light-dark()` is Baseline 2024 and needs `color-scheme` set; it works for colors only. Dark mode is *designed*:
lighter surfaces for elevation, desaturated accents, tinted near-black backgrounds, re-checked contrast.

## 3. Tailwind v4 theming
```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));   /* or .dark class */
:root { --background: oklch(0.985 0.004 250); --foreground: oklch(0.22 0.02 260); --primary: oklch(0.52 0.16 160); }
[data-theme="dark"] { --background: oklch(0.16 0.012 260); --foreground: oklch(0.95 0.008 260); --primary: oklch(0.74 0.13 160); }
@theme inline {                    /* "inline" because these reference other variables */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --font-display: "Fraunces Variable", ui-serif, serif;
  --radius-lg: 1rem;
}
```
`@theme` generates utilities (`bg-background`, `text-primary`, `font-display`, `rounded-lg`) and `:root` variables;
`@theme inline` is required when a token points at another variable; `@theme static` emits all variables even if
unused; reset a namespace with `--color-*: initial`.

## 4. Switching themes without a flash
Apply the theme **before first paint** with a tiny inline script in `<head>` (works in every framework):
```html
<script>
  (() => { try { const t = localStorage.getItem("theme");
    const dark = t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light"; } catch {} })();
</script>
```
Toggle: set `data-theme`, persist to `localStorage`, offer "System" (remove the key). Disable transitions during
the switch (add a class that sets `transition: none` for one frame) so colors don't animate everywhere.
React/Next: `<html suppressHydrationWarning>`; render the toggle only after mount (its label depends on the client).
**next-themes** (0.4.6) still works (`<ThemeProvider attribute="data-theme" disableTransitionOnChange>`), but it has
had no release since March 2025 and shows a "script tag while rendering" warning with React 19 / Next 16 — the
inline script above is the dependency-free alternative.

## 5. shadcn/ui themes
Tokens come in pairs (`--primary` / `--primary-foreground`) in OKLCH under `:root` and `.dark`, mapped through
`@theme inline`. Pick a base color (Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe) or build presets with
`shadcn/create`; tweakcn (third-party, open source) is a visual editor that exports the same variables.
`tailwind.cssVariables` in `components.json` must stay `true` (changing it later means reinstalling components).
Restyle every pair from your palette — default shadcn colors are an instant "template" tell.

## 6. Multi-brand / multi-tenant
Keep one semantic contract and one `@theme inline` mapping; put each brand's values on an attribute:
```css
[data-brand="kiln"]   { --primary: oklch(0.52 0.16 160); --radius-lg: 1rem;  --font-display: "Fraunces Variable", serif; }
[data-brand="glaze"]  { --primary: oklch(0.55 0.19 25);  --radius-lg: 0.25rem; --font-display: "Space Grotesk", sans-serif; }
[data-brand="glaze"][data-theme="dark"] { --primary: oklch(0.72 0.15 25); }
```
Set `data-brand` on `<html>` on the server per tenant (no flash). Brands can override fonts, radii and shadows too —
not just colors. Validate contrast for every brand × mode combination.

## 7. High contrast, forced colors, user preferences
```css
@media (prefers-contrast: more) { :root { --color-text-muted: var(--color-text); --color-border: currentColor; } }
@media (forced-colors: active) {            /* Windows High Contrast: system palette takes over */
  .card { border: 1px solid CanvasText; }   /* box-shadow is removed — give boundaries real borders */
  .btn  { border: 1px solid ButtonText; }
  .icon { forced-color-adjust: auto; }      /* let SVG icons with currentColor follow the system colors */
}
```
Use system colors (`Canvas`, `CanvasText`, `ButtonText`, `Highlight`, `LinkText`) in forced-colors mode; never rely
on background images or shadows to convey state there. Respect `prefers-reduced-transparency` by replacing glass
with solid surfaces where supported.

## 8. Design tokens as data
- **W3C DTCG format** (first stable version 2025.10): `{ "color": { "accent": { "$type": "color", "$value": "…" } } }`,
  aliases `{color.accent}`, plus Color and Resolver modules (the resolver handles light/dark and brand contexts).
- **Style Dictionary 5** (Apache-2.0, ESM, Node ≥ 22) transforms tokens into CSS variables, Tailwind config,
  iOS/Android — DTCG support is first-class; full 2025.10 support is still in progress.
- **Tokens Studio** (Figma plugin) can export DTCG; `@tokens-studio/sd-transforms` 2 bridges to Style Dictionary 5.
- **Figma variables** export natively as DTCG JSON, one file per mode (colors sRGB/HSL, px dimensions; groups become
  slash-separated names).
Pipeline: Figma variables → DTCG JSON in the repo → Style Dictionary → `tokens.css` + Tailwind `@theme` — one source of truth.

## 9. Theme QA checklist
- [ ] Every text/background and UI pair passes AA in **each** theme and brand (`scripts/contrast.mjs`).
- [ ] No flash of the wrong theme on load (hard refresh with each preference; throttled network).
- [ ] System preference respected by default; user choice persists; "System" option available.
- [ ] Native controls, scrollbars and form fields match (`color-scheme`).
- [ ] Images/illustrations/logos work on both backgrounds (swap with `<picture>` + `prefers-color-scheme` if needed).
- [ ] Forced-colors and high-contrast modes keep boundaries and focus visible.
- [ ] Screenshots per theme in the QA run (`screenshot.mjs --dark`).
