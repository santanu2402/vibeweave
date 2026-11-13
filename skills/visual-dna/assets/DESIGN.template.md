# DESIGN.md — <Product name>

> The design contract for this project. Agents and humans: read this before changing UI, and
> update it when you make a deliberate system-level change. Section order follows the common
> DESIGN.md convention so other tools can read it too.

## 1. Visual Theme & Atmosphere
- **Subject:** <what this is>
- **Audience & context:** <who, where, on what device>
- **Primary job:** <the one thing the UI must achieve>
- **Feeling:** <2–3 adjectives>
- **Concept:** <one sentence tying subject to style>
- **Style family:** <e.g. Swiss + Bento> · **Signature element:** <the memorable thing>
- **Dials:** variance <n>/10 · motion <n>/10 · density <n>/10

## 2. Color Palette & Roles
| Role | Token | Light | Dark | Usage |
|---|---|---|---|---|
| Background | `--bg` | | | page |
| Surface | `--surface` | | | cards, panels |
| Text | `--text` | | | body, headings |
| Muted text | `--text-muted` | | | secondary (≥ 4.5:1) |
| Border | `--border` | | | dividers, inputs (≥ 3:1 for inputs) |
| Accent | `--accent` | | | primary actions, links |
| On accent | `--on-accent` | | | text on accent |
| Focus | `--focus` | | | focus rings |
| Success / Warning / Danger | `--success` … | | | status only |

## 3. Typography Rules
- **Display:** <family, weights, tracking> · **Body:** <family, size, leading> · **Mono:** <if any>
- **Scale:** ratio <x>; steps `--step--1 … --step-5`, display `clamp(...)`
- **Rules:** measure `max-width ≈ 62–65ch` (≈ 60–75 characters) · headings `text-wrap: balance` · numbers `tabular-nums` in data

## 4. Component Stylings
- **Buttons:** <shape, sizes, variants, hover/active/focus treatment>
- **Inputs:** <height, border, focus, error>
- **Cards / surfaces:** <radius, border vs shadow, padding>
- **Navigation:** <behavior desktop/mobile>
- **Other signature components:** <…>

## 5. Layout Principles
- **Grid:** <columns, max width, gutters> · **Spacing scale:** 4 8 12 16 24 32 48 64 96 128
- **Section rhythm:** <padding, how density alternates>
- **Hero pattern:** <chosen pattern and why>

## 6. Depth & Elevation
- **Radius:** `--radius-sm/md/lg` = <values> (personality: <crisp / friendly / …>)
- **Shadows:** `--shadow-1/2/3` = <values, tinted with hue H>
- **Layering / z-index scale:** base 0 · dropdown 10 · sticky 20 · overlay 40 · modal 50 · toast 60

## 7. Motion
- **Durations:** fast <ms> · base <ms> · slow <ms> · **Easing:** <curves>
- **Signature motion moment:** <what, where>
- **Reduced motion:** <what replaces movement>

## 8. Do's and Don'ts
- ✅ <rule> — ❌ <anti-rule>
- ✅ … — ❌ …

## 9. Responsive Behavior
- Breakpoints: <values> · Mobile nav: <pattern> · Tables/data on mobile: <approach>
- Touch targets ≥ 44px · No hover-only affordances

## 10. Voice & Copy
- Tone: <adjectives> · Casing: sentence case · Button verbs: <list>
- Words we avoid: <list>

## 11. Agent Prompt Guide
When generating UI for this project: use only the tokens above; keep the signature element as
the hero; follow the dials; verify contrast and run the audit before handing over.
