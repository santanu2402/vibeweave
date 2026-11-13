# Real lighting effects
**What:** surfaces that react to a light source — specular highlights that follow the pointer, embossed
"lit" text and shapes, metallic and glossy materials, rim light. **Use for:** premium product heroes,
hardware, tactile/skeuomorphic UIs, one signature element. **Avoid when:** body content or dense UI.

**Accessibility:** lighting is decorative; text stays readable in every light position (check contrast at the
brightest highlight); pointer-driven light is mouse-only and off under reduced motion (keep a static, pleasant
light position). **Performance:** CSS gradients and SVG lighting filters repaint the element on move — keep
them to one or two elements; for full scenes use WebGL (motion-forge `3d-and-rich-media.md`).

### 1. Specular sheen that follows the pointer (CSS)
A glossy surface reflects a bright, tight highlight where light hits it; a matte one shows a broad, soft one.
```css
.gloss { --lx: 30%; --ly: 20%; position: relative; isolation: isolate; border-radius: var(--radius-lg, 20px);
  background: linear-gradient(160deg, oklch(0.32 0.03 260), oklch(0.18 0.02 260)); }
.gloss::before { /* specular: small, bright — raise the 16% to ~35% for a matte material */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; mix-blend-mode: screen;
  background: radial-gradient(circle at var(--lx) var(--ly), oklch(1 0 0 / .45), oklch(1 0 0 / .08) 16%, transparent 45%); }
.gloss::after { /* rim light along the edge facing the light */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; padding: 1px;
  background: linear-gradient(calc(var(--angle, 135) * 1deg), oklch(1 0 0 / .5), transparent 40%);
  -webkit-mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0); }
```
```js
const el = document.querySelector(".gloss");
if (matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--lx", `${x * 100}%`); el.style.setProperty("--ly", `${y * 100}%`);
    el.style.setProperty("--angle", String(Math.atan2(y - 0.5, x - 0.5) * 180 / Math.PI + 180));   // rim faces the light
  });
}
```

### 2. True lighting with SVG filters (embossed, lit text or shapes)
`feSpecularLighting` / `feDiffuseLighting` compute light per pixel from a height map (here: the blurred
alpha of the element — the "bump"). Move the `fePointLight` and the surface really responds.
```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="lit" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="bump"/>
    <feSpecularLighting in="bump" surfaceScale="5" specularConstant="0.9" specularExponent="28" lighting-color="#fff" result="spec">
      <fePointLight id="lit-light" x="80" y="20" z="160"/>
    </feSpecularLighting>
    <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
    <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
  </filter>
</svg>
<h1 class="lit-title" style="filter: url(#lit)">Fired at 1240°C</h1>
```
```js
const light = document.getElementById("lit-light"), title = document.querySelector(".lit-title");
title.addEventListener("pointermove", (e) => { const r = title.getBoundingClientRect();
  light.setAttribute("x", String(e.clientX - r.left)); light.setAttribute("y", String(e.clientY - r.top)); });
```
Tune: `surfaceScale` = bump height, `specularExponent` = shininess (higher = tighter, glossier), light `z` =
distance (higher = softer, more even). Swap in `feDiffuseLighting` for matte clay/paper, or `feDistantLight
azimuth elevation` for sunlight.

### 3. Materials cheat sheet (CSS)
| Material | Recipe |
|---|---|
| Brushed metal | `repeating-linear-gradient(90deg, oklch(0.8 0 0) 0 1px, oklch(0.72 0 0) 1px 3px)` + a soft diagonal sheen |
| Polished metal / chrome | `conic-gradient(from 210deg, #f4f4f5, #9ca3af, #ffffff, #6b7280, #f4f4f5)` + specular highlight |
| Glass | see styles.md Glassmorphism / Liquid Glass (backdrop blur + inner highlight + edge) |
| Clay / plastic | soft diffuse gradient + inner shadows (styles.md Claymorphism) |
| Paper | flat color + 4–6% grain (`feTurbulence`) + very soft contact shadow |

**Consistency rule:** one light source for the whole page (usually top-left or top). Highlights, shadows
(`realistic-shadows.md`) and gradients must all agree with it — mixed light directions read as fake instantly.
