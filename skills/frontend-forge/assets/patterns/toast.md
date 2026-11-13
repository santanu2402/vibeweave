# Toast (accessible, dependency-free)
**What:** brief, non-blocking messages ("Link copied", "Booking sent — Undo"). **Use for:** confirmations and
background events. **Avoid when:** errors the user must fix (show them inline) or anything they must not miss.

**Accessibility:** a persistent live region (`role="status"`, polite) announces toasts without stealing focus;
urgent errors use `role="alert"`; toasts pause on hover/focus, last ≥ 5s, errors stay until dismissed; actions
and close buttons are real buttons; `F8` jumps to the toast region. **Performance:** tiny; enter/exit with
transform/opacity via `@starting-style`.

```html
<section class="toasts" aria-label="Notifications" tabindex="-1"><ol class="toasts__list" role="status" aria-live="polite"></ol></section>
```
```css
.toasts { position: fixed; z-index: 60; inset: auto 1rem 1rem auto; width: min(24rem, calc(100vw - 2rem)); }
@media (max-width: 40rem) { .toasts { inset: auto 0.75rem 0.75rem 0.75rem; width: auto; } }
.toasts__list { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
.toast { display: grid; grid-template-columns: auto 1fr auto; gap: 0.75rem; align-items: start; padding: 0.875rem 1rem;
  border-radius: var(--radius-md, 12px); background: var(--color-surface-inverse, oklch(0.22 0.02 260)); color: var(--color-on-inverse, white);
  box-shadow: var(--shadow-3, 0 12px 32px -8px #0006);
  transition: opacity var(--dur-base, 220ms), translate var(--dur-base, 220ms) var(--ease-out, ease-out); }
@starting-style { .toast { opacity: 0; translate: 0 0.75rem; } }
.toast.is-leaving { opacity: 0; translate: 0 0.5rem; }
.toast[data-tone="error"] { background: var(--color-danger-surface, oklch(0.35 0.12 25)); }
.toast button { font: inherit; color: inherit; background: transparent; border: 0; cursor: pointer; text-decoration: underline; min-height: 24px; }
@media (prefers-reduced-motion: reduce) { .toast { transition: opacity var(--dur-fast, 140ms); translate: none !important; } }
```
```js
// toast("Link copied") · toast("Booking sent", { action: { label: "Undo", onClick: undo } }) · toast("Couldn't save", { tone: "error" })
const region = document.querySelector(".toasts"), list = region.querySelector(".toasts__list");
addEventListener("keydown", (e) => { if (e.key === "F8") { e.preventDefault(); (list.querySelector("button") || region).focus(); } });
export function toast(message, { tone = "info", action, duration = 6000 } = {}) {
  const li = document.createElement("li");
  li.className = "toast"; li.dataset.tone = tone;
  if (tone === "error") li.setAttribute("role", "alert");          // urgent: assertive announcement
  li.innerHTML = `<span aria-hidden="true">${tone === "error" ? "⚠" : tone === "success" ? "✓" : "•"}</span><p style="margin:0"></p><div></div>`;
  li.querySelector("p").textContent = message;
  const actions = li.querySelector("div");
  if (action) { const b = document.createElement("button"); b.textContent = action.label; b.onclick = () => { action.onClick(); dismiss(); }; actions.append(b); }
  const close = document.createElement("button"); close.setAttribute("aria-label", "Dismiss notification"); close.textContent = "✕"; close.onclick = dismiss; actions.append(close);
  list.append(li);
  while (list.children.length > 3) list.firstElementChild.remove();
  let timer, remaining = tone === "error" ? Infinity : duration, started = Date.now();
  const arm = () => { if (remaining !== Infinity) { started = Date.now(); timer = setTimeout(dismiss, remaining); } };
  const pause = () => { clearTimeout(timer); remaining -= Date.now() - started; };
  li.addEventListener("pointerenter", pause); li.addEventListener("pointerleave", arm);
  li.addEventListener("focusin", pause); li.addEventListener("focusout", arm);
  arm();
  function dismiss() { clearTimeout(timer); li.classList.add("is-leaving"); setTimeout(() => li.remove(), 250); }
  return dismiss;
}
```
**React:** wrap the same logic in a context provider, or use the project's existing toast (shadcn's Sonner-based
toast) and restyle it to tokens. Icons: swap the glyphs for the project's icon set (`icons.mjs`).
