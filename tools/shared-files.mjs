// Single source of truth for files shared between skills.
// Each skill must stay self-contained (people install skills individually), so shared helpers are
// copied — not symlinked — from the canonical location into each consumer skill.
// Edit the canonical file, then run: node tools/sync-shared.mjs
export const SHARED = [
  { from: "skills/frontend-forge/scripts/audit.mjs", to: ["skills/ui-audit/scripts/audit.mjs", "skills/ui-test/scripts/audit.mjs"] },
  { from: "skills/frontend-forge/scripts/contrast.mjs", to: ["skills/ui-audit/scripts/contrast.mjs"] },
  { from: "skills/frontend-forge/scripts/color-utils.mjs", to: ["skills/ui-audit/scripts/color-utils.mjs"] },
  { from: "skills/frontend-forge/scripts/screenshot.mjs", to: [
    "skills/ui-audit/scripts/screenshot.mjs", "skills/visual-dna/scripts/screenshot.mjs",
    "skills/ui-test/scripts/screenshot.mjs", "skills/ui-debug/scripts/screenshot.mjs", "skills/ux-audit/scripts/screenshot.mjs",
  ] },
  { from: "skills/ui-test/scripts/wiring.mjs", to: ["skills/ux-audit/scripts/wiring.mjs"] },
  { from: "skills/ui-test/scripts/responsive.mjs", to: ["skills/frontend-forge/scripts/responsive.mjs"] },
  { from: "skills/frontend-forge/assets/DESIGN.template.md", to: ["skills/visual-dna/assets/DESIGN.template.md"] },
];
