# Color

## Contents
1. Work in OKLCH
2. Palette architecture (roles, not hues)
3. Proportion and accent discipline
4. Dark mode
5. Contrast rules
6. Gradients that don't turn to mud
7. Curated starter palettes (all AA-verified)

## 1. Work in OKLCH

`oklch(L C H)` — Lightness 0–1, Chroma ~0–0.37, Hue 0–360°. Unlike HSL, equal lightness
steps *look* equal across hues, so a scale built in OKLCH has consistent contrast at each step,
and swapping hue (for themes or status colors) doesn't wreck legibility. All evergreen browsers
support it; Tailwind v4 and shadcn/ui ship their palettes in OKLCH.

Build scales with the bundled script:
```bash
node <skill-dir>/scripts/palette.mjs "#0e7c86" --name brand --neutral      # CSS variables
node <skill-dir>/scripts/palette.mjs "oklch(0.6 0.2 30)" --format tailwind # Tailwind v4 @theme
```
Mix tints in CSS without new tokens: `color-mix(in oklch, var(--accent) 15%, var(--bg))`.
Derive hover states relatively: `oklch(from var(--accent) calc(l - 0.06) c h)`.

## 2. Palette architecture (roles, not hues)

Components should reference *roles*; roles reference *scales*. Then a rebrand or dark mode is
just remapping roles.

| Role | Purpose | Typical mapping (light) |
|---|---|---|
| `--bg` | page background | neutral-50 or white |
| `--surface` / `--surface-2` | cards, panels, popovers | white / neutral-100 |
| `--text` | primary text | neutral-900/950 |
| `--text-muted` | secondary text (must still pass 4.5:1) | neutral-600/700 |
| `--border` / `--border-strong` | dividers / input outlines (inputs need 3:1) | neutral-200 / neutral-400+ |
| `--accent` / `--accent-hover` | primary actions, links, selection | brand-600 / brand-700 |
| `--on-accent` | text on accent | white or brand-950 |
| `--accent-soft` | tinted backgrounds, badges | brand-50/100 |
| `--focus` | focus ring (≥3:1 against adjacent colors) | brand-500 or a contrasting hue |
| `--success` `--warning` `--danger` `--info` | status (+ `-soft` variants) | green/amber/red/blue 600 |

Tint your neutrals with a whisper of the brand hue (chroma 0.005–0.02) — "designed gray" reads
warmer and more intentional than pure gray. `palette.mjs --neutral` does this.

## 3. Proportion and accent discipline

- **60 / 30 / 10**: ~60% dominant neutral, ~30% secondary surface/brand tone, ≤10% accent.
- The accent marks *what to do next* — primary buttons, active states, key links. If everything
  is accent, nothing is.
- One primary action color per view. Secondary actions are neutral (outline/ghost).
- Status colors are for status. Don't use danger-red as a brand color in a product with errors.
- Bold palettes are fine — saturated backgrounds, two-color brand systems — as long as the
  roles stay disciplined and text passes contrast.

## 4. Dark mode

Design it; don't invert it.
- Background: hue-tinted dark, roughly `oklch(0.14–0.20 0.01–0.02 H)`. Pure `#000` causes
  smearing on OLED scroll and makes elevation impossible.
- **Elevation = lighter surface** (not shadow): bg L≈0.16, surface L≈0.20, raised L≈0.24.
- Text: off-white `oklch(0.95 0.005 H)`; muted ≈ L 0.70. Avoid pure white body text on large areas.
- Accents: lift lightness and reduce chroma slightly vs light mode so they don't vibrate.
- Borders: `oklch(1 0 0 / 0.08–0.14)` hairlines.
- Shadows mostly disappear; use subtle glows or borders for separation.
- Images: consider slightly reduced brightness (`filter: brightness(.92)`) for big photos.
- Implement with tokens + `prefers-color-scheme` and/or a `.dark` / `[data-theme]` class;
  set `color-scheme: light dark` so form controls and scrollbars adapt.

## 5. Contrast rules

