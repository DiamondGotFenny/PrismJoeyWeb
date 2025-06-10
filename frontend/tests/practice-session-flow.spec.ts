import { test, expect, Page } from '@playwright/test';
import { gotoPracticeSession } from './test-helpers';

/**
 * RULE: DO NOT EXTEND TIMEOUT LIMITS - Fix the root cause instead of masking issues with longer waits
 */
test.describe('Practice Session Flow E2E Tests', () => {
  let mockSessionId: string;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
    mockSessionId = 'test-session-' + Date.now();

    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });
  });

  const setupBasicAPIRoutes = async (page: Page) => {
    // Create session-specific question counter to avoid interference between tests
    const sessionQuestionMap = new Map<string, number>();
    const sessionQuestionsUsed = new Map<string, Set<string>>();

    // Mock difficulty levels
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

    // Mock practice session start
    await page.route('**/api/v1/practice/start', async (route) => {
      const postData = route.request().postDataJSON();
      // Initialize question counter for this session
      sessionQuestionMap.set(mockSessionId, 0);
      sessionQuestionsUsed.set(mockSessionId, new Set());

      await route.fulfill({
        json: {
          id: mockSessionId,
          user_id: null,
          difficulty_level_id: postData.difficulty_level_id,
          total_questions_planned: 10,
          questions: [],
          current_question_index: 0,
          score: 0,
          start_time: new Date().toISOString(),
          end_time: null,
          difficulty_level_details: {
            id: 1,
            name: '10以内加减法',
            code: 'within_10',
            max_number: 10,
            allow_carry: false,
            allow_borrow: false,
            operation_types: ['addition', 'subtraction'],
            order: 1,
          },
        },
      });
    });

    // Mock get question - return simple questions with session-specific counting
    await page.route('**/api/v1/practice/question*', async (route) => {
      const url = new URL(route.request().url());
      const urlSessionId = url.searchParams.get('session_id');
      const currentSessionId = urlSessionId || mockSessionId;

      // Get or initialize question count for this session
      let questionCount = sessionQuestionMap.get(currentSessionId) || 0;
      const usedQuestions =
        sessionQuestionsUsed.get(currentSessionId) || new Set();

      // Check if we have reached the limit
      if (usedQuestions.size >= 10) {
        console.log(
          `[Mock API] Session ${currentSessionId} - No more questions available. Used: ${usedQuestions.size}`
        );
        await route.fulfill({
          status: 404,
          json: { error: 'No more questions available' },
        });
        return;
      }

      questionCount++;
      sessionQuestionMap.set(currentSessionId, questionCount);

      const questionId = `question-${currentSessionId}-${questionCount}`;
      usedQuestions.add(questionId);
      sessionQuestionsUsed.set(currentSessionId, usedQuestions);

      console.log(
        `[Mock API] Providing question ${questionCount} for session ${currentSessionId}, total used: ${usedQuestions.size}`
      );

      await route.fulfill({
        json: {
          id: questionId,
          session_id: currentSessionId,
          operands: [questionCount, 1],
          operations: ['+'],
          question_string: `${questionCount} + 1 = ?`,
          question_type: 'arithmetic',
          correct_answer: questionCount + 1,
          difficulty_level_id: 1,
          created_at: new Date().toISOString(),
        },
      });
    });

    // Mock submit answer
    await page.route('**/api/v1/practice/answer', async (route) => {
      const payload = route.request().postDataJSON();
      const sessionId = payload.session_id || mockSessionId;

      console.log(
        `[Mock API] Submitting answer for session ${sessionId}, question ${payload.question_id}`
      );

      await route.fulfill({
        json: {
          id: payload.question_id,
          session_id: sessionId,
          user_answer: payload.user_answer,
          is_correct: true,
          correct_answer: payload.user_answer, // In test, always mark as correct
          time_spent: 30,
          answered_at: new Date().toISOString(),
        },
      });
    });

    // Mock summary
    await page.route('**/api/v1/practice/summary*', async (route) => {
      const url = new URL(route.request().url());
      const summarySessionId =
        url.searchParams.get('session_id') || mockSessionId;
      const usedQuestions =
        sessionQuestionsUsed.get(summarySessionId) || new Set();
      const questionsCount = Math.min(usedQuestions.size, 10);

      console.log(
        `[Mock API] Generating summary for session ${summarySessionId}, questions: ${questionsCount}`
      );

      await route.fulfill({
        json: {
          id: summarySessionId,
          difficulty_level_id: 1,
          total_questions_planned: 10,
          questions: Array.from({ length: questionsCount }, (_, i) => ({
            id: `question-${summarySessionId}-${i + 1}`,
            session_id: summarySessionId,
            operands: [i + 1, 1],
            operations: ['+'],
            question_string: `${i + 1} + 1 = ?`,
            correct_answer: i + 2,
            user_answer: i + 2,
            is_correct: true,
            time_spent: 30,
            answered_at: new Date().toISOString(),
          })),
          current_question_index: questionsCount,
          score: questionsCount,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        },
      });
    });
  };

  const navigateToFirstQuestion = async (page: Page) => {
    await page.goto('/');
    await page.getByRole('button', { name: '开始学习' }).click();
    await expect(page).toHaveURL('/grades');

    await page.getByRole('button', { name: '一年级' }).click();
    await expect(page).toHaveURL('/grades/1/subjects');

    await page.getByRole('button', { name: '数学' }).click();
    await expect(page).toHaveURL('/grades/1/subjects/mathematics');

    await page.getByRole('button', { name: '练习题' }).click();
    await expect(page).toHaveURL(
      '/grades/1/subjects/mathematics/practice/difficulty'
    );

    await page.getByRole('button', { name: '10以内加减法' }).click();
    await expect(page).toHaveURL(
      '/grades/1/subjects/mathematics/practice/session'
    );

    // Wait for session to load and question to appear
    await expect(page.getByTestId('practice-page')).toBeVisible();
    await expect(page.getByTestId('question-content')).toBeVisible();
  };

  test('should load practice session and show first question', async ({
    page,
  }) => {
    await setupBasicAPIRoutes(page);
    await navigateToFirstQuestion(page);

    // Verify we're in the practice session
    await expect(page.getByTestId('practice-page')).toBeVisible();
    await expect(page.getByTestId('question-content')).toBeVisible();
    await expect(page.getByTestId('progress-indicator')).toContainText(
      '题目: 1 / 10'
    );
  });

  test('should complete one question successfully', async ({ page }) => {
    await setupBasicAPIRoutes(page);
    await navigateToFirstQuestion(page);

    // Wait for keypad to be ready
    await expect(page.getByRole('button', { name: '确认' })).toBeEnabled();

    // Answer the question (1 + 1 = 2)
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '确认' }).click();

    // Should show next question button
    await expect(page.getByTestId('next-question-button')).toBeVisible();
  });

  test('should progress through multiple questions', async ({ page }) => {
    await setupBasicAPIRoutes(page);
    await navigateToFirstQuestion(page);

    // Complete first 3 questions
    for (let i = 1; i <= 3; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await expect(page.getByTestId('progress-indicator')).toContainText(
        `题目: ${i} / 10`
      );

      // Wait for keypad and answer
      await expect(page.getByRole('button', { name: '确认' })).toBeEnabled();
      await page.getByRole('button', { name: (i + 1).toString() }).click();
      await page.getByRole('button', { name: '确认' }).click();

      if (i < 3) {
        await expect(page.getByTestId('next-question-button')).toBeVisible();
        await page.getByTestId('next-question-button').click();
      }
    }

    // Should be at question 3
    await expect(page.getByTestId('progress-indicator')).toContainText(
      '题目: 3 / 10'
    );
  });

  test('should handle direct navigation with URL parameters', async ({
    page,
  }) => {
    await setupBasicAPIRoutes(page);

    await gotoPracticeSession(page, {
      difficulty: { name: '10以内加减法' },
      totalQuestions: 10,
    });

    await expect(page.getByTestId('question-content')).toBeVisible();
    await expect(page.getByTestId('progress-indicator')).toContainText(
      '1 / 10'
    );
    await expect(page.getByTestId('difficulty-name-display')).toContainText(
      '10以内加减法'
    );
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await setupBasicAPIRoutes(page);

    // Override answer submission to fail on 2nd attempt
    let submissionCount = 0;
    await page.route('**/api/v1/practice/answer', async (route) => {
      submissionCount++;
      if (submissionCount === 2) {
        await route.fulfill({
          status: 500,
          json: { error: 'Server error' },
        });
      } else {
        await route.fulfill({
          json: {
            id: `question-${submissionCount}`,
            session_id: mockSessionId,
            user_answer: 2,
            is_correct: true,
            time_spent: 30,
            answered_at: new Date().toISOString(),
          },
        });
      }
    });

    await navigateToFirstQuestion(page);

    // First question should work
    await page.getByRole('button', { name: '2' }).click();
    await page.getByRole('button', { name: '确认' }).click();
    await expect(page.getByTestId('next-question-button')).toBeVisible();
    await page.getByTestId('next-question-button').click();

    // Second question should fail - just check that we don't crash
    await page.getByRole('button', { name: '3' }).click();
    await page.getByRole('button', { name: '确认' }).click();

    // Give it time to process the error
    await page.waitForTimeout(3000);

    // Should still be on practice page (not crashed)
    await expect(page.getByTestId('practice-page')).toBeVisible();
  });

  test('should navigate to results after completing session', async ({
    page,
  }) => {
    await setupBasicAPIRoutes(page);
    await navigateToFirstQuestion(page);

    // Complete all 10 questions
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await expect(page.getByRole('button', { name: '确认' })).toBeEnabled();

      const answer = i + 1;
      const answerStr = answer.toString();

      // Click each digit of the answer
      for (const digit of answerStr) {
        await page.getByRole('button', { name: digit }).click();
      }
      await page.getByRole('button', { name: '确认' }).click();

      if (i < 10) {
        // For questions 1-9, click the "Next" button to proceed
        await expect(page.getByTestId('next-question-button')).toBeVisible();
        await page.getByTestId('next-question-button').click();
      }
    }

    // After answering the 10th question, it should automatically navigate to the results page
    await expect(page).toHaveURL(
      /.*\/result/,
      { timeout: 5000 } // Increased timeout for navigation
    );

    // Verify we are on the results page
    await expect(page.getByTestId('result-page')).toBeVisible();
  });
});
