# Stack Notes

Framework specifics for turning tokens into code. Always check the installed version in
`package.json` first — APIs below reflect current majors, and older projects may differ.

## Contents
- Tailwind CSS v4 / v3
- shadcn/ui
- React + Next.js
- Vue + Nuxt
- Svelte + SvelteKit
- Astro
- Angular
- Plain HTML / single file
- React Native / Expo
- Flutter · SwiftUI · Jetpack Compose

## Tailwind CSS v4
CSS-first config; no `tailwind.config.js` required.
```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));   /* class-based dark mode (default is media query) */
@theme {
  --font-display: "Bricolage Grotesque", sans-serif;   /* → font-display */
  --color-brand-500: oklch(0.62 0.17 155);             /* → bg-brand-500, text-brand-500 … */
  --radius-card: 1.25rem;                              /* → rounded-card */
  --ease-snap: cubic-bezier(.22, 1, .36, 1);           /* → ease-snap */
}
```
- Install: Vite → `@tailwindcss/vite`; Next.js/PostCSS → `@tailwindcss/postcss`.
- Use CSS variables directly: `bg-(--surface)`, `text-(--text-muted)`.
- Container queries are built in: `@container` on parent, `@md:grid-cols-2` on children.
- `@theme inline { --color-bg: var(--bg); }` maps runtime variables (for themes) into utilities.
- **v3 projects**: tokens go in `theme.extend` of `tailwind.config.js`; dark mode via `darkMode: "class"`.

## shadcn/ui
- Init/add: `npx shadcn@latest init`, `npx shadcn@latest add button dialog card`.
- Components are copied into your repo (`components/ui`) — you own and should restyle them.
- Theme = CSS variables in `globals.css`: `--background --foreground --card --popover --primary
  --primary-foreground --secondary --muted --muted-foreground --accent --destructive --border
  --input --ring --radius --chart-1…5 --sidebar-*`. Map your design tokens onto these instead of
  shipping the default neutral theme. Visual editors: tweakcn.com.
- Third-party registries install through the same CLI (`npx shadcn@latest add <url or @registry/item>`)
  — Magic UI, Aceternity, Origin UI and many others publish this way. See libraries.md.
- With the shadcn MCP server connected, the agent can browse/search/install registry items directly.
- Make it yours: change `--radius`, fonts, the accent, border and shadow treatment; customize
  `Button` variants (`cva`) to match the style family.

## React + Next.js (App Router)
- Server Components by default; interactive/animated pieces go in `"use client"` components.
  Motion offers `import * as motion from "motion/react-client"` for use inside server components.
- Fonts: `next/font/google` / `next/font/local` with `variable` → CSS variable → Tailwind `@theme`.
- Images: `next/image` with explicit `sizes`; prioritize the LCP image (`priority` / `fetchPriority="high"`
  per your Next version); remote domains in `next.config` `images.remotePatterns`.
- Metadata: `export const metadata` / `generateMetadata` for title, description, Open Graph;
  `opengraph-image.tsx` for generated OG images.
- Theme switching: `next-themes` (adds `class="dark"`, avoids flash with `suppressHydrationWarning` on `<html>`).
- Avoid hydration mismatches in animated/random content (seed randomness, render on client).
- Plain React (Vite): same patterns; fonts via Fontsource.

## Vue + Nuxt
- UI: Nuxt UI (Tailwind v4 + Reka UI primitives), shadcn-vue, PrimeVue, Vuetify (Material).
- Fonts `@nuxt/fonts`; images `@nuxt/image` (`<NuxtImg>`, `<NuxtPicture>`).
- Motion: built-in `<Transition>`/`<TransitionGroup>`; Motion for Vue (`motion-v`); `@vueuse/motion`.
- Dark mode: `@nuxtjs/color-mode`.

## Svelte + SvelteKit
- Built-in motion: `transition:fade|fly|scale`, `animate:flip`, `svelte/motion` (`Spring`, `Tween`)
  and `svelte/easing`.
- UI: shadcn-svelte, Bits UI (headless), Skeleton, Melt UI.
- Svelte 5 runes (`$state`, `$derived`, `$props`) — match the project's version.

## Astro
- Ship zero JS by default; hydrate islands with `client:visible` / `client:idle`.
- View transitions: `import { ClientRouter } from "astro:transitions"` in the layout head
  (Astro 5; older versions call it `ViewTransitions`) + `transition:name` for shared elements.
- Images: `<Image />` / `<Picture />` from `astro:assets`. Fonts via Fontsource or Astro's fonts API.
- Content collections for blogs/docs; any UI framework works inside islands.

## Angular
- UI: Angular Material (Material 3 theming via Sass `mat.theme`), Angular CDK (a11y, overlays,
  drag-drop), Spartan UI (shadcn-style for Angular), PrimeNG.
- Recent Angular versions favor native CSS animations (`animate.enter` / `animate.leave`) over
  the legacy `@angular/animations` package — check the project's version.
- Signals for state; standalone components; `NgOptimizedImage` (`ngSrc`, `priority`) for images.

## Plain HTML / single file
- One `index.html` with `<style>` tokens in `:root`, semantic markup, a small `<script type="module">`.
- ES-module CDNs for libraries: `import { animate, scroll } from "https://cdn.jsdelivr.net/npm/motion@latest/+esm"`;
  GSAP: `<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>` (+ plugin files).
- Tailwind for quick prototypes only: `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`
  with `<style type="text/tailwindcss">@theme{…}</style>`. Use a build step for production.
- Always include `<meta name="viewport" content="width=device-width, initial-scale=1">` and `<html lang>`.

## React Native / Expo
- Styling: NativeWind (Tailwind classes), Tamagui, Unistyles, or `StyleSheet` with a token object.
- Motion: Reanimated (UI-thread animations), Moti (declarative on Reanimated), Gesture Handler;
  `expo-haptics` for tactile feedback.
- Assets: `expo-image` (caching, blurhash placeholders), `expo-font` / `@expo-google-fonts/*`.
- Respect platform conventions (iOS HIG vs Material 3), safe areas (`react-native-safe-area-context`),
  Dynamic Type / font scaling, and `AccessibilityInfo.isReduceMotionEnabled()`.

## Flutter
- `ThemeData(useMaterial3: true, colorScheme: ColorScheme.fromSeed(seedColor: …))`, custom tokens via
  `ThemeExtension`; `google_fonts` package; `flutter_animate` for declarative effects; Cupertino widgets
  for iOS feel; check `MediaQuery.disableAnimationsOf(context)` for reduced motion.

## SwiftUI
- System materials (`.ultraThinMaterial`), Liquid Glass (`.glassEffect()` on iOS 26+), SF Symbols,
  Dynamic Type, `.animation(.spring)`, `matchedGeometryEffect`, `@Environment(\.accessibilityReduceMotion)`.

## Jetpack Compose
- `MaterialTheme` with custom `ColorScheme`/`Typography`, dynamic color on Android 12+,
  `animate*AsState`, `AnimatedVisibility`, `SharedTransitionLayout`; respect system animation scale.
