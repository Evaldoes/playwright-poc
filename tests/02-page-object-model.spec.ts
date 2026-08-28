import { test as base, expect, Page } from "@playwright/test";

/**
 * PAGE OBJECT MODEL (POM) + CUSTOM FIXTURES
 *
 * Why: as a suite grows, repeating selectors and steps across tests becomes
 * expensive to maintain (a selector changes → you edit 40 files). The POM
 * encapsulates "how to interact with a page" in a class; tests then speak
 * the language of the domain ("log in"), not of selectors.
 *
 * Fixtures (test.extend) are Playwright's way of doing dependency injection:
 * each test declares what it needs (`{ loginPage }`, `{ authenticatedPage }`)
 * and the framework handles setup/teardown.
 */

class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/index.html");
  }

  async login(username: string, password: string) {
    await this.page.getByLabel("Username").fill(username);
    await this.page.getByLabel("Password").fill(password);
    await this.page.getByTestId("login-submit").click();
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  get welcomeHeading() {
    return this.page.getByTestId("welcome");
  }

  get whoAmI() {
    return this.page.locator("#whoami");
  }
}

// Custom fixtures: extend Playwright's base `test`
type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page; // arrives already logged in
};

const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  authenticatedPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.login("admin", "password123");
    await expect(page).toHaveURL(/dashboard\.html/);
    await use(page); // the test receives the page already authenticated
  },
});

test("login via Page Object reads like a business scenario", async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login("admin", "password123");

  await expect(dashboardPage.welcomeHeading).toBeVisible();
  await expect(dashboardPage.whoAmI).toHaveText("Signed in as: admin");
});

test("the 'authenticatedPage' fixture avoids repeating the login flow", async ({ authenticatedPage }) => {
  // This test already starts authenticated — setup was resolved by the fixture
  await expect(authenticatedPage.getByTestId("welcome")).toBeVisible();
});
