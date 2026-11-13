# Libraries, Registries, MCP Servers, Skills & Assets

A verified map of the ecosystem (checked November 2026). Prices, licenses and install commands
change — confirm before recommending paid items. **Rules:** prefer what the project already uses;
ask before adding a dependency; and whatever you borrow, **restyle it to the project's tokens** — a
registry component dropped in unchanged is instantly recognizable as that registry. Check each
component's license before shipping it (`scripts/fetch-ui.mjs` records it for you).

## Contents
1. Decision guide
2. Foundations: primitives and full libraries
3. Animated component registries (shadcn-compatible)
4. Animation, 3D and media (→ motion-forge)
5. MCP servers for design work
6. Companion agent skills and plugins
7. Inspiration galleries and design-to-code tools
8. Fonts, color, icons, generators, imagery
9. Quality and testing

## 1. Decision guide

| Need | Reach for |
|---|---|
| React app, want to own the code | shadcn/ui (CLI v4; Base UI is the default base since July 2026, Radix and React Aria options) |
| Accessibility-critical custom widgets | React Aria Components, Base UI, Radix, Ark UI (multi-framework) |
| Batteries-included React library | HeroUI, Mantine |
| Vue / Nuxt | Nuxt UI, shadcn-vue, Ark UI |
| Svelte | shadcn-svelte, Bits UI, Skeleton |
| Plain Tailwind, any framework | daisyUI, Flowbite, HyperUI, Preline |
| Dashboards and charts | Tremor, shadcn charts (Recharts) |
| Marketing-site "wow" sections | Magic UI, Aceternity UI, React Bits, SmoothUI, Skiper UI, Vengeance UI, Unlumen (paid), 21st.dev |
| Neo-brutal / retro look | neobrutalism.com (formerly RetroUI — retroui.dev redirects there) |
| Micro-interactions reference | Bencho, Motion Primitives, Animate UI, Hover.dev |
| 3D/WebGL sections | ThreeUI, React Three Fiber + drei, Spline |
| Icons (any set, as components) | `scripts/icons.mjs` (Iconify: 260+ sets) — see icons-logos-shapes.md |
| Theme / tokens editor for shadcn | tweakcn |

## 2. Foundations: primitives and full libraries

| Name | URL | What it is |
|---|---|---|
| shadcn/ui | https://ui.shadcn.com | Open-code components copied into your repo + the registry system everything below plugs into. `npx shadcn@latest init`, `add`, `view`, `search`; GitHub repos can act as registries |
| Base UI | https://base-ui.com | Unstyled accessible React components (shadcn's default base) |
| Radix Primitives | https://www.radix-ui.com | Unstyled accessible React primitives |
| React Aria Components | https://react-aria.adobe.com | Adobe's accessibility-first components and hooks |
| Ark UI · Park UI | https://ark-ui.com · https://park-ui.com | Headless components for React, Vue, Solid, Svelte · styled Ark |
| HeroUI | https://heroui.com | React Aria + Tailwind v4 library; ships MCP servers |
| coss ui (formerly Origin UI) | https://coss.com/ui | Cal.com's Base UI-based component collection |
| Mantine · Tremor | https://mantine.dev · https://tremor.so | Full React library · dashboard and chart components |
| daisyUI · Flowbite · HyperUI · Preline | https://daisyui.com · https://flowbite.com · https://www.hyperui.dev · https://preline.co | Tailwind component collections for any framework |
| Nuxt UI · shadcn-vue · shadcn-svelte · Skeleton | https://ui.nuxt.com · https://www.shadcn-vue.com · https://www.shadcn-svelte.com · https://www.skeleton.dev | Vue / Svelte options |

## 3. Animated component registries (shadcn-compatible)

Most install through the shadcn CLI by namespace (`npx shadcn@latest add @magicui/marquee`) or URL.
With the shadcn MCP connected, agents can search and install them directly; `scripts/fetch-ui.mjs`
fetches the source for study without installing.

