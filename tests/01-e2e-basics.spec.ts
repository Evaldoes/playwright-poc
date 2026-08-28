import { test, expect } from "@playwright/test";

/**
 * BASIC E2E CONCEPTS
 *
 * - Every `test()` runs in a fresh BrowserContext (full isolation: cookies,
 *   localStorage and session never leak between tests).
 * - `page.goto()` navigates; `baseURL` (set in playwright.config.ts) avoids
 *   repeating "http://localhost:3000" everywhere.
 * - Locators (`page.getByRole`, `getByLabel`, `getByTestId`...) describe WHAT
 *   you want to find, not HOW to find it — Playwright waits (auto-wait) for
 *   the element to exist/be visible/be enabled before acting.
 * - `expect(locator)...` are "web-first assertions": they poll automatically
 *   until the condition is met or the timeout expires, removing the need for
 *   manual sleeps (the biggest source of flakiness in E2E tests).
 */

test.describe("Login - basic flow", () => {
  test("user can log in with valid credentials", async ({ page }) => {
    await page.goto("/index.html");

    // getByLabel links the <label for="..."> to the <input id="...">, just like a user would
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("password123");

    // getByTestId uses the data-testid attribute — useful when text/role change often
    await page.getByTestId("login-submit").click();

    // Auto-wait: Playwright waits for the navigation and for the element to appear
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.getByTestId("welcome")).toBeVisible();
    await expect(page.locator("#whoami")).toHaveText("Signed in as: admin");
  });

  test("login with invalid credentials shows an error", async ({ page }) => {
    await page.goto("/index.html");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByTestId("login-submit").click();

    await expect(page.getByText("Invalid credentials")).toBeVisible();
  });
});

test("client-side search updates the results list", async ({ page }) => {
  await page.goto("/index.html");
  await page.locator("#search-input").fill("playwright");
  await page.locator("#search-submit").click();

  // toHaveCount waits until the element count matches
  await expect(page.locator("#search-results li")).toHaveCount(3);
  await expect(page.locator("#search-results")).toContainText('result for "playwright"');
});
