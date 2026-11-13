# Glass nav
**What:** a sticky header that is transparent over the hero and becomes frosted with a hairline once the
page scrolls. **Use for:** marketing sites, product sites over imagery. **Avoid when:** busy imagery
makes nav text unreadable even when frosted — use a solid header.

**Accessibility:** text contrast must pass on the frosted state *and* the transparent state over the hero;
skip link first; the scrolled state is visual only. **Performance:** one IntersectionObserver on a sentinel;
`backdrop-filter` on a small fixed area only.

```html
<div id="nav-sentinel" style="position:absolute; top:0; height:1px; width:1px" aria-hidden="true"></div>
<header class="glass-nav" data-scrolled="false">…</header>
```
```css
.glass-nav { position: sticky; top: 0; z-index: 20; transition: background-color var(--dur-base, 220ms), box-shadow var(--dur-base, 220ms); }
.glass-nav[data-scrolled="true"] {
  background: color-mix(in oklch, var(--color-bg, #fff) 72%, transparent);
  -webkit-backdrop-filter: blur(12px) saturate(160%); backdrop-filter: blur(12px) saturate(160%);
  box-shadow: 0 1px 0 var(--color-border, #0001);
}
@supports not (backdrop-filter: blur(1px)) { .glass-nav[data-scrolled="true"] { background: var(--color-bg, #fff); } }
```
```js
const nav = document.querySelector(".glass-nav");
new IntersectionObserver(([e]) => nav.dataset.scrolled = String(!e.isIntersecting))
  .observe(document.getElementById("nav-sentinel"));
```
**Variations:** hide on scroll down / show on scroll up (only for long reading pages; keep it visible on
focus); CSS-only version with `animation-timeline: scroll()` animating background over the first 80px.
