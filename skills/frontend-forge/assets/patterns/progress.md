# Progress (determinate, indeterminate, steps)
**What:** bars and step indicators that show how far a task is. **Use for:** uploads, imports, multi-step
forms, onboarding. **Avoid when:** you can't measure progress and the wait is short (use a pending button).

**Accessibility:** native `<progress>` or `role="progressbar"` with a label; determinate bars expose
`aria-valuenow`; indeterminate ones omit it and pair with a changing status message; steps use
`aria-current="step"`. **Performance:** `transform`/`inline-size` on one small element.

```html
<label for="upload">Uploading portfolio.pdf</label>
<progress id="upload" class="progress" max="100" value="42">42%</progress> <span aria-hidden="true">42%</span>

<div class="progress progress--indeterminate" role="progressbar" aria-label="Processing your photos"></div>
<p role="status" aria-live="polite">Processing… 3 of 12 photos</p>

<ol class="steps" aria-label="Checkout progress">
  <li data-state="done">Details</li><li data-state="current" aria-current="step">Payment</li><li>Confirm</li>
</ol>
```
```css
.progress { appearance: none; inline-size: 100%; block-size: 8px; border: 0; border-radius: 999px; overflow: hidden;
  background: var(--color-surface, #e5e7eb); color: var(--color-accent, #2563eb); }
.progress::-webkit-progress-bar { background: transparent; }
.progress::-webkit-progress-value { background: currentColor; border-radius: inherit; transition: inline-size 300ms ease-out; }
.progress::-moz-progress-bar { background: currentColor; border-radius: inherit; }
.progress--indeterminate { position: relative; }
.progress--indeterminate::after { content: ""; position: absolute; inset-block: 0; inline-size: 40%; border-radius: inherit;
  background: currentColor; animation: indeterminate 1.4s var(--ease-in-out, ease-in-out) infinite; }
@keyframes indeterminate { from { translate: -100% 0; } to { translate: 250% 0; } }
@media (prefers-reduced-motion: reduce) { .progress--indeterminate::after { animation: none; inline-size: 100%; opacity: .5; } }

.steps { display: flex; gap: 0.5rem; counter-reset: step; list-style: none; padding: 0; }
.steps li { counter-increment: step; flex: 1; padding-block-start: 0.75rem; border-block-start: 4px solid var(--color-border, #d1d5db);
  color: var(--color-text-muted, #6b7280); font-size: 0.875rem; }
.steps li::before { content: counter(step) ". "; }
.steps li[data-state="done"] { border-color: var(--color-accent, #2563eb); color: var(--color-text, #111); }
.steps li[data-state="current"] { border-color: var(--color-accent, #2563eb); color: var(--color-text, #111); font-weight: 600; }
```
**Uploads:** `XMLHttpRequest.upload.onprogress` (fetch has no upload progress in most browsers) → `value =
loaded / total * 100`; per-file bars + cancel (`xhr.abort()`) + retry; a total bar for batches.
