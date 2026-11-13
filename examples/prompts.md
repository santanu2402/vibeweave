# Example prompts

Skills trigger automatically from their descriptions — just describe what you want. In Claude Code
you can also call them explicitly: `/vibeweave`, `/ui-test`, `@agent-qa-tester`…

## vibeweave — the full crew (clarify → requirements → plan → tasks → build → test → optimize → fix → review)
- "/vibeweave build a website for my bakery."
  → expect rounds of short questions first (ordering or visits? menu? photos? feel?), then
  REQUIREMENTS.md, PLAN.md and TASKS.md for your approval, one at a time.
- "/vibeweave Kiln — a booking app for pottery studios. Hobbyists on phones. Warm, tactile, calm. Next.js + Tailwind."
  → a precise prompt: a short echo-back and fewer questions, but the same three approval gates.
- "/vibeweave redesign our SaaS dashboard; it looks dated. Keep all data and routes."
- "/vibeweave make an award-winning portfolio for a motion designer with a 3D hero and kinetic type."
- "Quick build: a pricing section with three tiers in our existing style — one combined approval is fine."
- "Harden the current homepage for launch: test it, fix what's broken, and get Core Web Vitals green."
- At any gate: "No — it feels too corporate." → it stops, asks what feels wrong, answers your questions and revises.

## frontend-forge — design & build
- "Give me three distinct visual directions for a fintech onboarding flow, with tokens for each, before you build anything."
- "Create a design system for this repo: tokens in Tailwind v4 `@theme`, a DESIGN.md, and restyle the existing buttons, inputs and cards."
- "Which UI style fits a luxury hotel booking site — glassmorphism, liquid glass, or editorial? Then build the hero."
- "Find a shopping-cart, heart and user icon in Phosphor duotone and add them as React components."
- "Design an SVG logo mark and wordmark for 'Kiln', plus favicon, apple-touch-icon and PWA icons."
- "Pull the Magic UI marquee component and restyle it to our tokens."

## motion-forge — animation, motion graphics, 3D
- "Storyboard a page-load sequence for the hero, then build it. Respect reduced motion."
- "Turn the features section into a pinned scroll story with GSAP ScrollTrigger."
- "Animate our logo: strokes draw in, then the wordmark rises letter by letter."
- "Make a Lottie JSON loader (pulsing dot) and play it with dotLottie."
- "Add a React Three Fiber hero with our `.glb` product, lazy-loaded with a poster image."
- "Use animated line-md icons for the loading and success states."
- "Make a 15-second promo video of the product with Remotion."

## visual-dna — references, DESIGN.md, image → code
- "Extract the design DNA of https://linear.app into a DESIGN.md and Tailwind tokens, then restyle our marketing page in that spirit."
- "Here's a screenshot — turn it into a responsive React + Tailwind component and compare your render to it."

## ui-test — QA
- "Test the checkout flow against REQUIREMENTS.md and give me a QA report."
- "Run an accessibility and keyboard pass on the whole site."
- "Write Playwright tests for the booking flow with visual baselines at 375 and 1440."

## ui-optimize — performance
- "Our mobile LCP is 4.8s — find out why and fix it without changing the design."
- "Why is our bundle 600KB? Cut it down."
- "The page jumps while loading — fix the layout shift."

## ui-debug — bug fixing
- "The header stops being sticky on mobile."
- "The modal appears behind the header no matter what z-index I use."
- "There's a horizontal scrollbar on iPhone."
- "We get a hydration error on the pricing page."

## ui-audit — review
- "Audit the UI in `src/` and give me a scored report with prioritized fixes."
- "Why does this page look amateur? Be brutally specific." *(attach a screenshot)*
