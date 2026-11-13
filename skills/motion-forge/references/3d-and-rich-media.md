# 3D & Rich Media

3D and rich media can be the signature element — or a 5MB reason to bounce. Earn the weight.

## Contents
1. When 3D is worth it
2. React Three Fiber + drei (React)
3. Vanilla Three.js essentials
4. Models: the glTF pipeline
5. Shader & gradient backgrounds
6. Spline (no-code 3D)
7. Lottie / dotLottie
8. Rive (interactive state machines)
9. Video as motion
10. Performance and fallbacks checklist
11. Ecosystem, versions and asset licensing (November 2026)

## 1. When 3D is worth it
Good: product configurators/viewers, hardware launches, a single iconic hero object, data in
space, games, immersive brand moments. Bad: decorative spinning blobs, 3D for its own sake on a
B2B page, anything blocking the LCP. Ask: would a great photo or video do the same job lighter?

## 2. React Three Fiber + drei
`npm i three @react-three/fiber @react-three/drei` (Vue: TresJS · Svelte: Threlte)
```tsx
"use client";
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, ContactShadows, useGLTF, PerformanceMonitor } from "@react-three/drei";

function Product(props) {
  const { scene } = useGLTF("/models/product.glb");
  return <primitive object={scene} {...props} />;
}
useGLTF.preload("/models/product.glb");

export default function HeroScene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 4], fov: 40 }} gl={{ antialias: true, alpha: true }}>
      <PerformanceMonitor onDecline={() => { /* lower quality: reduce dpr, drop effects */ }} />
      <Suspense fallback={null}>
        <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.6}>
          <Product scale={1.2} />
        </Float>
        <Environment preset="studio" />
        <ContactShadows position={[0, -1.1, 0]} opacity={0.35} blur={2.4} far={3} />
      </Suspense>
    </Canvas>
  );
}
```
Load it lazily so it never blocks first paint:
```tsx
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => <img src="/hero-poster.webp" alt="…" /> });
```
Useful drei helpers: `OrbitControls` / `PresentationControls` (user rotation), `Text` / `Text3D`,
`MeshTransmissionMaterial` (glass), `Sparkles`, `Stars`, `Cloud`, `Instances` (many copies cheaply),
`ScrollControls` + `useScroll` (scroll-driven 3D), `Html` (DOM inside the scene), `Bounds`, `Center`,
`AdaptiveDpr`, `Bvh`. Animate in `useFrame((state, delta) => { ref.current.rotation.y += delta * 0.2 })`
— multiply by `delta` so speed is frame-rate independent. Post-processing: `@react-three/postprocessing`
(Bloom, Noise, Vignette) — costly on mobile.

## 3. Vanilla Three.js essentials
```js
import * as THREE from "three";
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(el.clientWidth, el.clientHeight);
el.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.1, 100);
camera.position.set(0, 0, 4);
new ResizeObserver(() => { camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix();
  renderer.setSize(el.clientWidth, el.clientHeight); }).observe(el);
renderer.setAnimationLoop(() => renderer.render(scene, camera));
// On teardown: renderer.setAnimationLoop(null); dispose geometries, materials, textures; renderer.dispose()
```
Lighter alternative for simple shader effects: OGL.

## 4. Models: the glTF pipeline
- Use `.glb` (binary glTF). Compress: `npx gltfjsx model.glb --transform` (Draco/meshopt + texture
  resizing, and it generates a typed React component), or `gltf-transform optimize`.
- Textures: ≤ 2048px, KTX2/WebP; bake lighting into textures for static scenes.
- Budget: hero model < 2–3 MB after compression, < 100k triangles for mobile.
- Free/licensed sources: Sketchfab (check license), Poly Haven (CC0 HDRIs/models/textures), Kenney (CC0 game assets).

## 5. Shader & gradient backgrounds
- Animated mesh gradients via a fullscreen plane + fragment shader (noise-driven), or libraries
  like ShaderGradient, or Unicorn Studio exports.
- Keep them cheap: render at reduced resolution (`dpr={1}` or ~0.5 scale), pause when offscreen,
  and offer a static CSS gradient fallback (see css-native.md / styles.md Aurora).

## 6. Spline (no-code 3D)
`npm i @splinetool/react-spline @splinetool/runtime`
```tsx
import Spline from "@splinetool/react-spline";
<Spline scene="https://prod.spline.design/<id>/scene.splinecode" onLoad={(app) => { /* app.findObjectByName("Cube") */ }} />
```
Fast to art-direct, heavier at runtime — lazy-load and show a poster image first. Self-host the export
for production.

