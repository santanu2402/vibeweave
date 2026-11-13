# Scroll-scrubbed video & frame sequence
**What:** a product spins, assembles or flies through as the user scrolls — cinematic, After-Effects-style.
Two techniques: **video scrubbing** (set `currentTime` from scroll) and **frame sequences** (draw image N on
a canvas). **Use for:** one hero story on a launch/product page. **Avoid when:** content pages, slow-network
audiences, or when a looping muted video or a few stills tell the story.

**Accessibility:** the section has a text description of what happens; under reduced motion show a still
poster (or the final frame) and normal scrolling; never trap scroll. **Performance:** the heaviest pattern
here — budget it: start loading when the section is near, cap resolution (1280–1600px wide), and keep
the LCP element *outside* this section (or make the poster the LCP).

### Prepare the media (ffmpeg)
```bash
# Video for scrubbing: every frame a keyframe (-g 1) so seeking is instant; no audio; web-optimized
ffmpeg -i source.mov -an -vf "scale=1440:-2" -c:v libx264 -crf 24 -preset slow -g 1 -pix_fmt yuv420p -movflags +faststart scrub.mp4
# Frame sequence: 60–150 frames is plenty; WebP/AVIF; name with zero padding
ffmpeg -i source.mov -vf "fps=24,scale=1440:-2" -c:v libwebp -quality 72 frames/%04d.webp
```

### Markup + CSS (shared)
```html
<section class="scrub" aria-label="The kiln heating up, from cold clay to glowing glaze">
  <div class="scrub__sticky">
    <canvas class="scrub__canvas" width="1440" height="810" aria-hidden="true"></canvas>  <!-- or <video muted playsinline preload="auto" src="/scrub.mp4"> -->
    <img class="scrub__poster" src="/frames/0001.webp" alt="" width="1440" height="810">
  </div>
</section>
```
```css
.scrub { height: 400vh; position: relative; }
.scrub__sticky { position: sticky; top: 0; height: 100dvh; display: grid; place-items: center; overflow: hidden; }
.scrub__canvas, .scrub__poster, .scrub video { grid-area: 1 / 1; width: 100%; height: 100%; object-fit: cover; }
@media (prefers-reduced-motion: reduce) { .scrub { height: auto; } .scrub__sticky { position: static; height: auto; } .scrub__canvas, .scrub video { display: none; } }
```

### Frame-sequence driver (vanilla JS, any framework)
```js
const section = document.querySelector(".scrub");
const canvas = section.querySelector(".scrub__canvas"), ctx = canvas.getContext("2d");
const FRAMES = 120, src = (i) => `/frames/${String(i + 1).padStart(4, "0")}.webp`;
const images = new Array(FRAMES); let current = -1, target = 0, raf = 0;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function load() {                       // first frame now, the rest progressively
  for (let i = 0; i < FRAMES; i++) { const img = new Image(); img.decoding = "async"; img.src = src(i); images[i] = img; }
}
function progress() {                   // 0..1 across the section's scroll distance
  const r = section.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - innerHeight)));
}
function draw() {
  target = Math.round(progress() * (FRAMES - 1));
  if (target !== current && images[target]?.complete) {
    ctx.drawImage(images[target], 0, 0, canvas.width, canvas.height); current = target;
    section.querySelector(".scrub__poster").style.visibility = "hidden";
  }
  raf = requestAnimationFrame(draw);
}
if (!reduce) new IntersectionObserver(([e]) => {
  if (e.isIntersecting) { if (!images[0]) load(); raf = requestAnimationFrame(draw); } else cancelAnimationFrame(raf);
}, { rootMargin: "50% 0px" }).observe(section);
```

### Video-scrub driver (smaller files, needs the `-g 1` encode)
```js
const video = section.querySelector("video"); let shown = 0;
const tick = () => { const t = progress() * (video.duration || 0); shown += (t - shown) * 0.2;   // ease toward the target
  if (Math.abs(video.currentTime - shown) > 0.01) video.currentTime = shown; raf = requestAnimationFrame(tick); };
video.addEventListener("loadedmetadata", () => { video.pause(); raf = requestAnimationFrame(tick); }, { once: true });
```
**Choose:** frame sequence = perfect scrubbing, more requests/bytes; video = one file, depends on encoding and
the browser's seek speed (test Safari). **Variations:** GSAP ScrollTrigger `scrub: 0.5` driving either; text
captions that fade in at progress ranges; canvas `devicePixelRatio` sizing for crispness on retina.
