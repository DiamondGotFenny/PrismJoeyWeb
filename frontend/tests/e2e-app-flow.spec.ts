import { test, expect } from '@playwright/test';

/**
 * RULE: DO NOT EXTEND TIMEOUT LIMITS - Fix the root cause instead of masking issues with longer waits
 *
 * This E2E test suite focuses on routing, navigation, and path functionality.
 * Practice session flow tests are handled separately in practice-session-flow.spec.ts.
 */
test.describe('E2E Application Flow - Navigation & Routing', () => {
  /**
   * Test Case 1: Navigation Robustness - Back Button Functionality
   * This test verifies that navigating backward through the application works as expected.
   * No API mocking is needed as these are static pages or pages that handle missing data gracefully.
   */
  test('Test Case 1: Navigation Robustness - Back Button Functionality', async ({
    page,
  }) => {
    // Step 1: Navigate deep into the application
    await page.goto('/');
    await page.getByRole('button', { name: '开始学习' }).click();
    await page.getByRole('button', { name: '一年级' }).click();
    await page.getByRole('button', { name: '数学' }).click();
    await page.getByRole('button', { name: '练习题' }).click();

    await expect(page).toHaveURL(
      '/grades/1/subjects/mathematics/practice/difficulty'
    );

    // Step 2: Navigate backward through the pages using the browser's back functionality
    await page.goBack();
    await expect(page).toHaveURL('/grades/1/subjects/mathematics');

    await page.goBack();
    await expect(page).toHaveURL('/grades/1/subjects');

    await page.goBack();
    await expect(page).toHaveURL('/grades');

    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  /**
   * Test Case 2: Boundary Case - Accessing Content Under Development
   * This test ensures that attempting to access features marked as "in development" provides the correct feedback.
   */
  test('Test Case 2: Boundary Case - Accessing Content Under Development', async ({
    page,
  }) => {
    await page.goto('/');

    // Step 1: Navigate to a section with content under development
    await page.getByRole('button', { name: '开始学习' }).click();
    await page.getByRole('button', { name: '二年级' }).click();
    await expect(page).toHaveURL('/grades/2/subjects');
    await page.getByRole('button', { name: '数学' }).click();
    await expect(page).toHaveURL('/grades/2/subjects/mathematics');

    // Step 2: Handle the expected alert dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('正在开发中'); // More flexible check
      await dialog.accept();
    });

    // Click the button for the feature in development
    await page.getByRole('button', { name: '练习题' }).click();

    // Assert that the URL has not changed after the alert is dismissed
    await expect(page).toHaveURL('/grades/2/subjects/mathematics');
  });

  /**
   * Test Case 3: Deep Linking - Direct URL Access
   * This group of tests verifies that users can directly navigate to specific pages within the application.
   */
  test.describe('Test Case 3: Deep Linking - Direct URL Access', () => {
    test('should correctly load the subject options page directly', async ({
      page,
    }) => {
      await page.goto('/grades/1/subjects/mathematics');
      await expect(page.getByRole('heading', { name: '数学学习' })).toBeVisible(
        { timeout: 5000 }
      );
      await expect(page.getByText('一年级 数学内容')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should correctly load the difficulty selection page directly', async ({
      page,
    }) => {
      // Mock the API call for this specific test
      await page.route('**/api/v1/difficulty/levels', async (route) => {
        await route.fulfill({
          json: [
            {
              id: 1,
              name: '10以内加减法',
              code: 'within_10',
              max_number: 10,
              allow_carry: false,
              allow_borrow: false,
              operation_types: ['addition', 'subtraction'],
              order: 1,
            },
          ],
        });
      });

      await page.goto('/grades/1/subjects/mathematics/practice/difficulty');
      await expect(
        page.getByRole('heading', { name: '选择练习难度' })
      ).toBeVisible({ timeout: 5000 });
      // Assert that mocked difficulty button is present
      await expect(
        page.getByRole('button', { name: '10以内加减法' })
      ).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