## 7. Lottie / dotLottie
Designer-made vector animation (After Effects → Lottie). Prefer the compressed `.lottie` format.
`npm i @lottiefiles/dotlottie-react`
```tsx
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
<DotLottieReact src="/animations/success.lottie" autoplay={!reduce} loop={false} />
```
Great for icons, empty states, onboarding illustrations, success moments. Keep files small (< 100KB
for UI accents), avoid huge raster-embedded Lotties, and provide a static frame for reduced motion.
Asset sources: LottieFiles, IconScout, Lordicon (animated icons).

## 8. Rive (interactive state machines)
Rive animations respond to inputs (hover, click, scroll, data) via state machines — ideal for
interactive mascots, toggles, loaders, game-like UI.
`npm i @rive-app/react-canvas`
```tsx
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
const { rive, RiveComponent } = useRive({ src: "/rive/toggle.riv", stateMachines: "Main", autoplay: true });
const isOn = useStateMachineInput(rive, "Main", "isOn");
<RiveComponent onClick={() => isOn && (isOn.value = !isOn.value)} aria-label="Dark mode toggle" role="switch" />
```
Give the canvas an accessible role/label and a keyboard path.

## 9. Video as motion
For complex cinematic motion, a well-compressed video beats real-time rendering.
```html
<video autoplay muted loop playsinline preload="metadata" poster="/hero-poster.webp" width="1600" height="900">
  <source src="/hero.av1.mp4" type='video/mp4; codecs="av01.0.05M.08"'>
  <source src="/hero.h264.mp4" type="video/mp4">
</video>
```
Pause for reduced motion (`if (matchMedia('(prefers-reduced-motion: reduce)').matches) video.pause()`)
and offer a visible pause button for loops > 5s. Scroll-scrubbed video: use image sequences on a
canvas (GSAP + ScrollTrigger drawing frames) — video `currentTime` scrubbing is janky on many devices.

## 10. Performance and fallbacks checklist
- [ ] Lazy-loaded with a poster/static image; never on the critical path for LCP.
- [ ] `dpr` capped at 2 (or 1.5 on mobile); `frameloop="demand"` for static scenes.
- [ ] Pauses offscreen and when tab hidden; disposes resources on unmount.
- [ ] Tested on a mid-range phone (or 4–6× CPU throttling): stays ≥ 50fps, no thermal spiral.
- [ ] WebGL-unavailable fallback (`try { canvas.getContext("webgl2") }`) and reduced-motion variant (static render).
- [ ] Interactive 3D has keyboard/touch alternatives and doesn't hijack page scroll.
- [ ] Compressed assets (glb with Draco/meshopt, KTX2 textures, dotLottie, AV1/H.264 video).

## 11. Ecosystem, versions and asset licensing (November 2026)
- **Core:** three r187 · @react-three/fiber 9.8 (React 19; v8 for React 18) · drei 10.7. R3F v10 is in
  alpha (WebGPU default, `renderer` prop). WebGPU in v9: pass an async `gl` factory that awaits
  `renderer.init()`; `three/webgpu` + `three/tsl` fall back to WebGL2 — pin versions.
- **Add-ons:** `@react-three/postprocessing` 3.2 (`<EffectComposer><Bloom mipmapBlur /></EffectComposer>`,
  needs R3F ≥ 9.7) · `@react-three/rapier` 2.2 physics (`<Physics><RigidBody colliders="hull">`, WASM — wrap
  in Suspense) · `@react-three/uikit` (flexbox UI inside 3D) · `@react-three/xr` 6 (`createXRStore()`,
  `store.enterVR()`) · troika-three-text / drei `<Text>` for crisp SDF text (`<Text3D>` needs a typeface.json).
- **Pipeline:** `npx gltfjsx model.glb --transform --types` (typed component + compressed copy; gltfjsx is in
  maintenance mode) · `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024`.
- **Other frameworks:** TresJS 5 (Vue ≥ 3.4), Threlte 8 (Svelte 5), Babylon.js 9 (Apache-2.0), PlayCanvas 2
  (+ `@playcanvas/react` pre-1.0), OGL (tiny, quiet). **Needle Engine:** install `@stable` (npm `latest` is a
  6.0 alpha); free only for non-commercial use with their logo — commercial projects need a paid plan.
- **Globes:** cobe 2 (~5KB, markers + arcs) for decorative globes; globe.gl / react-globe.gl for data.
- **Avoid:** Vanta.js (unmaintained, needs global THREE r134) and Zdog (unmaintained) for new work.
- **Assets & licenses:** Poly Haven — models, HDRIs, textures, all CC0 (use the API; scraping the site is
  forbidden). Poly Pizza — low-poly models, check each model's license (CC0 vs CC-BY). Sketchfab — free models
  carry per-model Creative Commons licenses; Store "Standard" allows commercial use but not redistribution of the
  raw files or use in logos; "Editorial" forbids commercial use. Record source + license for every asset in the
  ledger or an ASSETS.md, and credit CC-BY authors.
