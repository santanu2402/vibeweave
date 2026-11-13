# Components, States & Copy

## Contents
1. State matrix
2. Buttons and links
3. Forms
4. Navigation
5. Cards and lists
6. Overlays: dialogs, drawers, popovers, toasts
7. Tables and data
8. Loading, empty, error
9. Icons and imagery
10. Microcopy

## 1. State matrix

Every interactive element needs these, designed — not left to browser defaults:

| State | Requirement |
|---|---|
| default | clear affordance (looks clickable/typeable) |
| hover | subtle change, only on `@media (hover: hover)` devices |
| focus-visible | ≥ 2px ring, ≥ 3:1 contrast, offset from the element; never removed |
| active / pressed | immediate feedback (translate 1px, darker fill, scale .98) |
| disabled | reduced contrast + `cursor: not-allowed` + `disabled`/`aria-disabled`; explain why if possible |
| loading | spinner or progress *inside* the control, width stable, `aria-busy` |
| selected / current | `aria-current` / `aria-selected` / `aria-pressed` with visual distinction beyond color |
| error / success | message text + icon + color, linked via `aria-describedby` |

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--focus); outline-offset: 2px; border-radius: inherit; }
```

## 2. Buttons and links

- Hierarchy: **one primary per view**, then secondary (outline/tonal), tertiary (ghost/link),
  destructive (danger color, confirm step).
- Label = verb + object ("Create invoice", "Download report") — not "Submit", "OK", "Click here".
- Height 40–48px marketing, 32–36px dense apps; horizontal padding ≈ 1.5–2× vertical.
- Links in text are underlined (or otherwise distinguishable without color) —
  `text-underline-offset: .2em; text-decoration-thickness: 1px`.
- `<a>` navigates, `<button>` acts. Never `<div onClick>`.
- Icon-only buttons need `aria-label` and a tooltip.

## 3. Forms

- Labels above inputs, always visible (placeholder is a hint, not a label).
- Correct `type` + `inputmode` + `autocomplete` (`email`, `tel`, `one-time-code`, `street-address`…)
  — mobile keyboards and password managers depend on them.
- Validate on blur and on submit, not on every keystroke; show the error under the field with
  how to fix it; move focus to the first invalid field on submit; keep user input.
- Group related fields with `fieldset`/`legend`; single column is fastest to complete.
- Mark optional fields rather than required ones (when most are required).
- Input font-size ≥ 16px on mobile (prevents iOS zoom).
- Inputs need a 3:1 boundary against the background.
- Long forms: progress indicator, save drafts, chunk into steps.

## 4. Navigation

- 5–7 top-level items max; current page indicated (`aria-current="page"`).
- Sticky header: keep it slim; consider hide-on-scroll-down/show-on-scroll-up; translucent
  background (`backdrop-filter`) only if contrast holds.
- Mobile: `<button aria-expanded aria-controls>` → full-screen or sheet menu; trap focus while
  open; Esc and outside-click close; return focus to the toggle.
- Include a "Skip to content" link as the first focusable element.
- Breadcrumbs for deep hierarchies; command palette (⌘K) for power-user apps.

## 5. Cards and lists

- Whole-card click: make the heading link stretch with a pseudo-element
  (`.card a::after { content:""; position:absolute; inset:0 }`) rather than wrapping everything in `<a>`.
- Consistent internal structure, but vary card *sizes* or *emphasis* on marketing pages.
- Use semantic lists (`ul/ol`) for collections — screen readers announce counts.

## 6. Overlays: dialogs, drawers, popovers, toasts

- Use native `<dialog>` (with `showModal()`) or a headless primitive (Radix, React Aria, Base UI,
  Ark UI, Headless UI, Bits UI) — they handle focus trap, Esc, scroll lock, `aria-modal`, return focus.
- The native Popover API (`popover` attribute) handles light-dismiss menus and tooltips.
- Dialogs: title (`aria-labelledby`), clear primary/secondary actions, destructive confirms state
  the consequence ("Delete 3 projects? This can't be undone.").
- Drawers/sheets for mobile filters and secondary flows.
- Toasts: `role="status"` / `aria-live="polite"`; auto-dismiss ≥ 5s, pausable on hover; never the
  only place an error is reported; include undo for destructive actions.
- Tooltips: supplementary only, appear on hover *and* focus, never contain essential info.

## 7. Tables and data

- Right-align numbers, `tabular-nums`, consistent decimals and units in the header.
- Sticky header; zebra or hover rows for wide tables; row height 40–48 (comfortable) / 32 (compact).
- Sorting via `<button>` in `<th>` with `aria-sort`.
- Empty and filtered-empty states are different ("No invoices yet" vs "No invoices match 'acme'").
- Charts: label axes and units, start bar charts at zero, direct labels over legends, color-blind-safe
  palettes, a text/table alternative for key data.

## 8. Loading, empty, error

- **Loading**: skeletons that match the final layout for content areas (no layout shift);
  spinners only for short, unknown-shape waits; optimistic UI for fast actions; show progress
  for anything > 2s.
- **Empty states** are onboarding: what this is, why it's empty, the one action to fill it,
  maybe a sample/template. A friendly illustration is optional; the action is not.
- **Errors**: say what happened, why (if known), and what to do — in the product's voice, without
  blame or vague apology ("We couldn't save your changes — you're offline. We'll retry when you
  reconnect."). Keep user data. Offer retry.
- 404/500 pages are brand moments: helpful links, search, personality.

## 9. Icons and imagery

- One icon family, one stroke width (1.5 or 2px), sizes from the type scale (16/20/24).
  Icons align to text cap-height/center optically.
- Imagery: art-direct it — consistent color grading, crop and subject. Real product
  screenshots > abstract 3D blobs. Use `<picture>`/`srcset` with AVIF/WebP, `loading="lazy"`
  below the fold, `fetchpriority="high"` for the LCP image.
- Illustration: one coherent style (or commission/generate a consistent set); don't mix
  3D clay, flat line and stock photos on one page.
- Avatars and logos: provide fallbacks (initials) and fixed sizes.

## 10. Microcopy

- Write for the user's goal in plain language: "Manage notifications", not "Configure webhooks".
- Sentence case for UI labels and headings (more readable, more modern) unless the brand says otherwise.
- Be specific: "Saved 2 seconds ago" > "Saved"; "3 seats left" > "Limited availability".
- Consistent verbs: if the button says "Publish", the toast says "Published".
- Headlines: concrete benefit or vivid claim, ≤ 8 words where possible; sub-copy explains how.
- No filler: cut "simply", "just", "easily", "seamlessly", "powerful", "robust".
- Numbers as numerals ("3 projects"), dates relative when recent, absolute when precise.
- Personality belongs in empty states, success moments and 404s — not in error messages about money.
