import { test, expect, Page } from '@playwright/test';

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

  /**
   * Test Case 4: Result Page Navigation Buttons
   * Verify that the three action buttons on the ExerciseResultPage
   * navigate to the correct destinations with the new routing structure.
   */
  test.describe('Test Case 4: Result Page Navigation Buttons', () => {
    const TOTAL_QUESTIONS = 1;
    let mockSessionId: string;

    /** Sets up mocks for a single-question session so we can reach the result page quickly */
    const setupSingleQuestionMocks = async (page: Page, sessionId: string) => {
      // Difficulty levels
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

      // Start session
      await page.route('**/api/v1/practice/start', async (route) => {
        const post = await route.request().postDataJSON();
        await route.fulfill({
          json: {
            id: sessionId,
            user_id: null,
            difficulty_level_id: post.difficulty_level_id,
            total_questions_planned: TOTAL_QUESTIONS,
            questions: [],
            current_question_index: 0,
            score: 0,
            start_time: new Date().toISOString(),
            end_time: null,
          },
        });
      });

      // Next question
      await page.route('**/api/v1/practice/question*', async (route) => {
        await route.fulfill({
          json: {
            id: `q-${sessionId}-1`,
            session_id: sessionId,
            operands: [1, 1],
            operations: ['+'],
            question_string: '1 + 1 = ?',
            question_type: 'arithmetic',
            correct_answer: 2,
            difficulty_level_id: 1,
            created_at: new Date().toISOString(),
          },
        });
      });

      // Answer submission
      await page.route('**/api/v1/practice/answer', async (route) => {
        const body = await route.request().postDataJSON();
        await route.fulfill({
          json: {
            id: body.question_id,
            session_id: sessionId,
            user_answer: body.user_answer,
            is_correct: true,
            correct_answer: 2,
            time_spent: 5,
            answered_at: new Date().toISOString(),
          },
        });
      });

      // Summary
      await page.route('**/api/v1/practice/summary*', async (route) => {
        await route.fulfill({
          json: {
            id: sessionId,
            difficulty_level_id: 1,
            total_questions_planned: TOTAL_QUESTIONS,
            questions: [
              {
                id: `q-${sessionId}-1`,
                session_id: sessionId,
                operands: [1, 1],
                operations: ['+'],
                question_string: '1 + 1 = ?',
                correct_answer: 2,
                user_answer: 2,
                is_correct: true,
                time_spent: 5,
                answered_at: new Date().toISOString(),
              },
            ],
            current_question_index: TOTAL_QUESTIONS,
            score: TOTAL_QUESTIONS,
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
          },
        });
      });
    };

    /** Completes the single question and lands on result page */
    const completeOneQuestion = async (page: Page) => {
      await page.goto('/');
      await page.getByRole('button', { name: '开始学习' }).click();
      await page.getByRole('button', { name: '一年级' }).click();
      await page.getByRole('button', { name: '数学' }).click();
      await page.getByRole('button', { name: '练习题' }).click();
      await page.getByRole('button', { name: '10以内加减法' }).click();

      await expect(page.getByTestId('practice-page')).toBeVisible();

      await page.getByRole('button', { name: '2' }).click();
      await page.getByRole('button', { name: '确认' }).click();

      await page.waitForURL(/practice\/result/);
      await expect(page.getByTestId('result-page')).toBeVisible();
    };

    test.beforeEach(async ({ page }) => {
      mockSessionId = `res-nav-${Date.now()}`;
      await setupSingleQuestionMocks(page, mockSessionId);
    });

    test('Try Again button starts a new session for same grade & subject', async ({
      page,
    }) => {
      await completeOneQuestion(page);
      await page.getByTestId('try-again-button').click();
      await expect(page).toHaveURL(
        '/grades/1/subjects/mathematics/practice/session'
      );
      await expect(page.getByTestId('practice-page')).toBeVisible();
    });

    test('Difficulty button returns to difficulty selection', async ({
      page,
    }) => {
      await completeOneQuestion(page);
      await page.getByTestId('difficulty-button').click();
      await expect(page).toHaveURL(
        '/grades/1/subjects/mathematics/practice/difficulty'
      );
      await expect(
        page.getByRole('heading', { name: '选择练习难度' })
      ).toBeVisible();
    });

    test('Home button returns to welcome page', async ({ page }) => {
      await completeOneQuestion(page);
      await page.getByTestId('home-button').click();
      await expect(page).toHaveURL('/');
      await expect(page.getByRole('button', { name: '开始学习' })).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
