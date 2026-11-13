---
name: frontend-forge
description: Design and build distinctive, production-grade UI: art direction, design tokens, 22 UI styles (glassmorphism, liquid glass, neumorphism, claymorphism, brutalism, bento, spatial, minimal…), color, typography, layout, components, 260+ icon sets, fonts, logos and an original pattern library — in React, Next.js, Vue, Svelte, Astro, HTML, Tailwind or shadcn. Use for building, styling, theming or redesigning any page or component, or making UI look premium.
license: MIT
metadata:
  author: santanu2402
  version: "2.0.0"
  repository: https://github.com/santanu2402/vibeweave
---

# Frontend Forge

Act as a design lead and a senior frontend engineer in one person. The bar: someone who
sees the result should believe a talented human studio made it *for this specific product*
— not that a model produced the average of the internet.

**Why this skill exists.** Language models drift toward the statistical center of every
choice: Inter, a purple-to-blue gradient, a centered hero with two buttons, three identical
cards, a fade-up on every section. Each default is harmless alone; together they read as
"generated" and make a product look cheap. This skill pulls you off that center *on purpose*
while holding the quality floor (accessibility, responsiveness, performance) that serious
teams never skip.

`<skill-dir>` below means the folder that contains this SKILL.md (for example
`.claude/skills/frontend-forge`, `.agents/skills/frontend-forge`, `.cursor/skills/frontend-forge`).

Whole-system map (every skill, subagent, script and when to use it): `../vibeweave/references/system-map.md` if installed.

## Workflow

Scale the process to the ask. A button tweak needs step 6 only; a new landing page or app
needs all eight. Steps 3–5 can be a few lines of thinking — but do them before code.

1. **Read the room** – existing stack, tokens, constraints
2. **Brief** – subject, audience, job, feeling
3. **Direction** – style family, concept, signature element, three dials
4. **Design system** – tokens before components
5. **Layout** – wireframe every section
6. **Build** – semantic, responsive, every state, real content
7. **Motion** – purposeful, never decorative noise
8. **Verify** – scripts, screenshots, critique loop

### 1. Read the room

Before inventing anything, look at what already exists:

- `package.json` → framework, styling approach (Tailwind v3 vs v4, CSS Modules, styled-components),
  component library (`components.json` means shadcn/ui), animation libraries already installed.
- Existing tokens: `@theme` blocks (Tailwind v4), `tailwind.config.*`, CSS custom properties,
  theme files, a `DESIGN.md`, brand guidelines, Figma links.
- **Inside an established product, extend its system** — consistency beats novelty there. Your
  creative latitude is widest on greenfield pages, marketing sites and prototypes.
- Prefer what's installed. Ask before adding a new UI framework or a heavy dependency.

If the user wants to match a reference site or screenshot, use the `visual-dna` skill (if
installed) to extract its design language first. If they want an existing UI critiqued, use `ui-audit`.

### 2. Brief

Pin down four lines (in your reply or in `DESIGN.md`):

- **Subject** — what is this, concretely?
- **Audience** — who, in what context (a phone at the gym? an analyst on three monitors?)
- **Primary job** — the one action or understanding the screen must deliver
- **Feeling** — two or three adjectives ("calm, precise, expensive")

**New page, site or app with a thin prompt?** Interview before you design: one batched round of
≤ 4 questions with concrete options and your recommended answer first (what it is + primary
action, audience + device, scope, feeling/references), a second round only for material gaps,
then a short written brief the user approves. The `vibeweave` skill (if installed) runs the full
protocol — question bank, direction cards, `REQUIREMENTS.md` — and the whole test/optimize/fix crew
afterwards. **Small or precise asks** (a component, a restyle, a clear spec): infer the rest from
the product name and domain, state the assumptions in one line, and keep moving.

### 3. Direction

