# Site Blueprints — 28 website types

A **checklist** per site type: the job, the KPI, the content a visitor expects, presets and patterns that are
*typical* for it, motion level, must-haves and pitfalls. **Do not copy the section order or the suggested
presets** — that is how every site ends up looking alike. Use a blueprint to make sure nothing essential is
missing, then let the brief, the concept metaphor (`scripts/novelty.mjs ideas`) and the direction card decide
the structure, layout grammar and look. Presets: `scripts/preset.mjs list --for <type>`; patterns:
`assets/patterns/INDEX.md`; style recipes: `styles.md`; industry nuances: `industry-playbook.md`.

## Contents
Marketing & product: 1 SaaS · 2 AI product · 3 Developer tool / API · 4 Mobile app · 5 B2B enterprise · 6 Startup waitlist
Commerce: 7 Online store · 8 Single-product D2C · 9 Marketplace · 10 Fashion / luxury
Personal & creative: 11 Portfolio · 12 Agency / studio · 13 Creator / personal brand · 14 Music / artist · 15 Photography
Content: 16 Blog / magazine · 17 Documentation · 18 Newsletter · 19 Online course / education
Local & services: 20 Restaurant / café · 21 Hotel / travel · 22 Real estate · 23 Clinic / healthcare · 24 Professional services (law, finance, consulting) · 25 Local trades & services
Organizations & apps: 26 Nonprofit / charity · 27 Event / conference · 28 Dashboard / web app

---

### 1. SaaS product site
**Job:** turn visitors into trials/demos. **KPI:** sign-up or demo-request rate.
**Sections:** hero with the product working (not a stock illustration) + primary CTA → proof strip (real logos or a metric) →
3–4 outcome-led feature sections, each with UI → how it works (3 steps if it really is 3 steps) → use cases/personas →
integrations → testimonials with names/roles → pricing teaser or table → FAQ (objections) → final CTA → footer.
**Presets:** swiss-signal, bento-clean, dark-premium, liquid-glass. **Patterns:** bento-grid, spotlight-card, scroll-reveal, animated-tabs (pricing toggle).
**Motion:** 4–5. **Must-haves:** live/animated product demo, transparent pricing, security/compliance badges if B2B.
**Pitfalls:** the template sequence with three icon cards; "revolutionize your workflow" copy; fake logos.

### 2. AI product
**Job:** make a new capability concrete and trustworthy. **KPI:** first successful use (try-it) or waitlist.
**Sections:** hero with a real input → output example (interactive if possible) → what it's good at / not good at →
examples gallery by use case → how it works (data, privacy, model) → pricing/limits → trust (security, data use) → CTA.
**Presets:** glass-aurora, swiss-signal, dark-premium. **Patterns:** typewriter (for a prompt, once), scroll-reveal, skeleton (generation states).
**Motion:** 4–6. **Must-haves:** real outputs, honest limitations, data/privacy statement. **Pitfalls:** sparkle icons, purple glow, "magic".

### 3. Developer tool / API
**Job:** show the developer experience in seconds. **KPI:** docs visits → API key / install.
**Sections:** hero with the install command or code + result → copyable quickstart → features as code/UI pairs → SDKs and
integrations → performance/reliability numbers → pricing (free tier first) → docs/community links → CTA.
**Presets:** dark-premium, terminal-hacker, data-dense. **Patterns:** border-beam (one), animated-tabs (language switcher), scroll-progress.
**Motion:** 3–5. **Must-haves:** copy buttons, real code, status page link, changelog. **Pitfalls:** gimmick typing, green-on-black only.

### 4. Mobile app landing
**Job:** get the install. **KPI:** store click-through.
**Sections:** hero with device frames of real screens + store badges → 3 key flows as scroll-told screens → social proof
(ratings, reviews) → features grid → privacy → FAQ → badges again.
**Presets:** liquid-glass, m3-expressive, playful-toy, clay-play. **Patterns:** scroll-video (screen sequence), tilt-card, scroll-reveal.
**Motion:** 5–7. **Must-haves:** smart banner/QR for desktop visitors, real ratings. **Pitfalls:** blurry screenshots, generic mockups.

