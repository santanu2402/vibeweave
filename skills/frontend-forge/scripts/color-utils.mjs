// Shared color math for palette.mjs and contrast.mjs. Zero dependencies.
// Conversions follow Björn Ottosson's OKLab definition and the sRGB transfer curve.

const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** sRGB transfer curve: gamma-encoded channel (0..1) → linear light. */
export function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Inverse sRGB transfer curve: linear light → gamma-encoded channel. */
export function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** rgb: {r,g,b} in 0..1 (gamma-encoded sRGB) -> {l,c,h} OKLCH (h in degrees) */
export function rgbToOklch({ r, g, b }) {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 1e-4 ? 0 : H };
}

/** OKLCH -> unclamped sRGB {r,g,b} (may fall outside 0..1 when out of gamut) */
export function oklchToRgbRaw({ l, c, h }) {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr), B = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
  const b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;
  return { r: linearToSrgb(r), g: linearToSrgb(g), b: linearToSrgb(b) };
}

/** True when every channel is inside 0..1 (with a small tolerance for float error). */
export function inGamut({ r, g, b }, eps = 1e-4) {
  return [r, g, b].every((v) => v >= -eps && v <= 1 + eps);
}

/** OKLCH -> sRGB, reducing chroma (binary search) until the color fits the sRGB gamut. */
export function oklchToRgb(color) {
  let rgb = oklchToRgbRaw(color);
  if (!inGamut(rgb)) {
    let lo = 0, hi = color.c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToRgbRaw({ ...color, c: mid }))) lo = mid; else hi = mid;
    }
    rgb = oklchToRgbRaw({ ...color, c: lo });
  }
  return { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) };
}

/** {r,g,b} in 0..1 → "#rrggbb" (clamped). */
export function rgbToHex({ r, g, b }) {
  const h = (v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Parse "#rgb", "#rrggbb", "#rrggbbaa", "rgb(r g b)", "rgb(r, g, b)", "oklch(L C H)" (L as 0..1 or %).
 * Returns {r,g,b} gamma-encoded sRGB in 0..1, or throws.
 */
export function parseColor(input) {
  const s = String(input).trim().toLowerCase();
  let m;
  if ((m = s.match(/^#?([0-9a-f]{3,8})$/))) {
    let hex = m[1];
    if (hex.length === 3 || hex.length === 4) hex = [...hex.slice(0, 3)].map((ch) => ch + ch).join("");
    if (hex.length !== 6 && hex.length !== 8) throw new Error(`Bad hex color: ${input}`);
    return {
      r: parseInt(hex.slice(0, 2), 16) / 255,
      g: parseInt(hex.slice(2, 4), 16) / 255,
      b: parseInt(hex.slice(4, 6), 16) / 255,
    };
  }
  if ((m = s.match(/^rgba?\(([^)]+)\)$/))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3);
    const vals = parts.map((p) => (p.endsWith("%") ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    if (vals.length < 3 || vals.some(Number.isNaN)) throw new Error(`Bad rgb() color: ${input}`);
    return { r: vals[0] / 255, g: vals[1] / 255, b: vals[2] / 255 };
  }
  if ((m = s.match(/^oklch\(([^)]+)\)$/))) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) throw new Error(`Bad oklch() color: ${input}`);
    let l = parts[0].endsWith("%") ? parseFloat(parts[0]) / 100 : parseFloat(parts[0]);
    if (l > 1) l /= 100; // tolerate "62" meaning 62%
    const c = parseFloat(parts[1]);
    const h = parts[2] === "none" ? 0 : parseFloat(parts[2]);
    if ([l, c, h].some(Number.isNaN)) throw new Error(`Bad oklch() color: ${input}`);
    return oklchToRgb({ l, c, h });
  }
  throw new Error(`Unsupported color format: ${input} (use #hex, rgb() or oklch())`);
}

/** WCAG 2.x relative luminance */
export function luminance({ r, g, b }) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG 2.x contrast ratio (1..21) between two colors; order doesn't matter. */
export function wcagRatio(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** APCA-W3 0.1.9 lightness contrast (Lc). Positive = dark text on light bg, negative = light on dark. */
export function apcaLc(text, bg) {
  const y = ({ r, g, b }) => 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4;
  const blkThrs = 0.022, blkClmp = 1.414;
  const soft = (v) => (v > blkThrs ? v : v + (blkThrs - v) ** blkClmp);
  const yt = soft(y(text)), yb = soft(y(bg));
  if (Math.abs(yb - yt) < 0.0005) return 0;
  let out;
  if (yb > yt) {
    const sapc = (yb ** 0.56 - yt ** 0.57) * 1.14;
    out = sapc < 0.1 ? 0 : sapc - 0.027;
  } else {
    const sapc = (yb ** 0.65 - yt ** 0.62) * 1.14;
    out = sapc > -0.1 ? 0 : sapc + 0.027;
  }
  return out * 100;
}

/** {l,c,h} → CSS "oklch(62.0% 0.190 255.0)". */
export function fmtOklch({ l, c, h }) {
  return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
}
