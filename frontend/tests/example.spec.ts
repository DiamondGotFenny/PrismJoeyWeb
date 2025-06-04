import { test, expect } from '@playwright/test';

test.describe('Frontend Application', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title is set
    await expect(page).toHaveTitle(/Vite \+ React/);

    // Verify the page loads without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Add tests for your specific navigation elements
    // Example: Check if main navigation elements are present
    // await expect(page.locator('[data-testid="nav-home"]')).toBeVisible();
    // await expect(page.locator('[data-testid="nav-about"]')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('/');

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});
