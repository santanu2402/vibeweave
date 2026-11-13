// UI smoke + accessibility + responsive spec — a starting point. Adapt routes, names and the
// primary-action flow to the project's REQUIREMENTS.md acceptance criteria, then delete what doesn't apply.
// Needs: npm i -D @playwright/test @axe-core/playwright   (and a playwright.config.ts with baseURL)
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = ["/"]; // every route in scope
const PRIMARY_ACTION = { role: "link" as const, name: /get started|book|buy|sign up/i }; // from the brief

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
  return problems;
}

for (const route of ROUTES) {
  test.describe(`route ${route}`, () => {
    test("loads without errors and has one h1", async ({ page }) => {
      const problems = collectProblems(page);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page).toHaveTitle(/.+/);
      expect(problems).toEqual([]);
    });

    test("no critical or serious axe violations", async ({ page }) => {
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });

    for (const width of [320, 375, 768, 1440]) {
      test(`no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }

    test("visual baseline", async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveScreenshot(`${route === "/" ? "home" : route.replaceAll("/", "_")}.png`, { fullPage: true, maxDiffPixelRatio: 0.01 });
    });
  });
}

test("primary action is reachable and works by keyboard", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole(PRIMARY_ACTION.role, { name: PRIMARY_ACTION.name }).first();
  await expect(cta).toBeVisible();
  for (let i = 0; i < 40 && !(await cta.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(cta).toBeFocused();
  await page.keyboard.press("Enter");
  // Assert the real outcome from the brief here, e.g. await expect(page).toHaveURL(/\/signup/);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });
  test("content is visible and nothing keeps moving", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const moving = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running" &&
      a.effect instanceof KeyframeEffect && a.effect.getKeyframes().some((k) => k.transform || k.translate || k.scale || k.rotate)).length);
    expect(moving).toBe(0);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("headline is visible (no opacity:0 reveal trap)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("dark mode", () => {
  test.use({ colorScheme: "dark" });
  test("visual baseline (dark)", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveScreenshot("home-dark.png", { fullPage: true, maxDiffPixelRatio: 0.01 });
  });
});
