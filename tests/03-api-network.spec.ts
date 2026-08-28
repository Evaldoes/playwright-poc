import { test, expect } from "@playwright/test";

/**
 * API AND NETWORK TESTS
 *
 * Playwright isn't just for clicking buttons. Two useful capabilities:
 *
 * 1) `request` context: a built-in HTTP client for testing APIs directly,
 *    without opening a browser — faster for validating backend contracts.
 *
 * 2) `page.route()`: intercepts requests made BY THE BROWSER during an E2E
 *    test. Useful for mocking responses (testing error/loading screens
 *    without depending on the real backend) or for inspecting what the
 *    frontend is actually sending (e.g. checking a token is sent in the
 *    right header).
 */

test.describe("Pure API tests (no browser)", () => {
  test("GET /api/search returns the expected results", async ({ request }) => {
    const res = await request.get("/api/search?q=test");
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.query).toBe("test");
    expect(body.results).toHaveLength(3);
  });

  test("GET /api/me without a session returns 401", async ({ request }) => {
    const res = await request.get("/api/me");
    expect(res.status()).toBe(401);
  });
});

test.describe("Browser network interception", () => {
  test("mocks the search API response and validates the rendered UI", async ({ page }) => {
    // Intercepts the real call and returns a payload controlled by the test —
    // useful for testing the UI without depending on the real backend state.
    await page.route("**/api/search**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ query: "mock", results: ["mocked result 1", "mocked result 2"] }),
      });
    });

    await page.goto("/index.html");
    await page.locator("#search-input").fill("anything");
    await page.locator("#search-submit").click();

    // The UI reflects the mock, not the real backend — proof the interception worked
    await expect(page.locator("#search-results")).toContainText("mocked result 1");
    await expect(page.locator("#search-results li")).toHaveCount(2);
  });

  test("simulates a network failure (API down) and observes the UI behavior", async ({ page }) => {
    await page.route("**/api/search**", (route) => route.abort("failed"));

    await page.goto("/index.html");
    await page.locator("#search-input").fill("test");
    await page.locator("#search-submit").click();

    // The list stays empty because the fetch failed — a scenario that's hard
    // to reproduce reliably without network interception
    await expect(page.locator("#search-results li")).toHaveCount(0);
  });

  test("spies on requests without altering the real response", async ({ page }) => {
    const requestsMade: string[] = [];

    page.on("request", (req) => {
      if (req.url().includes("/api/search")) requestsMade.push(req.url());
    });

    await page.goto("/index.html");
    await page.locator("#search-input").fill("observability");
    await page.locator("#search-submit").click();
    await expect(page.locator("#search-results li")).toHaveCount(3);

    expect(requestsMade).toHaveLength(1);
    expect(requestsMade[0]).toContain("q=observability");
  });
});