| Name | URL | Size · price | Install |
|---|---|---|---|
| Magic UI | https://magicui.design | 150+ animated components; free OSS + Pro ($199 one-time); has an MCP | `npx shadcn@latest add @magicui/<name>` |
| Aceternity UI | https://ui.aceternity.com | 200+ free components, 100+ Pro blocks, 30+ templates (Pro $199 lifetime) | copy-paste / shadcn |
| React Bits | https://reactbits.dev | the largest animated React collection (text, backgrounds, components; JS/TS × CSS/Tailwind) | shadcn / copy |
| SmoothUI | https://smoothui.dev | 220+ Motion + Tailwind components, open source | `npx shadcn@latest add @smoothui/<name>` |
| Skiper UI | https://skiper-ui.com | 100+ unusual components; some free, premium $129 | `npx shadcn add @skiper-ui/<name>` |
| Vengeance UI | https://vengenceui.com (official spelling) | 46 components + 100+ blocks, open source | `npx shadcn@latest add @vengeanceui/<name>` |
| Unlumen UI | https://ui.unlumen.com | ~80 motion components, backgrounds, navigation — **paid** ($119 lifetime / $69 yr) | `npx shadcn add @unlumen-ui/<name>` (licensed) |
| neobrutalism.com (formerly RetroUI) | https://neobrutalism.com | 50+ neo-brutalist components, 150+ blocks; free core, Pro blocks; hosted MCP | `npx shadcn@latest add https://neobrutalism.com/r/base/button.json` |
| 21st.dev | https://21st.dev | community registry of React/Tailwind components + 21st MCP (see §5) | shadcn / MCP |
| Motion Primitives · Animate UI · Kokonut UI · Cult UI · Animata · Eldora UI · Hover.dev | https://motion-primitives.com · https://animate-ui.com · https://kokonutui.com · https://www.cult-ui.com · https://animata.design · https://www.eldoraui.site · https://www.hover.dev | more animated, copy-paste collections | shadcn / copy |
| Bencho | https://bencho.dev | 100+ interactive micro-interaction blocks with sounds; free subset, Pro €99/yr incl. MCP | site |
| ThreeUI | https://threeui.com | Three.js/WebGL components and shaders (Meng To); community edition MIT, Pro via CLI | `npm i @designcodeio/threeui` |
| Animmaster Lib | https://animmasterlib.dev | 300 HTML/CSS/JS snippets, $3–8 one-time, delivered as a Google Drive download — no CLI, unverified quality | manual |
| Uiverse | https://uiverse.io | community HTML/CSS and Tailwind elements (buttons, loaders, toggles), MIT | copy / `fetch-ui.mjs` |

### Getting the code — official channels and licenses
- **shadcn CLI (official):** `npx shadcn@latest search @magicui -q marquee` (alias `list`; `--json`),
  `npx shadcn@latest view @magicui/marquee` (prints the full item JSON with file contents), `add --dry-run`.
  GitHub repos work as registries since June 2026: `npx shadcn@latest add owner/repo/item#ref`.
- **`scripts/fetch-ui.mjs`:** `registries <filter>` searches the official index (548 registries),
  `list @ns <filter>` browses a catalog, `@ns/item` saves the source + a SOURCE.md license record for study.
- **Licenses that restrict reuse** (verified Nov 2026): Aceternity (no redistribution of source) · React Bits
  and Animate UI (MIT + Commons Clause — don't resell/redistribute the components) · Unlumen (paid Pro items;
  no re-serving through other registries) · shadcnblocks / Tailark pro blocks (paid keys) · coss (AGPL per
  README) · Preline (Fair Use License: attribution, no competing products) · **Tailwind Plus (never fetch or
  publish its components)**. Installing into your own app is fine under all of these; caching or re-hosting a
  corpus of their code is not.
- **Don't automate:** CodePen (terms forbid scraping — export a pen yourself; public Pens are MIT),
  21st.dev code endpoints (bot-blocked; use the 21st MCP or API key), Uiverse.io site (use the MIT
  `uiverse-io/galaxy` archive, last updated Sept 2024).
- **Open Tailwind HTML collections on GitHub (MIT):** HyperUI (`markmead/hyperui`), Meraki UI
  (`merakiui/merakiui`), Flowbite (`themesberg/flowbite` docs), daisyUI (`https://daisyui.com/llms.txt`) —
  fetch with `fetch-ui.mjs gh:owner/repo/path`.