### 5. B2B enterprise
**Job:** credibility and qualified leads. **KPI:** demo requests from target accounts.
**Sections:** outcome-led hero → industries/use cases → platform overview (diagram) → case studies with numbers → security,
compliance, integrations → ROI/proof → resources → contact sales (short form).
**Presets:** corporate-trust, swiss-signal, data-dense. **Patterns:** animated-tabs (by industry), number-ticker (real metrics), progress.
**Motion:** 2–3. **Must-haves:** case studies, SOC2/ISO/GDPR info, named contacts. **Pitfalls:** jargon walls, stock handshakes.

### 6. Startup waitlist / coming soon
**Job:** capture intent. **KPI:** sign-ups. **Sections:** one sharp promise + email field → 3 reasons → founder note → social proof/count → FAQ.
**Presets:** neo-brutal-pop, kinetic-type, glass-aurora. **Patterns:** marquee, magnetic-button, toast (confirmation).
**Motion:** 5–7. **Must-haves:** confirmation + what happens next, privacy note. **Pitfalls:** fake counters.

### 7. Online store (home, category, product, cart, checkout)
**Job:** find → choose → buy. **KPI:** conversion rate, AOV.
**Home:** promo/hero → categories → bestsellers → value props (shipping, returns) → reviews → newsletter.
**Category (PLP):** filters + sort (URL-synced), product grid with price/variant/rating, quick add, pagination or load more.
**Product (PDP):** gallery (zoom, video), title, price, variants, stock, add-to-cart above the fold on mobile, delivery
estimate, reviews, size guide, related products. **Cart/checkout:** editable cart, guest checkout, address autocomplete,
Apple/Google Pay, clear totals incl. tax/shipping before the last step, progress steps.
**Presets:** ecommerce-crisp, luxury-noir, organic-earth. **Patterns:** skeleton, toast ("Added to cart — View cart"), progress (checkout steps), custom-scrollbar (rails).
**Motion:** 3–4. **Must-haves:** fast LCP image, sticky add-to-cart on mobile, returns policy. **Pitfalls:** carousels as the only browsing, fake urgency.

### 8. Single-product D2C
**Job:** desire → buy one product. **Sections:** cinematic hero of the product → the problem → how it works (exploded view /
scroll-video) → materials/specs → comparison → reviews/UGC → guarantee → buy box (sticky) → FAQ.
**Presets:** spatial-depth, tactile-skeuo, luxury-noir. **Patterns:** scroll-video, lighting, realistic-shadows, number-ticker.
**Motion:** 6–8. **Must-haves:** price + buy always reachable, shipping/returns. **Pitfalls:** 5MB hero video blocking the buy button.

### 9. Marketplace
**Job:** match two sides. **KPI:** searches → transactions; supply sign-ups. **Sections:** search-first hero → categories →
featured listings → how it works for buyers and sellers (tabs) → trust & safety → reviews → become a seller CTA.
**Presets:** ecommerce-crisp, bento-clean, playful-toy. **Patterns:** animated-tabs, skeleton, toast.
**Motion:** 3–4. **Must-haves:** search with filters, verified badges, dispute policy. **Pitfalls:** empty-looking supply.

### 10. Fashion / luxury brand
**Job:** desire and brand world. **Sections:** full-bleed editorial imagery/video → collection stories → lookbook →
craftsmanship → stores/appointments → shop.
**Presets:** luxury-noir, editorial-ink, maximal-riot (streetwear). **Patterns:** scroll-video, scroll-reveal, custom-cursor (sparingly).
**Motion:** 4–6, slow (luxury personality). **Must-haves:** exceptional photography, few words. **Pitfalls:** gold gradients, script fonts, slow image loads.

### 11. Portfolio (designer, developer, artist)
**Job:** get hired/commissioned. **KPI:** contact/inquiries. **Sections:** a hero that *is* the work (or a statement) →
selected projects (3–6, each with outcome) → about (human, short) → services/process → testimonials → contact.
**Case study page:** problem → role → process → solution (big visuals) → results → next project.
**Presets:** kinetic-type, bento-clean, raw-brutal, editorial-ink. **Patterns:** custom-cursor, tilt-card, scroll-reveal, marquee.
**Motion:** 6–8. **Must-haves:** real results, fast image loading, contact in one click. **Pitfalls:** 20 projects with no story.

