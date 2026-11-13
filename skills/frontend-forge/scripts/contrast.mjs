#!/usr/bin/env node
// Contrast checker: WCAG 2.x ratio with AA/AAA verdicts, plus APCA Lc as a second opinion.
// Usage: node contrast.mjs <fg> <bg> [<fg> <bg> ...] [--json]
// Colors: #hex, rgb(), oklch().  Example: node contrast.mjs "#6b7280" "#ffffff" "oklch(0.98 0 0)" "#111827"
import { parseColor, wcagRatio, apcaLc, rgbToHex } from "./color-utils.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const colors = args.filter((a) => a !== "--json");

if (colors.length < 2 || colors.length % 2 !== 0) {
  console.error(`Usage: node contrast.mjs <fg> <bg> [<fg> <bg> ...] [--json]
  Colors may be #hex, rgb(r g b) or oklch(L C H). Pass pairs: text color first, background second.`);
  process.exit(2);
}

const rows = [];
for (let i = 0; i < colors.length; i += 2) {
  try {
    const fg = parseColor(colors[i]);
    const bg = parseColor(colors[i + 1]);
    const ratio = wcagRatio(fg, bg);
    const lc = apcaLc(fg, bg);
    rows.push({
      fg: colors[i], bg: colors[i + 1], fgHex: rgbToHex(fg), bgHex: rgbToHex(bg),
      ratio: +ratio.toFixed(2),
      aaText: ratio >= 4.5, aaLarge: ratio >= 3, aaaText: ratio >= 7, aaaLarge: ratio >= 4.5,
      uiComponents: ratio >= 3,
      apcaLc: +lc.toFixed(1),
      apcaVerdict: apcaVerdict(Math.abs(lc)),
    });
  } catch (e) {
    rows.push({ fg: colors[i], bg: colors[i + 1], error: e.message });
  }
}

/** Map |Lc| to the APCA use-case it supports (bronze-level guidance). */
function apcaVerdict(lc) {
  if (lc >= 90) return "excellent: any body text";
  if (lc >= 75) return "good: body text (≥16px regular)";
  if (lc >= 60) return "ok: content text ≥18px or ≥16px bold";
  if (lc >= 45) return "large only: headlines ≥24px / bold ≥18px, icons";
  if (lc >= 30) return "minimum: placeholder, disabled, large non-text";
  if (lc >= 15) return "non-text only: dividers, subtle outlines";
  return "invisible: decorative at best";
}

if (json) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const ok = (b) => (b ? "PASS" : "fail");
  for (const r of rows) {
    if (r.error) { console.log(`✗ ${r.fg} on ${r.bg}: ${r.error}`); continue; }
    console.log(`${r.fgHex} on ${r.bgHex}  →  ${r.ratio}:1   APCA Lc ${r.apcaLc} (${r.apcaVerdict})`);
    console.log(`   AA text ${ok(r.aaText)} · AA large/UI ${ok(r.aaLarge)} · AAA text ${ok(r.aaaText)} · AAA large ${ok(r.aaaLarge)}`);
  }
}
process.exit(rows.some((r) => r.error) ? 1 : 0);