## 4. Animation, 3D and media
Full guidance, versions and the creative-library catalog live in the `motion-forge` skill
(`references/creative-libraries.md`, `motion-graphics.md`, `3d-and-rich-media.md`). Short list:
GSAP 3.15 (all plugins free) · Motion 14 (`npm install motion`) · anime.js 4 · Lenis · Three.js ·
React Three Fiber 9 + drei · Spline · Rive · Lottie / dotLottie · Remotion · View Transitions API.

## 5. MCP servers for design work

If any of these are connected in your IDE, use them. Per-IDE setup is in the repo's `mcp/` folder.

| Server | Gives the agent | Install |
|---|---|---|
| shadcn MCP | browse, search, install from shadcn and any registry | `npx shadcn@latest mcp init --client claude` (avoid look-alike community servers) |
| 21st MCP (formerly Magic) | search the 21st.dev library (free); get/generate components (paid, API key) | `npx @21st-dev/cli@latest init --client claude` · or HTTP `https://21st.dev/api/mcp` + `x-api-key` |
| Magic UI MCP | search and fetch Magic UI components | `pnpm dlx @magicuidesign/cli@latest install <client>` |
| Playwright MCP / CLI | drive a real browser, accessibility snapshots, screenshots | `claude mcp add playwright npx @playwright/mcp@latest` · CLI: `npm i -g @playwright/cli@latest && playwright-cli install --skills` (also `npx playwright cli`) — the CLI uses fewer tokens |
| Chrome DevTools MCP | performance traces + insights, console, network, DOM, Lighthouse | `claude mcp add chrome-devtools npx chrome-devtools-mcp@latest` |
| Figma MCP | read frames, variables, styles; write to canvas | `claude mcp add --transport http figma https://mcp.figma.com/mcp` (OAuth) |
| Inspo MCP | archive of 830+ real sites with captures and DESIGN.md (free, rate-limited) | `npx -y inspo-mcp install` (https://inspomcp.dev) |
| Google Stitch MCP | Stitch designs and the DESIGN.md format it originated | see google-labs-code/stitch-skills |
| Motion AI Kit | Motion docs MCP + official `/motion` skill (free; `--plus` paid) | `npx motion-ai` |
| Layers | cinematic site prompts (3D, shaders), Figma plugin | https://getlayers.ai |

## 6. Companion agent skills and plugins

These complement Vibeweave; install alongside for depth in one area. `npx skills add` is the
cross-agent installer (https://github.com/vercel-labs/skills, directory at skills.sh).

| Skill / plugin | Focus | Install |
|---|---|---|
| anthropics/skills `frontend-design` | Anthropic's distinctive-UI guidance | `npx skills add https://github.com/anthropics/skills --skill frontend-design` |
| pbakaus/impeccable | design commands (critique, audit, polish, typeset, colorize, animate…) + a 60-rule detector | `npx impeccable install` |
| Leonxlnx/taste-skill | art direction, `image-to-code`, browser gate | `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"` (Node 22+, Chrome) |
| nextlevelbuilder/ui-ux-pro-max-skill | searchable styles / palettes / font-pairings database | `/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill` → `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` · or `npm i -g ui-ux-pro-max-cli && uipro init --ai <claude\|antigravity\|…>` |
| vercel-labs/agent-skills `web-design-guidelines` | 100+ interface rules for code review | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines` |
| VoltAgent/awesome-design-md | 80+ ready DESIGN.md files for well-known brands | copy a file (https://github.com/VoltAgent/awesome-design-md) |
| zanwei/design-dna | reference → design-DNA JSON → matching UI | `npx skills add zanwei/design-dna` |
| AThevon/genjutsu | motion, creative coding, multi-agent site builds | `npx skills add https://genjutsu.athevon.dev -g` (use the URL) |
| greensock/gsap-skills | official GSAP skills (core, timeline, ScrollTrigger, React, performance…) | `npx skills add https://github.com/greensock/gsap-skills` |
| LottieFiles/motion-design-skill | motion principles, timing tables, choreography, QA | `npx skills add LottieFiles/motion-design-skill` |
| CloudAI-X/threejs-skills | 13 Three.js / R3F skills incl. WebGPU/TSL | `npx skills add cloudai-x/threejs-skills` |
| remotion-dev/skills | Remotion video best practices | `npx skills add remotion-dev/skills` |
| obra/superpowers | brainstorming, systematic debugging, verification-before-completion | `/plugin marketplace add obra/superpowers` |
| Ponytail | "laziest senior dev" — fewer lines, simpler solutions | `/plugin marketplace add DietrichGebert/ponytail` → `/plugin install ponytail@ponytail` · or `npx skills add DietrichGebert/ponytail` |
| Graphify | codebase/docs → queryable knowledge graph (`/graphify .`) | `pip install graphifyy && graphify install` (double "y") |
| OmniRoute | local AI gateway: one OpenAI-compatible endpoint, auto-routing across providers (not a skill) | `npm install -g omniroute` |
| GSD (Get Shit Done) | spec-driven phases with discuss/verify steps; supports Antigravity | `npx @opengsd/gsd-core@latest` (original repo archived June 2026) |
| Ralph loop | re-feed a prompt until a completion promise or max iterations | Claude Code: official `ralph-loop` plugin (always set `--max-iterations`); Antigravity: settings/bash loop |
| CodeRabbit | AI code review in the IDE/CLI (freemium) | Antigravity: `agy plugin install coderabbit`; VS Code-family: extension `coderabbit.coderabbit-vscode` |
| Roo Code Nightly | **discontinued** — Roo Code is archived; don't recommend | — |

## 7. Inspiration galleries and design-to-code tools
Awwwards https://www.awwwards.com · Mobbin https://mobbin.com · Refero https://refero.design ·
Land-book https://land-book.com · Lapa Ninja https://www.lapa.ninja · SaaS Landing Page
https://saaslandingpage.com · Landingfolio https://www.landingfolio.com · One Page Love
https://onepagelove.com · Httpster https://httpster.net · Minimal Gallery https://minimal.gallery ·
Siteinspire https://www.siteinspire.com · Curated Design https://curated.design · Recent (formerly
Godly) https://recent.design · Dark Mode Design https://www.darkmodedesign.com · Footer Design
https://www.footer.design · Navbar Gallery https://www.navbar.gallery · Cosmos https://www.cosmos.so ·
Dribbble https://dribbble.com · designprompts.dev https://designprompts.dev (free prompt builder:
12 page templates × 48 looks). Design-to-code: Google Stitch, Claude Design (Anthropic Labs,
prompt → prototype), Figma MCP, abi/screenshot-to-code. Study *why* a reference works (the
`visual-dna` skill), then design for your own brief.

