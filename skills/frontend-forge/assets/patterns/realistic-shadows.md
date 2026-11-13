# Realistic shadows (layered, light-aware)
**What:** shadows that look like real light — several stacked layers (contact + ambient + key), tinted by
the surface hue, consistent with one light direction, and growing with elevation. **Use for:** cards,
dialogs, floating buttons, product shots. **Avoid when:** flat/brutalist directions (use borders or hard
offset shadows instead).

**Why it works (the math):** real shadows have a tight, dark core near the object (contact/occlusion) and a
wide, faint penumbra farther out. Stacking 4–6 layers where each layer **doubles** offset and blur while
alpha **falls** approximates that falloff far better than one big blur. Offsets follow the light
direction: `x = cos(θ) · d`, `y = sin(θ) · d` for a light at angle θ, distance d growing with elevation.

**Accessibility:** shadows are decoration — never the only boundary for inputs (keep a ≥ 3:1 border).
**Performance:** static shadows are cheap; don't animate large `box-shadow` on scroll — animate the
`opacity` of a pseudo-element that holds the bigger shadow.

```css
:root {
  /* hue-tinted shadow color (not black): same hue as the background, low lightness */
  --shadow-color: 260 30% 20%;           /* HSL triplet keeps alpha math simple; or oklch(0.25 0.03 260 / a) */
  --light-x: 0;  --light-y: 1;           /* light from the top: shadows fall down (set x to 0.5 for top-left light) */
  --shadow-1:  /* resting card */
    calc(var(--light-x) * 0.5px) calc(var(--light-y) * 0.5px) 1px hsl(var(--shadow-color) / .10),
    calc(var(--light-x) * 1px)   calc(var(--light-y) * 1px)   2px hsl(var(--shadow-color) / .09),
    calc(var(--light-x) * 2px)   calc(var(--light-y) * 2px)   4px hsl(var(--shadow-color) / .07);
  --shadow-2:  /* raised / hover */
    calc(var(--light-x) * 1px)  calc(var(--light-y) * 1px)  2px  hsl(var(--shadow-color) / .08),
    calc(var(--light-x) * 2px)  calc(var(--light-y) * 2px)  4px  hsl(var(--shadow-color) / .08),
    calc(var(--light-x) * 4px)  calc(var(--light-y) * 4px)  8px  hsl(var(--shadow-color) / .07),
    calc(var(--light-x) * 8px)  calc(var(--light-y) * 8px)  16px hsl(var(--shadow-color) / .06),
    calc(var(--light-x) * 16px) calc(var(--light-y) * 16px) 32px hsl(var(--shadow-color) / .05);
  --shadow-3:  /* dialog / floating */
    calc(var(--light-x) * 2px)  calc(var(--light-y) * 2px)  4px  hsl(var(--shadow-color) / .07),
    calc(var(--light-x) * 4px)  calc(var(--light-y) * 4px)  8px  hsl(var(--shadow-color) / .07),
    calc(var(--light-x) * 8px)  calc(var(--light-y) * 8px)  16px hsl(var(--shadow-color) / .07),
    calc(var(--light-x) * 16px) calc(var(--light-y) * 16px) 32px hsl(var(--shadow-color) / .06),
    calc(var(--light-x) * 32px) calc(var(--light-y) * 32px) 64px hsl(var(--shadow-color) / .05);
}
.card { box-shadow: var(--shadow-1); position: relative; }
.card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: var(--shadow-2);
  opacity: 0; transition: opacity var(--dur-base, 220ms) var(--ease-out, ease-out); pointer-events: none; }
.card:hover::after { opacity: 1; }                                   /* animate opacity, not box-shadow */
/* dark mode: shadows barely show — use lighter surfaces for elevation and a faint top highlight instead */
@media (prefers-color-scheme: dark) { :root { --shadow-color: 260 40% 2%; } .card { box-shadow: var(--shadow-1), inset 0 1px 0 oklch(1 0 0 / .06); } }
```
**Contact shadow under a floating object** (product image, 3D-looking button):
```css
.floating { position: relative; }
.floating::before { content: ""; position: absolute; left: 15%; right: 15%; bottom: -12px; height: 18px; border-radius: 50%;
  background: radial-gradient(closest-side, hsl(var(--shadow-color) / .35), transparent); filter: blur(4px); z-index: -1; }
```
**Shadows for transparent PNGs/SVGs:** `filter: drop-shadow(0 8px 16px hsl(var(--shadow-color) / .18))` follows
the alpha shape (box-shadow can't). **Moving light:** set `--light-x/--light-y` from the pointer (see `lighting.md`)
so every shadow on the page shifts together — one light source, consistent everywhere.
