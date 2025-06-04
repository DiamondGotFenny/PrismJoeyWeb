# E2E Testing with Playwright

This directory contains end-to-end tests for the frontend application using Playwright.

## Getting Started

### Prerequisites

- Node.js and npm installed
- Playwright browsers installed (already done during setup)

### Running Tests

#### Basic Commands

```bash
# Run all tests in headless mode
npm run test:e2e

# Run tests with browser UI visible
npm run test:e2e:headed

# Run tests with Playwright's interactive UI
npm run test:e2e:ui

# Debug tests step by step
npm run test:e2e:debug
```

#### Advanced Commands

```bash
# Run tests in a specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run a specific test file
npx playwright test tests/example.spec.ts

# Run tests matching a pattern
npx playwright test --grep "homepage"

# Run tests in parallel
npx playwright test --workers=4
```

## Configuration

The Playwright configuration is located in `playwright.config.ts` and includes:

- **Base URL**: http://localhost:5173 (Vite dev server)
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Features**:
  - Automatic dev server startup
  - Screenshots on failure
  - Video recording on failure
  - Trace collection on retry
  - HTML reporter

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Your test code here
  });
});
```

### Best Practices

1. **Use data-testid attributes** for reliable element selection:

   ```html
   <button data-testid="submit-button">Submit</button>
   ```

   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Wait for elements** before interacting:

   ```typescript
   await page.waitForSelector('[data-testid="content"]');
   await expect(page.locator('[data-testid="content"]')).toBeVisible();
   ```

3. **Use page.goto()** for navigation:

   ```typescript
   await page.goto('/dashboard');
   ```

4. **Group related tests** in describe blocks:
   ```typescript
   test.describe('User Authentication', () => {
     // Related tests here
   });
   ```

### Common Assertions

```typescript
// Text content
await expect(page.locator('h1')).toContainText('Welcome');

// Visibility
await expect(page.locator('.modal')).toBeVisible();
await expect(page.locator('.loading')).toBeHidden();

// URL
await expect(page).toHaveURL('/dashboard');

// Title
await expect(page).toHaveTitle('My App');

// Form inputs
await expect(page.locator('input[name="email"]')).toHaveValue(
  'test@example.com'
);
```

## Debugging

### Visual Debugging

- Use `npm run test:e2e:headed` to see tests run in browser
- Use `npm run test:e2e:debug` to debug step by step
- Add `await page.pause();` to pause execution at specific points

### Screenshots and Videos

- Screenshots are automatically taken on test failures
- Videos are recorded for failed tests
- Both are saved in `test-results/` directory

### Playwright Inspector

```bash
# Debug a specific test
npx playwright test tests/example.spec.ts --debug
```

## CI/CD Integration

For continuous integration, tests will:

- Run in headless mode
- Retry failed tests up to 2 times
- Generate HTML reports
- Run with a single worker for stability

## Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report includes:

- Test results and timing
- Screenshots of failures
- Video recordings
- Trace files for debugging