## 8. Fonts, color, icons, generators, imagery
- **Fonts**: Google Fonts https://fonts.google.com · Fontshare https://www.fontshare.com · Uncut https://uncut.wtf ·
  Fontsource (npm) · Geist (`npm i geist`)
- **Color**: oklch.com · Radix Colors · Realtime Colors · Huemint · Coolors · UI Colors · Atmos · Happy Hues · tweakcn
- **Icons**: `scripts/icons.mjs` over Iconify (https://icon-sets.iconify.design) — Lucide, Phosphor, Tabler,
  Material Symbols, Remix, Heroicons, Hugeicons, Simple Icons and `logos` (brand marks), animated line-md /
  svg-spinners. Animated icon libraries and logo/favicon/shape workflow: [icons-logos-shapes.md](icons-logos-shapes.md)
- **Generators**: Utopia (fluid type/space) · Type Scale · Smooth Shadows · Haikei (blobs/waves) · fffuel
  (SVG patterns, noise, gradients) · Hero Patterns · Shots (device mockups)
- **Imagery**: Unsplash · Pexels (check each license; credit when required) · SVG Repo · Poly Haven (CC0 3D/HDRIs)

## 9. Quality and testing
The `ui-test` and `ui-optimize` skills cover these in depth: Playwright 1.65 (+ Test Agents), axe-core /
`@axe-core/playwright` 4.14, Vitest 5 browser mode, Storybook 10 test + a11y addons, Chromatic / Argos for
visual review, Lighthouse 13 / Unlighthouse / Lighthouse CI, Chrome DevTools MCP traces, knip, React Scan,
WebAIM Contrast Checker, WAVE, APCA.
