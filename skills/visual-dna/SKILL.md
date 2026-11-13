---
name: visual-dna
description: Reverse-engineer the design language of a reference (URL, screenshot, Figma, codebase) into DESIGN.md and tokens, build in that style, or turn an image or mockup into code — studying style without copying identity or source. Use for "make it look like…", "in the style of…", image or screenshot to code, or writing a DESIGN.md.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# Visual DNA

Great designers don't copy pixels — they understand *why* a design works and re-use the
reasons. This skill turns a reference into an explicit, reusable system so the result is
recognizably "in that spirit" while being original, coherent and maintainable.

`<skill-dir>` = the folder containing this SKILL.md.

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Workflow

### 1. Capture the reference

| Input | How to capture |
|---|---|
| **Live URL** | `node <skill-dir>/scripts/extract-tokens.mjs <url>` → measured colors, fonts per role, type scale, radii, shadows, spacing, container widths, motion, `:root` CSS variables, tech hints, plus 1440px and 390px full-page screenshots. Then **look at the screenshots**. Needs Playwright in the project (ask before installing); a browser/Playwright MCP also works. |
| **Screenshot / image / mockup** | View it directly. Estimate measurements from known anchors (body text ≈ 16px, buttons ≈ 40–48px tall, icons 16–24px) and proportions. Sample colors from flat areas. |
| **Figma** | Use a Figma MCP server if connected (variables, styles, frame code). Otherwise ask for exported frames/screens. |
| **Existing codebase** | Read token sources: Tailwind `@theme`/config, CSS variables, theme files, component library config. |
| **Famous brand style** | Check whether a curated DESIGN.md exists (e.g. the community `awesome-design-md` collection) and use it as a starting point — then verify against the live site. |

If several references are given, extract each, then decide explicitly which traits come from which.

### 2. Analyze across the 12 dimensions

Work through [references/dna-dimensions.md](references/dna-dimensions.md): atmosphere, color
roles, typography, spacing rhythm, layout grammar, shape language, depth, imagery,
iconography, motion, component signatures, voice. Measured numbers tell you *what*;
the screenshots tell you *how it feels* — you need both.

### 3. Distill the DNA

Separate the **signature traits** (3–6 things that make it *that* design — e.g. "oversized
tight-tracked grotesk headlines, hairline 1px borders instead of shadows, one electric accent
used only for interactive elements, generous 160px section padding, product UI shown in crisp
dark panels") from **generic traits** every site shares. Reproducing the signature traits is what
makes the result feel right; copying generic traits adds nothing.

### 4. Write the system

- Fill [assets/DESIGN.template.md](assets/DESIGN.template.md) and save it as `DESIGN.md` in the
  project root (or wherever the user wants). Include the signature traits in "Do's and Don'ts".
- Emit tokens in the project's format (CSS variables, Tailwind v4 `@theme`, shadcn variables, a theme
  object). Round measured values onto a clean scale (e.g. 15px/17px → 16px; 23px radius → 24px) —
  reference sites are often inconsistent, your system shouldn't be.
- If the `frontend-forge` skill is installed, its `palette.mjs` and `contrast.mjs` scripts help turn
  sampled colors into full, accessible scales.

### 5. Build — or convert image to code

For **new UI in the extracted style**: build with the tokens, applying the signature traits
deliberately (and the `frontend-forge` workflow if available).

For **image / screenshot → code**:
1. **Structure pass** — identify sections, grid columns, alignment axes; write an ASCII wireframe.
2. **Measure pass** — container width, column gaps, section padding, type sizes per role, radii,
   icon sizes. Express as tokens, not one-off values.
3. **Skeleton** — semantic HTML/components with real layout (grid/flex), responsive from the start;
   infer sensible mobile behavior if only desktop is shown (and say what you inferred).
4. **Style** — apply tokens; match weights, tracking and line-height carefully (they carry most of the
   "feel"); recreate imagery with placeholders that match aspect ratio and tone, or real licensed photos.
5. **Compare** — render at the same viewport width as the reference (`scripts/screenshot.mjs <url>
   --widths <w>`), look at both side by side, list concrete differences (spacing, size, weight, color,
   alignment, missing states), fix, repeat up to three rounds.
6. **Fill the gaps the image can't show** — hover/focus/active states, loading/empty/error, dark mode,
   keyboard behavior — designed in the same language.

## Originality and ethics

Extracting a *style* — spacing rhythm, type feel, color mood, layout grammar, interaction patterns — is
normal design practice. Reproducing someone else's *identity* is not:

- Don't copy logos, wordmarks, trademarks, proprietary illustrations, photography, icons sets under
  restrictive licenses, or marketing copy. Substitute original or properly licensed assets.
- Don't build anything that could be mistaken for the original brand's site (that's how phishing pages
  are made). If a request looks like that, keep the style lessons and change the identity.
- Proprietary fonts need a license; suggest the closest free alternative (e.g. a geometric grotesk with
  similar metrics) and name it as a substitute.
- When the reference is the user's *own* product or brand, all of this is theirs to reuse.

## Output

Deliver: the signature traits (bulleted), the `DESIGN.md` path, the tokens file/changes, what was
measured vs. estimated, substitutions made (fonts, imagery), and — for image-to-code — the remaining
visible differences after the final comparison round.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/extract-tokens.mjs <url> [--out .design-review] [--dark]` | measure a rendered page's design tokens + desktop/mobile screenshots |
| `scripts/screenshot.mjs <url> [--widths 1440] [--dark]` | capture your build at the reference's viewport for side-by-side comparison, plus a health report |
