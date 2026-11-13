# The 12 Dimensions of Design DNA

For each dimension: what to look for, how to measure, and how to write it down. Aim for
statements specific enough that another designer could reproduce the feel without seeing the
reference.

## 1. Atmosphere
- Three adjectives that describe the overall feel (e.g. "calm, technical, expensive").
- Light/dark default, contrast level (soft vs stark), energy (still vs kinetic).
- Write: *"Quiet confidence: mostly white space and type, one saturated accent, nothing moves unless you touch it."*

## 2. Color roles
- Background(s) and how many surface levels; text and muted text; border color; the accent(s) and
  *where* they appear (only CTAs? links? illustrations?); semantic colors.
- Measure: `extract-tokens.mjs` text/background/border lists (usage-weighted); `:root` variables.
- Note proportion (e.g. "90% neutral, accent < 3% of area") and temperature of neutrals (cool/warm tinted).

## 3. Typography
- Families per role (display, body, UI, mono); weights used; size scale and ratio; line-heights;
  tracking (tight display? tracked caps labels?); casing conventions; italic/serif usage.
- Measure: samples by role (h1…h6, body, button, nav), size list. Compute ratio between adjacent steps.
- Write: *"Display: tight grotesk, 600, −0.04em, 1.0 leading at 64–96px. Body 16/26 neutral sans. Labels: 12px mono uppercase +0.06em."*

## 4. Spacing rhythm
- Base unit (4 or 8), component padding, gaps between related items, section padding, density.
- Measure: spacing frequency list; section padding from screenshots; container widths.

## 5. Layout grammar
- Container width; column count; alignment (centered vs flush-left); symmetry vs asymmetry; how
  sections alternate; hero composition; recurring patterns (bento, zig-zag, sticky scroll, full-bleed).
- Sketch the page as an ASCII wireframe of sections.

## 6. Shape language
- Radius personality and scale (sharp, crisp, soft, pill); nested radius behavior; borders vs fills;
  line weights; dividers; any signature shapes (blobs, notches, cut corners).

## 7. Depth & elevation
- Shadows (count of levels, softness, tint), borders as separators, translucency/blur, layering,
  3D/perspective. Dark-mode depth via lighter surfaces?

## 8. Imagery
- Photography vs illustration vs 3D vs product UI; color grading; crops; framing (device mockups?
  floating panels? full-bleed?); image-to-text ratio; texture/grain.

## 9. Iconography
- Library or custom; outline vs filled; stroke width; size relative to text; usage density.

## 10. Motion
- What moves (entrances, hover, scroll, page transitions), durations and easing (measured), intensity,
  signature moments (scroll-scrubbed product reveal? kinetic headline?). Check reduced-motion behavior.

## 11. Component signatures
- Buttons (shape, size, hierarchy, hover), inputs, cards, nav (sticky? blurred? centered pill?), tabs,
  badges, tables, footers. Note any component that is distinctively *theirs*.

## 12. Voice
- Headline style (short declarative? playful? technical?), casing, sentence length, use of numbers,
  CTA verbs, personality in microcopy.

---

## Signature vs generic — the distillation test
For each trait ask: "If I removed this, would someone still recognize the style?" If yes, it's
generic. Keep the 3–6 traits that fail that test; those are the DNA.

## Measuring from a static image
- Calibrate with an anchor: body text x-height or a 16px paragraph, a standard 40–48px button, a
  24px icon. Derive other sizes by ratio.
- Use the image's pixel width vs. the likely viewport (1440, 1280, 390) to convert; retina
  screenshots are often 2× — halve values.
- Colors: sample flat areas away from anti-aliased edges; JPEG compression shifts colors slightly —
  round to a coherent palette rather than trusting each pixel.
- Fonts: identify by distinctive glyphs (a, g, R, Q, numerals); if uncertain, pick the closest
  free match and say so.