WCAG 2.2 AA (the legal baseline in most jurisdictions):
- Body text **≥ 4.5:1**; large text (≥ 24px, or ≥ 18.66px bold) **≥ 3:1**.
- UI components and meaningful graphics (input borders, icons, focus rings, chart lines) **≥ 3:1**
  against adjacent colors (SC 1.4.11).
- Placeholder text should still be readable; disabled controls are exempt but should look intentional.
- Never encode meaning by color alone — add icons, labels, patterns.

APCA (the perceptual model being developed for future WCAG) is a useful second opinion,
especially for dark mode and thin fonts: aim for Lc ≥ 75 body, ≥ 60 secondary, ≥ 45 large
headings. `scripts/contrast.mjs` prints both.

Text over images: add a scrim (`linear-gradient(to top, oklch(0 0 0 / .65), transparent)`),
a solid backing, or choose image areas with calm tone — and verify the worst-case spot.

## 6. Gradients that don't turn to mud

- Interpolate in OKLCH: `linear-gradient(in oklch, var(--a), var(--b))` — keeps midpoints vivid.
  For hue sweeps, `in oklch longer hue` goes the long way around the wheel.
- Keep gradients within ~60° of hue for elegance; adjacent hues read as *light*, distant hues
  read as *rainbow*.
- Add 3–6% noise/grain over large gradients to prevent banding.
- Gradients should mean something (light source, energy, brand) — not fill emptiness.

## 7. Curated starter palettes (all AA-verified)

Every pair below was checked with `scripts/contrast.mjs`: text/bg, muted/bg and
on-accent/accent all ≥ 4.5:1. Use them as starting points, then shift hue toward the brief.

| Name | Mood / use | bg | text | muted | accent | on-accent | extra |
|---|---|---|---|---|---|---|---|
| Glacier | trustworthy SaaS | `#F7F9FC` | `#0E1726` | `#5B6B82` | `#1F5EFF` | `#FFFFFF` | border `#DCE3EE` |
| Forest Ledger | fintech, sustainability | `#F5F7F4` | `#12261E` | `#55675E` | `#0F6B4F` | `#FFFFFF` | gold `#C9A227` (decorative) |
| Ink & Vermilion | editorial, culture | `#FBFAF7` | `#141414` | `#5E5A55` | `#D2361F` | `#FFFFFF` | rules `#E6E2DA` |
| Midnight Signal | dark dev-tool | `#0F141C` | `#E6EAF2` | `#9AA4B5` | `#5EEAD4` | `#04201B` | surface `#161C26` |
| Electric Citrus | neo-brutal, creator | `#FFF8E7` | `#111111` | `#4A4A4A` | `#FFD23F` | `#111111` | pink `#FF5DA2`, blue `#3D7BFF` (both take `#111` text) |
| Moss & Plum | organic, craft | `#F1F3EC` | `#1F2A1F` | `#5A6656` | `#4F6B2A` | `#FFFFFF` | plum `#7A3E6B` |
| Noir Champagne | luxury, hospitality | `#141517` | `#F2EEE6` | `#A39E94` | `#C8A96A` | `#141517` | hairline `#2A2B2E` |
| Sorbet | playful consumer | `#FFF5F8` | `#2A1631` | `#6E5A73` | `#D61F69` | `#FFFFFF` | sun `#FFB020` (dark text) |
| Clinic Clear | healthcare | `#F6FAFB` | `#0B2A33` | `#4E6870` | `#0E7C86` | `#FFFFFF` | soft `#E3F2F3` |
| Arcade Night | gaming, events | `#120B1F` | `#F4F0FF` | `#B3A8CC` | `#FF3D81` | `#120B1F` | cyan `#29E3FF` |
| Paper Terminal | light dev / docs | `#FAFAF7` | `#1A1B1E` | `#61646B` | `#C2410C` | `#FFFFFF` | code green `#2F9E44` |
| Deep Ocean | travel, maritime | `#F4F8F9` | `#0A2230` | `#4A6472` | `#00618A` | `#FFFFFF` | sand `#E9D8B4` |

More inspiration: Realtime Colors (preview a palette on a live layout), Huemint (ML palettes
by role), Coolors, oklch.com (OKLCH picker), Radix Colors (accessible 12-step scales), the
Tailwind v4 default palette (OKLCH).
