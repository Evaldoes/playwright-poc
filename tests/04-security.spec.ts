import { test, expect } from "@playwright/test";

/**
 * SECURITY — DEFENSIVE USE
 *
 * Playwright is not a pentesting tool, but it gives low-level access to
 * cookies, headers and the actual rendered DOM — enough to write automated
 * tests that fail the CI pipeline when a basic security regression is
 * introduced (e.g. someone removes a header, forgets `httpOnly` on the
 * session cookie, or reintroduces an XSS that was already fixed).
 *
 * All tests below run AGAINST THIS POC'S SAMPLE APP (localhost, under our
 * control). Never point a test like the reflected XSS one below at a system
 * you're not authorized to test.
 */

test.describe("Cookies and session", () => {
  test("session cookie has httpOnly and sameSite configured", async ({ page, context }) => {
    await page.goto("/index.html");
    await page.getByLabel("Username").fill("admin");
    await page.getByLabel("Password").fill("password123");
    await page.getByTestId("login-submit").click();
    await expect(page).toHaveURL(/dashboard\.html/);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "connect.sid");

    expect(sessionCookie).toBeDefined();
    // httpOnly prevents the cookie from being read via `document.cookie` —
    // mitigates session theft through XSS
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe("Lax");
  });
});

test.describe("HTTP security headers", () => {
  test("response includes anti-clickjacking and anti-sniffing headers", async ({ request }) => {
    const res = await request.get("/index.html");
    const headers = res.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
  });
});

test.describe("Reflected XSS detection", () => {
  test("safe endpoint (/api/search) escapes the input in the DOM", async ({ page }) => {
    await page.goto("/index.html");
    await page.locator("#search-input").fill('<img src=x onerror="window.__xss=true">');
    await page.locator("#search-submit").click();

    // Since the result is injected via `textContent` (not innerHTML), the
    // payload becomes literal text and the script never executes
    const xssRan = await page.evaluate(() => (window as any).__xss === true);
    expect(xssRan).toBe(false);
  });

  // test.fail() documents that this assertion is EXPECTED to fail: the route
  // is intentionally vulnerable, and this test proves the suite is capable of
  // detecting it. On a real (non-intentional) endpoint, this same assertion
  // should pass — and if it ever starts failing, that's exactly the signal
  // that should block a deploy.
  test.fail(
    "vulnerable endpoint (/vulnerable-search) allows reflected XSS — failure expected as a demonstration",
    async ({ page }) => {
      const payload = `<script>alert('xss')</script>`;
      await page.goto(`/vulnerable-search?q=${encodeURIComponent(payload)}`);

      const html = await page.content();
      const wasEscaped = !html.includes("<script>alert('xss')</script>");

      expect(
        wasEscaped,
        "Security regression: /vulnerable-search reflects input without escaping (XSS)."
      ).toBe(true);
    }
  );
});

test.describe("CSRF", () => {
  test("sensitive action is rejected without a valid CSRF token", async ({ request }) => {
    const res = await request.post("/api/action", { data: {} });
    expect(res.status()).toBe(403);
  });

  test("sensitive action is accepted with a valid CSRF token from the same session", async ({ request }) => {
    const tokenRes = await request.get("/api/csrf-token");
    const { csrfToken } = await tokenRes.json();

    const actionRes = await request.post("/api/action", {
      headers: { "X-CSRF-Token": csrfToken },
      data: {},
    });
    expect(actionRes.status()).toBe(200);
  });
});
