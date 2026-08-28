import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * VISUAL, PERFORMANCE AND ACCESSIBILITY TESTS
 *
 * - Visual regression: `toHaveScreenshot()` compares a current screenshot
 *   against a "golden" one saved in the repo; any pixel difference (above a
 *   threshold) fails the test. Great for catching CSS bugs functional tests
 *   don't see.
 * - Tracing: records a browsable `.zip` file (screenshots, DOM snapshots,
 *   network, console) for debugging failures — essential in CI, where you
 *   can't see the screen running.
 * - Accessibility (a11y): `@axe-core/playwright` runs the same rules as
 *   axe-core (the engine behind Lighthouse/DevTools) against the real DOM.
 * - Basic performance: browser-native metrics via `page.evaluate` on the
 *   Navigation Timing API — no external tooling needed.
 */

test("visual regression of the login page", async ({ page }) => {
  await page.goto("/index.html");
  // On the first run, Playwright automatically creates the "golden" screenshot;
  // on subsequent runs, it compares pixel by pixel against it.
  await expect(page).toHaveScreenshot("login-page.png", { maxDiffPixelRatio: 0.02 });
});

test("tracing captures a session for debugging", async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto("/index.html");
  await page.getByLabel("Username").fill("admin");
  await page.getByLabel("Password").fill("password123");
  await page.getByTestId("login-submit").click();
  await expect(page).toHaveURL(/dashboard\.html/);

  await context.tracing.stop({ path: "test-results/login-trace.zip" });
  // To inspect: npx playwright show-trace test-results/login-trace.zip
});

test("accessibility: login page has no critical violations (axe-core)", async ({ page }) => {
  await page.goto("/index.html");

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  expect(
    criticalViolations,
    JSON.stringify(criticalViolations.map((v) => v.id), null, 2)
  ).toEqual([]);
});

test("basic performance: page load time stays under the threshold", async ({ page }) => {
  await page.goto("/index.html");

  const timing = await page.evaluate(() => {
    const [nav] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return {
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
    };
  });

  // Generous threshold — on a local app this is usually a few dozen ms
  expect(timing.loadComplete).toBeLessThan(3000);
});
