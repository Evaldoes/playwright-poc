# Playwright POC — Concepts, Development and Security

A self-contained proof of concept (sample app + tests) to learn the core
[Playwright](https://playwright.dev) concepts and see how it helps both in
software development (E2E, API, and visual automation) and in defensive
security testing.

## What is Playwright

A browser automation framework (Chromium, Firefox, WebKit) maintained by
Microsoft, used mainly for end-to-end testing, but also for controlled
scraping, PDF/screenshot generation, and verifying the real behavior of web
pages. The key difference from older tools like Selenium is **auto-waiting**:
Playwright automatically waits for elements to be ready, eliminating the
biggest cause of flaky tests.

## Project structure

```
app/                  # Express sample app (the target under test)
  server.ts
  public/
tests/
  01-e2e-basics.spec.ts        # locators, actions, assertions, auto-wait
  02-page-object-model.spec.ts # Page Object Model + custom fixtures
  03-api-network.spec.ts       # pure API testing + network interception/mocking
  04-security.spec.ts          # cookies, headers, reflected XSS, CSRF
  05-visual-perf.spec.ts       # screenshot diffing, tracing, a11y (axe-core), perf
playwright.config.ts   # starts the sample app automatically before tests (webServer)
```

## Getting started

```bash
npm install
npx playwright install --with-deps chromium   # downloads the browser managed by Playwright
npm test                 # run everything headless
npm run test:headed      # run with the browser visible
npm run test:ui          # open Playwright's UI Mode (interactive, great for learning)
npm run report            # open the HTML report from the last run
```

You don't need to start the app manually — the config (`webServer`) does that
for you before the tests run and tears it down afterward.

## Concepts by file (what each one is for)

### 1. `01-e2e-basics.spec.ts` — E2E automation
- **Locators** (`getByRole`, `getByLabel`, `getByTestId`): describe intent
  ("the login submit button"), not a fragile CSS selector.
- **Auto-waiting**: `click()`, `fill()` and `expect(locator)` wait for the
  element to exist, be visible and be enabled — no manual `sleep()`.
- **Test isolation**: every `test()` runs in a fresh `BrowserContext` (like an
  incognito tab), so cookies/session from one test never leak into another.
- **How it helps dev**: catches regressions in real user flows that unit
  tests can't cover (e.g. broken JS that prevents a click from working).

### 2. `02-page-object-model.spec.ts` — Scale and maintainability
- **Page Object Model**: encapsulates a page's selectors/actions in a class;
  tests then read like business scenarios.
- **Custom fixtures** (`test.extend`): Playwright's form of dependency
  injection — e.g. an `authenticatedPage` fixture that hands the test an
  already-logged-in page, avoiding repeating the login flow everywhere.
- **How it helps dev**: when the UI changes, you fix it in one place (the
  Page Object), not across dozens of tests.

### 3. `03-api-network.spec.ts` — API and network
- **`request` context**: a built-in HTTP client to test endpoints directly,
  without opening a browser — faster, great for validating API contracts in CI.
- **`page.route()`**: intercepts calls made by the browser during an E2E
  test. Used to mock responses (test error screens without depending on the
  real backend), simulate network failures, or spy on what the frontend is
  actually sending.
- **How it helps dev**: tests scenarios that are hard to reproduce (API
  down, slow responses, 500 errors) deterministically.

### 4. `04-security.spec.ts` — Defensive security
- **Session cookies**: checks `httpOnly` (prevents reading via JS, mitigating
  session theft through XSS) and `sameSite` (mitigates CSRF).
- **HTTP headers**: verifies `X-Frame-Options`, `X-Content-Type-Options`,
  `Content-Security-Policy` — basic protections against clickjacking, MIME
  sniffing and script injection.
- **Reflected XSS**: one test passes against the safe endpoint (`/api/search`,
  which escapes input) and another **demonstrates detection** of an
  intentionally vulnerable route (`/vulnerable-search`) — the kind of test
  that, in a real pipeline, would block the deployment of a security
  regression.
- **CSRF**: verifies a sensitive action is rejected without a valid token.
- **Important**: everything runs against the local sample app, under our
  control. Never point a test like the XSS one at a third-party system
  without explicit authorization — that would be unauthorized penetration
  testing.
- **How it helps security**: turns basic security checks into automated
  tests that run on every PR, catching regressions before they reach
  production (it doesn't replace a dedicated pentest or SAST/DAST, but
  complements them).

### 5. `05-visual-perf.spec.ts` — Visual, performance and accessibility
- **Visual regression** (`toHaveScreenshot`): compares screenshots pixel by
  pixel against a versioned "golden" image — catches CSS bugs functional
  tests can't see.
- **Tracing**: records a full session (screenshots, DOM, network, console)
  browsable via `npx playwright show-trace` — essential for debugging
  failures in CI.
- **Accessibility** (`@axe-core/playwright`): runs the same rules as axe-core
  (used by Lighthouse/DevTools) against the real rendered DOM.
- **Basic performance**: uses the browser's own Navigation Timing API to
  check load time, no external tooling needed.

## Why this matters

| Area | What Playwright solves |
|---|---|
| Dev/QA | Stable E2E tests (auto-wait), maintainable at scale (POM/fixtures), easy to debug (trace) |
| API | Tests backend contracts and frontend behavior under network failures |
| Security | Automates basic checks (headers, cookies, XSS, CSRF) as part of CI |
| Visual quality | Catches CSS regressions and accessibility issues before users do |

## License

MIT