### 12. Agency / studio
**Job:** prove taste and capability; win briefs. **Sections:** bold statement/showreel → work (filterable) → services →
approach → clients → team/culture → insights → contact/brief form.
**Presets:** kinetic-type, maximal-riot, swiss-signal. **Patterns:** scroll-video (showreel), custom-cursor, marquee, magnetic-button.
**Motion:** 7–9 (cinematic-web.md). **Must-haves:** real work, a brief form, location/time zone. **Pitfalls:** motion that hides the work.

### 13. Creator / personal brand
**Job:** grow audience and offers. **Sections:** who you are + what people get → featured content → offers (course, coaching,
products) → newsletter → social proof → links. **Presets:** neo-brutal-pop, editorial-ink, playful-toy.
**Patterns:** bento-grid (link-in-bio), marquee (logos/press), toast. **Motion:** 4–6. **Pitfalls:** link lists with no hierarchy.

### 14. Music / artist
**Job:** listen, follow, buy tickets/merch. **Sections:** latest release (player) → tour dates → videos → merch → bio/press kit →
newsletter. **Presets:** maximal-riot, raw-brutal, retro-y2k. **Patterns:** marquee, custom-cursor, scroll-video.
**Motion:** 6–8. **Must-haves:** embedded players, ticket links, press kit. **Pitfalls:** autoplay audio (never).

### 15. Photography
**Job:** show the eye; book shoots. **Sections:** image-led hero → galleries by genre → about → packages/pricing → booking.
**Presets:** luxury-noir, swiss-signal. **Patterns:** scroll-reveal, custom-scrollbar (horizontal galleries).
**Motion:** 3–5. **Must-haves:** responsive images (AVIF, srcset), lightbox with keyboard support. **Pitfalls:** watermarks over everything, slow galleries.

### 16. Blog / magazine
**Job:** reading and return visits. **KPI:** time on page, subscriptions. **Home:** featured story → latest → sections/topics →
newsletter. **Article:** title, dek, author/date, reading time, body at 60–72ch, pull quotes, images with captions,
related, newsletter. **Presets:** editorial-ink, swiss-signal, organic-earth. **Patterns:** scroll-progress, scroll-reveal (images only).
**Motion:** 2–3. **Must-haves:** RSS, OG images, fast text, good print styles. **Pitfalls:** popups before the first paragraph.

### 17. Documentation
**Job:** answer questions fast. **Layout:** search (⌘K) + sidebar nav + content + on-page TOC; versions; code tabs;
copy buttons; prev/next; "edit this page"; feedback widget. **Presets:** data-dense, terminal-hacker, swiss-signal.
**Patterns:** animated-tabs (code languages), scroll-progress, toast (copied). **Motion:** 1–2. **Pitfalls:** no search, stale versions.

### 18. Newsletter
**Job:** subscribe. **Sections:** promise + sign-up → sample issue → who writes it → testimonials/count → archive.
**Presets:** editorial-ink, neo-brutal-pop. **Patterns:** toast, marquee (press). **Motion:** 2–4. **Pitfalls:** vague promises ("insights").

### 19. Online course / education
**Job:** enroll. **Sections:** outcome promise → who it's for → curriculum (expandable) → instructor → student results →
pricing/plans → guarantee → FAQ. **App:** lesson player, progress, notes, quizzes.
**Presets:** clay-play (kids), civic-clear, bento-clean, playful-toy. **Patterns:** progress (course progress), toast, animated-tabs.
**Motion:** 3–5. **Must-haves:** syllabus, real outcomes, accessibility (captions). **Pitfalls:** countdown timers that reset.

### 20. Restaurant / café / bakery
**Job:** visit, book or order. **KPI:** reservations/orders. **Above the fold on mobile:** name, what kind of food, **hours,
address, book/order buttons.** Then: menu (HTML, not PDF) → atmosphere photos → story → events/private dining → reviews →
map + parking. **Presets:** warm-hospitality, organic-earth, luxury-noir (fine dining). **Patterns:** scroll-reveal, realistic-shadows (food cards), toast.
**Motion:** 2–4. **Must-haves:** HTML menu with prices and allergens, booking integration, phone tap-to-call. **Pitfalls:** PDF menus, autoplay video.

