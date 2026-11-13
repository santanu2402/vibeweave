# Feedback States — loading, progress, success, errors, toasts, empty

Every wait and every outcome needs a designed response. Pick the pattern by **how long** the user
waits and **how important** the outcome is. Wire them to real request states with ui-integrate.

## Contents
1. Choose by wait time
2. Loading: inline, skeletons, route bars, loading screens
3. Progress: determinate, indeterminate, multi-step, uploads
4. Success messages
5. Error messages (field, form, page, global)
6. Toasts / snackbars
7. Empty states
8. Copy rules
9. Accessibility checklist

## 1. Choose by wait time
| Wait | Show | Why |
|---|---|---|
| < 100ms | nothing (instant feedback: pressed state) | feels immediate |
| 100ms – 1s | button pending state (spinner/label "Saving…", disabled) | confirms the click registered |
| 1 – 3s | skeleton for content; inline spinner for small regions | keeps layout stable, shows what's coming |
| 3 – 10s | determinate progress if measurable, otherwise indeterminate bar + message | sets expectations |
| > 10s | progress + steps + "we'll email you" / let them leave; background job with a notification | don't hold users hostage |
Delay showing loaders ~200ms (avoid flashes) and keep them ≥ 400ms once shown (avoid flicker).

## 2. Loading
- **Inline/button:** keep the button's width (no layout jump), swap the label (`Saving…`), add `aria-busy`/disabled,
  prevent double submit. Spinner only inside the control.
- **Skeletons:** for lists, cards, profiles, dashboards — shapes match the final layout (pattern `skeleton.md`).
- **Route/page loading bar:** a thin top bar during client navigations and long fetches (pattern `loading-bar.md`);
  Next.js `loading.tsx` per segment streams a skeleton; SvelteKit `$navigating`; Nuxt `<NuxtLoadingIndicator>`.
- **Full-screen loading screens / splash:** almost always avoid — render the shell and stream content. Justified
  only for app boot that truly can't render anything (WebGL experiences, games): brand mark + progress + a text
  status, finish fast, respect reduced motion, never block a marketing page's content (LCP).
- **Optimistic UI:** show the result immediately for low-risk actions (like, reorder, toggle) and roll back with an
  error toast if the server rejects it.

## 3. Progress
- **Determinate** when you know the fraction (upload bytes, steps done): native `<progress value max>` or
  `role="progressbar" aria-valuenow aria-valuemin aria-valuemax` + a visible percent/label (pattern `progress.md`).
- **Indeterminate** when you don't: animated bar without `aria-valuenow`, plus a status message that changes
  ("Uploading… Processing… Almost done").
- **Multi-step flows:** step indicator ("Step 2 of 4 — Payment") with completed / current / upcoming states;
  current step `aria-current="step"`.
- **Uploads:** per-file progress, cancel, retry on failure, total progress for batches, keep the page usable.

## 4. Success messages
- Confirm **in place** and specifically: "Booked — Sat 15 Nov, 10:00 at Clay Corner. Confirmation sent to
  ana@example.com." Show the next step (View booking · Add to calendar).
- Low-stakes saves: a subtle inline "Saved" with a check that fades after ~2s, or a toast.
- High-stakes completions (payment, account creation): a dedicated confirmation page/state with a reference number.
- Don't celebrate trivial actions with modals or confetti; save delight for real milestones (and respect reduced motion).

## 5. Error messages
| Level | Where | Example |
|---|---|---|
| Field | under the input, linked with `aria-describedby`, `aria-invalid="true"` | "Card number is 16 digits — you entered 15." |
| Form | summary at the top listing fields as links; focus moves to it on submit | "2 fields need attention: Email, Date" |
| Section / data view | in the region that failed, with retry | "Couldn't load studios. [Try again]" |
| Page | full error state (404, 500, offline) with a way out | "This class no longer exists. [Browse classes]" |
| Global / async | banner or toast for background failures | "Changes couldn't be saved — you're offline. We'll retry." |
Rules: say what happened, why if useful, and exactly how to fix it; keep the user's input; never blame ("invalid
input"); never show raw codes or stack traces (log them); red + icon + text (not color alone).

## 6. Toasts / snackbars
- **Use for:** brief, non-critical confirmations and background events ("Link copied", "Message sent — Undo").
- **Don't use for:** errors the user must act on, form validation, or anything they must not miss — put those inline.
- Placement: one corner (bottom-center on mobile, bottom-right or top-right on desktop), stacked, max 3 visible.
- Timing: ≥ 5s (longer for longer text; WCAG 2.2.1); **pause on hover and focus**; errors persist until dismissed.
- Include an action when useful (Undo, View, Retry) — and make it keyboard reachable (F6 / a shortcut, or focus the
  region); a close button with an accessible name.
- Announce with a live region: `role="status"` (polite) for info/success, `role="alert"` (assertive) only for
  urgent errors. Pattern: `toast.md` (dependency-free); in shadcn projects use its toast component (Sonner-based)
  and restyle to tokens.

## 7. Empty states
Three kinds: **first use** (explain the value + the first action: "Add your first studio"), **no results**
(say what was searched, offer to clear filters, suggest alternatives), **cleared** (inbox zero — a calm, positive
note). Use an illustration or icon from the product's style, one primary action, never a blank area.

## 8. Copy rules
Specific over generic ("Couldn't connect to Stripe" not "Something went wrong"); verbs on buttons; sentence
case; no exclamation marks in errors; numbers and names from the real data; same tone as the rest of the product.

## 9. Accessibility checklist
- [ ] Loading regions use `aria-busy="true"`; a polite live region announces "Loading…" and "Loaded N results".
- [ ] Progress bars have a label (`aria-label`/`aria-labelledby`) and, if determinate, `aria-valuenow`.
- [ ] Errors are programmatically linked to their fields and announced (`role="alert"` on the summary, not on every field).
- [ ] Toasts never steal focus, pause on hover/focus, last ≥ 5s, and errors don't auto-dismiss.
- [ ] Spinners/shimmers stop or slow under `prefers-reduced-motion`.
- [ ] Nothing relies on color alone (icon + text for success/warning/error).