- **Originality first — presets and blueprints are references, not templates.** Copying them makes every site
  look the same. Use them like this:
  - [references/site-blueprints.md](references/site-blueprints.md) is a *checklist* of what a site type must cover
    (job, KPI, must-haves, pitfalls) — choose your own section order, layout and signature element.
  - Presets (`node <skill-dir>/scripts/preset.mjs list --for <type>`) show what the *obvious* answer looks like —
    design away from it. Apply one unchanged only when the user picks it by name or asks for a quick prototype.
  - Seed fresh directions with `node <skill-dir>/scripts/novelty.mjs ideas "<brief keywords>"` (random metaphor ×
    palette strategy × type approach × layout × signature × motion, avoiding combos already used), and derive
    tokens from the brief (brand color, the subject's materials and imagery) with `palette.mjs` and `fonts.mjs`.
  - Before showing a direction, run `node <skill-dir>/scripts/novelty.mjs check <tokens file>`: it fingerprints
    fonts, accent, background temperature and radius against every preset **and the user's past projects**; a
    TOO CLOSE result means change at least two of the matching traits. After shipping, `novelty.mjs record` it.
- **Pick a style family** from [references/styles.md](references/styles.md) — or a deliberate
  blend of at most two. Sanity-check fit with [references/industry-playbook.md](references/industry-playbook.md),
  then consider one unexpected-but-appropriate move. The playbook gives you the safe answer; your
  job is the *right* answer.
- **Write the concept in one sentence** tying subject to style: *"A field notebook for
  birdwatchers: kraft-paper tones, a hand-set serif, specimen-label UI."* Every later decision
  should be traceable back to this sentence.
- **Choose one signature element** — the thing people will remember: an interactive hero, an
  oversized typographic moment, a custom illustration system, a scroll-driven story, a
  surprising material. Concentrate boldness there and keep everything else disciplined.
- **Set three dials (1–10)** and let them govern decisions:

| Dial | 1–3 | 4–6 | 7–10 |
|---|---|---|---|
| **Variance** | conventional, symmetric grid | asymmetric moments, broken grid accents | editorial / experimental layouts |
| **Motion** | state transitions only | + entrance choreography, scroll reveals | scroll-driven narrative, 3D, physics |
| **Density** | airy, gallery, luxury | standard marketing | dashboards, pro tools |

Defaults when unspecified — marketing site 6/5/4 · SaaS app 3/3/7 · portfolio 8/7/3 ·
e-commerce 4/4/6 · docs 2/2/6 · dashboard 2/2/8. If the user names a vibe ("make it wild",
"keep it corporate"), move the dials to match.

### 4. Design system — tokens before components

Define tokens first, then build only with tokens. One-off hard-coded values are how designs
drift into incoherence, and tokens are what make a theme switch or rebrand a 5-minute job.

- **Color** — 4–6 named *roles* (background, surface, text, muted text, border, accent, plus
  semantic success/warning/danger). Work in OKLCH so lightness steps are perceptually even.
  Generate scales with `node <skill-dir>/scripts/palette.mjs "<brand color>" --neutral`, verify
  pairs with `node <skill-dir>/scripts/contrast.mjs <fg> <bg>`. Details: [references/color.md](references/color.md).
- **Type** — one or two families chosen on purpose, a modular scale, fluid `clamp()` sizes for
  display text. Pairings and rules: [references/typography.md](references/typography.md). Search
  ~2,100 open-source families and get loading code: `node <skill-dir>/scripts/fonts.mjs search
  --category serif --variable` then `fonts.mjs info <id>`.
- **Space** — 4px base: 4 8 12 16 24 32 48 64 96 128. Use larger jumps between sections than
  within them; rhythm comes from contrast in spacing, not uniformity.
- **Shape** — pick a radius personality (0 = brutal/editorial, 4–8 = crisp, 12–20 = friendly,
  pill = playful) and apply it consistently. Nested radius = outer radius − padding.
- **Depth** — two or three elevation levels; tint shadows with the background hue instead of
  black at 10%.
- **Motion** — duration and easing tokens (see step 7).

Express tokens as CSS custom properties and map them into the framework (Tailwind v4 `@theme`,
Tailwind v3 `theme.extend`, shadcn CSS variables, a theme object). The *shape* of a token file
(the values are placeholders — derive yours from the brief):

```css
:root {
  --color-bg: oklch(0.985 0.003 250);   --color-surface: oklch(0.955 0.006 250);
  --color-text: oklch(0.23 0.02 260);   --color-text-muted: oklch(0.50 0.02 260);
  --color-border: oklch(0.89 0.01 260); --color-accent: oklch(0.56 0.17 155);
  --color-on-accent: oklch(0.99 0 0);   --color-focus: oklch(0.62 0.19 255);
  --font-display: "Bricolage Grotesque", system-ui, sans-serif;
  --font-body: "Hanken Grotesk", system-ui, sans-serif;
  --text-base: 1rem; --text-lg: 1.25rem; --text-xl: clamp(1.5rem, 1.2rem + 1.2vw, 2rem);
  --text-display: clamp(2.75rem, 1.4rem + 5.2vw, 6rem);
  --space-1: .25rem; --space-2: .5rem; --space-4: 1rem; --space-8: 2rem; --space-16: 4rem;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
  --shadow-1: 0 1px 2px oklch(0.3 0.02 260 / .08);
  --shadow-2: 0 12px 32px -8px oklch(0.3 0.02 260 / .18);
  --ease-out: cubic-bezier(.22, 1, .36, 1); --dur-fast: 140ms; --dur-base: 220ms;
}
```

For anything bigger than a single page, persist the system to a `DESIGN.md` at the project
root using [assets/DESIGN.template.md](assets/DESIGN.template.md). Future sessions — and other
agents — then stay consistent instead of re-inventing the look each time.

### 5. Layout

- **Wireframe each section** as a tiny ASCII sketch plus a one-line purpose before writing
  code. It forces real hierarchy decisions instead of stacking default sections.
- **The hero is a thesis.** Lead with the most characteristic thing about the subject — the
  product itself working, a striking typographic statement, an image that could only belong
  to this brand. "Headline + subtext + two buttons + screenshot" is a fallback, not a default.
- **Vary section rhythm.** Alternate density, width, alignment and background. Not every
  section is a centered H2 above three cards.
- **Structure must encode information.** Numbered markers only for real sequences, dividers
  only for real groupings, cards only when items are truly parallel.
- Grids, hero patterns, alternatives to the 3-card row, bento recipes, responsive rules:
  [references/layout.md](references/layout.md).

### 6. Build

- **Semantic HTML first** — landmarks (`header`, `nav`, `main`, `footer`), `button` for actions
  and `a` for navigation, real lists, `label`s for every input, one `h1`, ordered headings.
- **Mobile-first and fluid** — design for 360–390px, then 768px, then 1280px+. Use `clamp()`,
  `min()`, container queries and `min-h-dvh` instead of fixed pixel widths and `100vh`.
- **Every state** — default, hover, `:focus-visible`, active, disabled, loading; data views
  also need empty, skeleton, error and partial states. Matrix and patterns:
  [references/components.md](references/components.md).
- **Real content** — write specific copy for this product in its voice. No lorem ipsum, no
  "Feature 1", no fake "10k+ happy users" stats. Use real-looking data in dashboards.
- **Imagery** — real photography (Unsplash, Pexels) or purposeful illustration/SVG, always with
  `alt` text and explicit `width`/`height` or `aspect-ratio`. Never ship broken placeholder URLs.
- **Icons** — one consistent set at consistent stroke and size; emoji are not UI icons. Search
  260+ open-source sets (Lucide, Phosphor, Tabler, Material Symbols, Remix, brand logos, animated
  line-md…) and write them as components with `node <skill-dir>/scripts/icons.mjs search "cart"`
  then `icons.mjs get lucide:shopping-cart --format react --out src/components/icons --stroke 1.75`
  — it records each icon's license in `ICONS.md`. Logos, favicons, blobs, waves and patterns:
  [references/icons-logos-shapes.md](references/icons-logos-shapes.md).
- **Libraries** — use what the project has. If shadcn/ui is present, compose from it but restyle
  through tokens so it doesn't look like default shadcn. For special effects, borrow from
  registries (Magic UI, Aceternity UI, 21st.dev, React Bits…) and restyle to the tokens. Pull
  source from open registries, GitHub and Uiverse with a license record (CodePen and 21st.dev
  aren't scraped — export pens yourself, use the 21st MCP):
  `node <skill-dir>/scripts/fetch-ui.mjs @magicui/marquee` (study or adapt — check the license
  before shipping). Catalog and when to use what: [references/libraries.md](references/libraries.md).
- **Tools** — if MCP servers are connected (shadcn, 21st.dev Magic, Figma, Playwright, Chrome
  DevTools), use them: pull real component source, read design files, look at the rendered page.
- **Dark mode** — design it, don't invert it: lighter surfaces for elevation, desaturated
  accents, hue-tinted near-black backgrounds.
- Framework specifics (Next.js, Tailwind v4, shadcn, Vue/Nuxt, Svelte, Astro, Angular, React
  Native, Flutter, plain HTML): [references/stacks.md](references/stacks.md).

**Build guardrails — check each before moving on** (the basics a review crew should never find):
- **Grids:** tracks are `minmax(0, 1fr)`; place *every* child explicitly at each breakpoint (auto-placed
  children land in 0-width tracks); 12-column grids collapse to 1 column on phones (11 gaps × 2rem > 320px).
- **First screen:** the LCP / above-the-fold content (headline, lead paragraph, hero image) paints at
  full opacity — never behind a fade-in or animation delay. The primary action is visible at 375px.
- **No-JS:** content is visible without JavaScript; "before reveal" states live under a `.js` class.
- **Scrollable regions** (`overflow: auto` code blocks, table wrappers, carousels) get `tabindex="0"`,
  `role="region"` and an `aria-label`, so keyboard users can scroll them.
- **Auto-moving content** (marquee, ticker, carousel, any loop > 5s) pauses on hover and focus and has a
  visible Pause button with `aria-pressed` (WCAG 2.2.2).
- **Reduced motion** = no movement *and* no delays (`animation-delay: 0s` too), so nothing waits hidden.
- **Links inside text** are underlined, not color-only — footers and legal lines included.
- **Measure:** body and docs text at `max-width ≈ 62–65ch` (≈ 60–75 characters; a `ch` is the width of
  "0", so 70ch runs ~80+ characters).
- **Shared chrome:** every page, 404 included, has the same nav and footer/contact.
- **Proof:** every claim (numbers, "WCAG AA", "used by…") links to its evidence or docs.
- **No placeholders ship:** no `{{…}}`, lorem ipsum or "TBD"; add a build guard that fails on them
  (`node <skill-dir>/scripts/audit.mjs dist --strict` in the build or CI).

### 7. Motion

- One orchestrated moment (a page-load sequence, a scroll story) beats twenty scattered effects.
  Feedback motion that confirms a user action is always welcome.
- Animate `transform` and `opacity`; never `transition: all`. Durations 120–220ms for UI
  feedback, 300–600ms for entrances. Ease-out for entering, ease-in for leaving.
- Always honor `prefers-reduced-motion` (swap movement for a fade or nothing).
- For scroll-driven work, GSAP timelines, text reveals, page transitions, 3D or Lottie/Rive,
  use the `motion-forge` skill if installed.

### 8. Verify — this is where good becomes great

Don't hand over unseen work. In order:

1. **Static audit** — `node <skill-dir>/scripts/audit.mjs <src-dir>` scans for accessibility
   bugs and AI-slop tells with `file:line` output. Fix real issues; ignore deliberate choices.
2. **Contrast** — check every text/background token pair with `scripts/contrast.mjs`.
3. **Look at it** — if a dev server can run, `node <skill-dir>/scripts/screenshot.mjs <url>`
   captures 375 / 768 / 1440 px full-page shots and reports horizontal overflow, console errors,
   broken images, missing alt text and small tap targets. Open the PNGs and actually look.
   (Needs Playwright in the project: `npm i -D playwright && npx playwright install chromium` —
   ask before installing. A Playwright/Chrome DevTools MCP or the IDE's browser works too.)
4. **Critique like a demanding art director** — name the three weakest things (hierarchy?
   spacing rhythm? generic hero? muddy palette?), fix them, re-check. Up to two rounds.
5. **Remove one accessory** — the extra gradient, the third font weight, the badge nobody needs.
6. Run the pre-delivery list in [references/checklist.md](references/checklist.md).
7. For anything that ships, hand over to the specialists if installed: `ui-test` (QA report,
   axe + keyboard + reduced-motion + no-JS checks, Playwright specs), `ui-optimize` (Core Web
   Vitals and bundle on a production build) and `ui-debug` (root-cause fixes).

## AI-slop tells — avoid unless chosen deliberately

These are not banned. They are *defaults*: use one only when the brief genuinely calls for it,
and know you're choosing it.

- **Type**: Inter/Roboto/Arial as the unexamined choice on a brand-forward page; gradient text on
  the headline; one word highlighted in a different color/italic; tracked ALL-CAPS eyebrow above
  every section.
- **Color**: purple/indigo → blue/pink gradients on white; Tailwind `indigo-500` as "the brand";
  cream + high-contrast serif + terracotta; near-black with a single acid-green accent;
  gray-on-gray low-contrast text; pure black shadows.
- **Layout**: the template sequence (centered hero → logo strip → 3 feature cards → testimonial
  carousel → 3-tier pricing → CTA band); identical cards with an icon in a rounded square;
  everything centered; uniform spacing with no rhythm; "01 / 02 / 03" markers on things that
  aren't steps.
- **Decoration**: glass cards floating on blurry blobs for no reason; glowing borders; sparkle
  icons for anything "AI"; one radius and one soft shadow on every element; emoji as icons.
- **Motion**: fade-up on every section; `scale(1.05)` hover on every card; parallax everywhere.
- **Copy**: "Unlock the power of…", "Revolutionize", "Seamless", "Supercharge", "Elevate your…",
  "In today's fast-paced world"; John Doe testimonials; fake metrics.

## Quality floor — never below this

- WCAG 2.2 AA: text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI boundaries), visible focus
  rings, full keyboard operation, targets ≥ 24×24px, no information by color alone.
- Responsive from 320px to 2560px with no horizontal scroll; zoom to 200% without breakage.
- `prefers-reduced-motion` respected; no autoplaying audio; video autoplay only if muted.
- Performance: LCP image prioritized, fonts subset with `font-display: swap`, images sized and
  lazy below the fold, no layout shift from late-loading content. See
  [references/accessibility-performance.md](references/accessibility-performance.md).
- No console errors; no dead links or buttons that do nothing.

## Reference map

| Read when you are… | File |
|---|---|
| choosing a visual style and its CSS recipe | [references/styles.md](references/styles.md) |
| structuring a specific type of website (28 blueprints) | [references/site-blueprints.md](references/site-blueprints.md) |
| matching style to an industry / product type | [references/industry-playbook.md](references/industry-playbook.md) |
| picking fonts, building a type scale | [references/typography.md](references/typography.md) |
| building a palette, dark mode, contrast | [references/color.md](references/color.md) |
| composing pages, heroes, grids, bento, responsive | [references/layout.md](references/layout.md) |
| building components, states, forms, copy | [references/components.md](references/components.md) |
| choosing UI/animation libraries, MCPs, assets | [references/libraries.md](references/libraries.md) |
| icons, logos, favicons, SVG shapes and patterns | [references/icons-logos-shapes.md](references/icons-logos-shapes.md) |
| loading, progress, success, errors, toasts, empty states | [references/feedback-states.md](references/feedback-states.md) |
| light/dark, high contrast, multi-brand themes, design tokens | [references/theming.md](references/theming.md) |
| layouts from 320px to 2560px, nav, media, tables, touch, zoom | [references/responsive.md](references/responsive.md) |
| ready-made effects (spotlight, marquee, beam, aurora, reveal, cursor, scrollbar, scroll video, shadows, lighting, toast…) | [assets/patterns/INDEX.md](assets/patterns/INDEX.md) — original, MIT, read one file per pattern |
| working in a specific framework | [references/stacks.md](references/stacks.md) |
| checking a11y, performance, SEO | [references/accessibility-performance.md](references/accessibility-performance.md) |
| doing the final pass | [references/checklist.md](references/checklist.md) |

## Scripts (zero-dependency Node ≥ 18, except screenshots)

| Script | Purpose |
|---|---|
| `scripts/palette.mjs <color> [--neutral] [--name brand] [--format css\|tailwind\|json]` | 11-step OKLCH scale (50–950) with sRGB fallbacks, plus an optional hue-tinted neutral scale |
| `scripts/contrast.mjs <fg> <bg> [<fg> <bg> …]` | WCAG 2.x ratio + AA/AAA verdicts + APCA Lc for hex, rgb() or oklch() colors |
| `scripts/audit.mjs <dir> [--json] [--strict]` | static scan for a11y bugs, motion issues, shipped placeholders, phone-overflowing grids and AI-slop tells, `file:line` output |
| `scripts/screenshot.mjs <url> [--widths 375,768,1440] [--dark] [--reduced-motion]` | multi-width screenshots + overflow / console / image / tap-target report (needs Playwright) |
| `scripts/novelty.mjs ideas\|check\|record\|history …` | originality engine: brief-seeded direction prompts; fingerprint check against presets and the user's past projects; history so no two builds look alike |
| `scripts/preset.mjs list\|show\|apply\|check …` | 25 verified design presets → CSS / Tailwind v4 / shadcn / DTCG JSON / DESIGN.md, with font installs, shadows and spring easing |
| `scripts/fonts.mjs search\|info …` | search ~2,100 Fontsource / Google families by category, variable axes, subsets; print Fontsource, next/font and Tailwind setup with fallback stacks (needs network) |
| `scripts/icons.mjs sets\|search\|get …` | search 260+ open-source icon sets via Iconify; export customized SVG / React / Vue / Svelte / Astro / sprite with a license manifest (needs network) |
| `scripts/fetch-ui.mjs registries\|list @ns\|<@ns/item \| url> …` | search 500+ shadcn-compatible registries, browse a catalog, fetch component source (registries, GitHub, Uiverse) with a SOURCE.md license record (needs network) |

## Handing over

Finish with a short summary: the concept sentence and dials, the token decisions (palette,
fonts, radius), files created or changed, how you verified (audit, contrast, screenshots), and
anything left open. If you persisted a `DESIGN.md`, say so — it is the contract for future work.