### 21. Hotel / travel
**Job:** direct bookings. **Sections:** immersive imagery + booking bar (dates, guests) → rooms → amenities → location/
experiences → offers → reviews → booking. **Presets:** luxury-noir, warm-hospitality, organic-earth.
**Patterns:** scroll-video, glass-nav, scroll-reveal, progress (booking steps). **Motion:** 4–6.
**Must-haves:** price transparency, accessible date picker, best-rate note. **Pitfalls:** heavy galleries on mobile data.

### 22. Real estate
**Job:** find properties / list with an agent. **Sections:** search (location, price, beds) → featured listings → map view →
neighborhoods → agent profiles → valuation CTA. **Listing page:** gallery, key facts, floor plan, map, agent contact, similar.
**Presets:** luxury-noir (premium), corporate-trust, ecommerce-crisp. **Patterns:** skeleton, custom-scrollbar, toast.
**Motion:** 2–4. **Must-haves:** fast filters with URL state, map/list toggle. **Pitfalls:** stale listings, hidden fees.

### 23. Clinic / healthcare
**Job:** book appointments; reassure. **Sections:** services + book button → doctors/team → insurance/pricing → locations/hours →
patient info (forms, prep) → reviews → contact/emergency notice.
**Presets:** civic-clear, corporate-trust, organic-earth (wellness). **Patterns:** progress (booking steps), toast, skeleton.
**Motion:** 1–2. **Must-haves:** WCAG AA+, plain language, phone/booking everywhere, privacy. **Pitfalls:** medical jargon, decorative motion.

### 24. Professional services (law, accounting, consulting)
**Job:** trust → consultation. **Sections:** practice areas → people (real bios) → results/case examples → insights → fees/
process → contact. **Presets:** corporate-trust, editorial-ink, swiss-signal. **Patterns:** animated-tabs, scroll-reveal.
**Motion:** 1–3. **Must-haves:** credentials, clear next step, compliance disclaimers. **Pitfalls:** stock gavels and handshakes.

### 25. Local trades & services (plumber, salon, gym, cleaner)
**Job:** call or book now. **Mobile-first:** tap-to-call + book button sticky, service area, prices or "from" prices, reviews,
before/after photos, opening hours, map. **Presets:** neo-brutal-pop, playful-toy, warm-hospitality.
**Patterns:** toast, progress (booking), number-ticker (years/jobs — only real numbers). **Motion:** 2–3.
**Pitfalls:** no phone number above the fold; slow site on mobile data.

### 26. Nonprofit / charity
**Job:** donate, volunteer, share. **Sections:** mission + donate CTA → impact with real numbers/stories → programs → how
donations are used → ways to help → transparency (reports) → events → donate.
**Presets:** civic-clear, organic-earth, editorial-ink. **Patterns:** number-ticker (real impact), progress (campaign goal), toast.
**Motion:** 2–4. **Must-haves:** simple donation flow (monthly option), accessibility. **Pitfalls:** guilt-heavy copy, slow donate page.

### 27. Event / conference
**Job:** register/buy tickets. **Sections:** name, date, place, ticket CTA → speakers → schedule (tabs by day) → venue/travel →
sponsors → tickets/pricing → FAQ/code of conduct. **Presets:** kinetic-type, maximal-riot, neo-brutal-pop.
**Patterns:** marquee (speakers/sponsors), animated-tabs (days), number-ticker (countdown/attendees), custom-cursor.
**Motion:** 6–8. **Must-haves:** add-to-calendar, time zones, accessibility info. **Pitfalls:** schedule as an image.

### 28. Dashboard / web app
**Job:** get work done. **KPI:** task time, errors, retention. **Layout:** app shell (sidebar → rail → bottom tabs on phones),
page header with primary action, filters, data views (tables/cards/charts), detail panels, settings.
**Presets:** data-dense, dark-premium, swiss-signal, m3-expressive. **Patterns:** skeleton, toast, progress, animated-tabs, loading-bar.
**Motion:** 1–3 (technical). **Must-haves:** every data state (feedback-states.md), keyboard shortcuts, density options, ui-integrate
state matrix. **Pitfalls:** marketing-style hero cards in apps; color-only status; charts without units.
