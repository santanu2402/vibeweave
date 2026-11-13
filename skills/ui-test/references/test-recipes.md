# Test Recipes

Versions checked November 2026: Playwright 1.65 · @axe-core/playwright 4.14 · Vitest 5.1 ·
Storybook 10.6. APIs move — confirm against the docs when a recipe fails.

## Contents
1. Playwright setup
2. Locators and assertions that don't flake
3. Accessibility: axe + ARIA snapshots + keyboard
4. Responsive, dark mode, reduced motion, no-JS
5. Visual regression
6. Network, errors and links
7. Playwright Test Agents (planner / generator / healer)
8. Component tests: Vitest browser mode, Testing Library, Storybook
9. CI

## 1. Playwright setup
```bash
npm init playwright@latest          # scaffolds playwright.config.ts + tests/
npm i -D @axe-core/playwright       # a11y assertions
```
```ts
// playwright.config.ts — the parts that matter for UI QA
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry", screenshot: "only-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 15"] } },        // WebKit + touch + 393px
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
```

## 2. Locators and assertions that don't flake
- Locate like a user: `getByRole("button", { name: "Book a wheel" })`, `getByLabel("Email")`,
  `getByText`, `getByTestId` only as a last resort. If a role query can't find it, that's often an
  accessibility bug — report it.
- Web-first assertions auto-wait: `await expect(locator).toBeVisible()`, `toHaveText`,
  `toHaveURL`, `toBeFocused`. Never `waitForTimeout` to "fix" flakiness.
- One behavior per test; independent tests (no shared state); seed data via API or fixtures.

## 3. Accessibility
```ts
import AxeBuilder from "@axe-core/playwright";
test("home has no serious a11y violations", async ({ page }) => {
  await page.goto("/");
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(r.violations.filter((v) => ["critical", "serious"].includes(v.impact!))).toEqual([]);
});
```
- axe only sees the current state: open menus, dialogs and error states before scanning them.
- Structure contract with ARIA snapshots (partial match, regex allowed):
```ts
await expect(page.getByRole("navigation", { name: "Main" })).toMatchAriaSnapshot(`
  - link "Studios"
  - link "Pricing"
  - button "Book a wheel"
`);
```
- Keyboard: tab to the primary action and activate it with Enter/Space; open a dialog and check
  `await expect(page.getByRole("dialog")).toBeVisible()`, focus inside, `Escape` closes, focus returns.
```ts
await page.keyboard.press("Tab");                       // first stop should be the skip link
await expect(page.getByRole("link", { name: /skip to/i })).toBeFocused();
```

## 4. Responsive, dark mode, reduced motion, no-JS
```ts
test.use({ viewport: { width: 320, height: 640 } });
test("no horizontal overflow at 320px", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("hero content visible without animation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
test.describe("no JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("content is readable", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();   // fails if opacity:0 reveal
  });
});
// dark mode: test.use({ colorScheme: "dark" }) · forced colors: test.use({ forcedColors: "active" })
```

## 5. Visual regression
```ts
await expect(page).toHaveScreenshot("home.png", { fullPage: true, maxDiffPixelRatio: 0.01,
  mask: [page.locator("[data-dynamic]")] });                       // mask clocks, avatars, ads
```
- Defaults already disable animations and hide the caret. Baselines are per browser + OS
  (`home-chromium-linux.png`): generate them where CI runs (Docker image) and update with
  `npx playwright test -u` only when the change is intended.
- Hosted review UIs: Chromatic (`@chromatic-com/playwright`, chromium only) or Argos
  (`@argos-ci/playwright`). Lost Pixel was archived in April 2026 — don't adopt it.

## 6. Network, errors and links
```ts
test("no console errors or failed requests", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(m.text()));
  page.on("pageerror", (e) => problems.push(e.message));
  page.on("response", (r) => r.status() >= 400 && problems.push(`${r.status()} ${r.url()}`));
  await page.goto("/");
  expect(problems).toEqual([]);
});
test("internal links resolve", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  for (const href of hrefs) expect((await request.get(href!)).status(), href!).toBeLessThan(400);
});
```
Slow network: `await page.route("**/*", async (r) => { await new Promise((s) => setTimeout(s, 300)); await r.continue(); })`
to see loading states; `route.fulfill({ status: 500 })` to see error states.

## 7. Playwright Test Agents
Playwright ≥ 1.56 ships three agent definitions: **planner** (explores the app from a seed test
and writes a Markdown test plan in `specs/`), **generator** (turns the plan into `tests/*.spec.ts`,
checking selectors live) and **healer** (re-runs failing tests and repairs locators — review its
changes: it can mark a test skipped when the feature is actually broken, which hides real bugs).
```bash
npx playwright init-agents --loop=claude     # or vscode | codex | opencode
```
Needs a `tests/seed.spec.ts`; re-run after upgrading Playwright. It writes agent files and MCP
config into the project — check what it changed (it may overwrite an existing `.mcp.json`).

## 8. Component tests
- **Vitest browser mode** (stable since Vitest 4): `npx vitest init browser`; provider
  `playwright()` from `@vitest/browser-playwright`; use `userEvent` from `vitest/browser`;
  `toMatchScreenshot` for visuals. Real browser, real CSS — better than jsdom for UI.
- **Testing Library** (`@testing-library/react` 16) — query by role/label, assert behavior.
- **Storybook 10**: `npx storybook add @storybook/addon-vitest` runs stories as tests
  (`vitest --project=storybook`); `play` functions are interaction tests;
  `npx storybook add @storybook/addon-a11y` with `parameters.a11y.test: "error"` fails CI on
  violations. Every state in `DESIGN.md` deserves a story.

## 9. CI
Run `audit.mjs --strict` and `playwright test` on every PR; upload the HTML report and traces as
artifacts; keep visual baselines in the repo; quarantine flaky tests with an owner and a date
instead of retrying forever.
