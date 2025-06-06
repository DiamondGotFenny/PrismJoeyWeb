import { test, expect, Page } from '@playwright/test';

test.describe('Practice Session Flow E2E Tests', () => {
  let mockSessionId: string;
  let mockQuestionIds: string[];
  let mockQuestions: Array<{
    id: string;
    session_id: string;
    operands: number[];
    operations: string[];
    question_string: string;
    correct_answer: number;
    difficulty_level_id: number;
    question_type: string;
    created_at: string;
  }>;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // Extended timeout for complete session flows

    // Initialize mock data
    mockSessionId = 'test-session-' + Date.now();
    mockQuestionIds = Array.from({ length: 10 }, (_, i) => `question-${i + 1}`);

    // Create 10 mock questions
    mockQuestions = mockQuestionIds.map((id, index) => ({
      id,
      session_id: mockSessionId,
      operands: [10 + index, 5 + index],
      operations: ['+'],
      question_string: `${10 + index} + ${5 + index}`,
      correct_answer: 15 + 2 * index,
      difficulty_level_id: 1,
      question_type: 'arithmetic',
      created_at: new Date().toISOString(),
    }));

    // Set up console logging for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Error] ${msg.text()}`);
      }
    });
  });

  const setupAPIRoutes = async (page: Page) => {
    // Mock difficulty levels API
    await page.route(
      'http://localhost:8000/api/v1/difficulty/levels',
      async (route) => {
        const mockDifficultyLevels = [
          {
            id: 1,
            name: '10以内加减法',
            code: 'BASIC_ADD_SUB',
            max_number: 10,
            allow_carry: false,
            allow_borrow: false,
            operation_types: ['+', '-'],
            order: 1,
          },
        ];
        await route.fulfill({ json: mockDifficultyLevels });
      }
    );

    // Mock practice session start
    await page.route(
      'http://localhost:8000/api/v1/practice/start',
      async (route) => {
        const request = route.request();
        const postData = request.postDataJSON();
        const mockSession = {
          id: mockSessionId,
          difficulty_level_id: postData.difficulty_level_id,
          total_questions_planned: postData.total_questions || 10,
          questions: [],
          current_question_index: 0,
          score: 0,
          start_time: new Date().toISOString(),
        };
        await route.fulfill({ json: mockSession });
      }
    );

    // Mock get next question API
    let questionIndex = 0;
    await page.route(
      new RegExp(
        `http://localhost:8000/api/v1/practice/question\\?session_id=${mockSessionId}`
      ),
      async (route) => {
        if (questionIndex < mockQuestions.length) {
          const question = mockQuestions[questionIndex];
          await route.fulfill({ json: question });
          questionIndex++;
        } else {
          await route.fulfill({
            status: 404,
            json: { error: 'No more questions' },
          });
        }
      }
    );

    // Mock submit answer API
    await page.route(
      'http://localhost:8000/api/v1/practice/answer',
      async (route) => {
        const request = route.request();
        const payload = request.postDataJSON();
        const question = mockQuestions.find(
          (q) => q.id === payload.question_id
        );

        if (!question) {
          await route.fulfill({
            status: 404,
            json: { error: 'Question not found' },
          });
          return;
        }

        const isCorrect = payload.user_answer === question.correct_answer;
        const response = {
          ...question,
          user_answer: payload.user_answer,
          is_correct: isCorrect,
          time_spent: payload.time_spent || 30,
          answered_at: new Date().toISOString(),
        };
        await route.fulfill({ json: response });
      }
    );

    // Mock session summary API
    await page.route(
      new RegExp(
        `http://localhost:8000/api/v1/practice/summary\\?session_id=${mockSessionId}`
      ),
      async (route) => {
        const mockSummary = {
          id: mockSessionId,
          difficulty_level_id: 1,
          total_questions_planned: 10,
          questions: mockQuestions.map((q, index) => ({
            ...q,
            user_answer: q.correct_answer, // Mock all correct for summary
            is_correct: true,
            time_spent: 25 + index * 2,
            answered_at: new Date().toISOString(),
          })),
          current_question_index: 10,
          score: 10,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        };
        await route.fulfill({ json: mockSummary });
      }
    );
  };

  const navigateToPractice = async (page: Page) => {
    await page.goto('/');
    await page.goto('/grade-selection');
    await page.goto('/subject-selection');
    await page.goto('/difficulty-selection');
    await page.waitForSelector('.difficulty-button');
    await page.click('.difficulty-button:first-of-type');
    await page.waitForURL('**/practice');
    await expect(page.getByTestId('practice-page')).toBeVisible();
    await expect(page.getByTestId('question-content')).toBeVisible();
  };

  test('should complete full practice session and navigate to result page', async ({
    page,
  }) => {
    await setupAPIRoutes(page);
    await navigateToPractice(page);

    for (let i = 0; i < 10; i++) {
      const questionContent = page.getByTestId('question-content');
      await expect(questionContent).toBeVisible();
      await expect(page.getByTestId('progress-indicator')).toHaveText(
        new RegExp(`题目: ${i + 1} / 10`)
      );

      const correctAnswer = mockQuestions[i].correct_answer;
      await page.locator('input[type="text"]').fill(correctAnswer.toString());

      // Use a robust selector for the submit button
      await page.click('button:has-text("提交"), button:has-text("确认")');

      if (i < 9) {
        await expect(page.getByTestId('next-question-button')).toBeVisible();
        await page.getByTestId('next-question-button').click();
      }
    }

    await page.waitForURL('**/result');
    await expect(page.getByTestId('result-page')).toBeVisible();
    await expect(page.getByTestId('score-section')).toBeVisible();
    await expect(page.getByText('练习完成！')).toBeVisible();
  });

  test('should handle API errors gracefully during session', async ({
    page,
  }) => {
    await setupAPIRoutes(page);

    let answerSubmissionCount = 0;
    // This route handler will override the one in setupAPIRoutes
    await page.route(
      'http://localhost:8000/api/v1/practice/answer',
      async (route) => {
        answerSubmissionCount++;
        if (answerSubmissionCount === 5) {
          // Simulate error on 5th submission
          await route.fulfill({
            status: 500,
            json: { error: 'Server error' },
          });
        } else {
          // Normal response for other questions
          const request = route.request();
          const payload = request.postDataJSON();
          const question = mockQuestions.find(
            (q) => q.id === payload.question_id
          );

          if (!question) {
            await route.fulfill({
              status: 404,
              json: { error: 'Question not found' },
            });
            return;
          }

          const isCorrect = payload.user_answer === question.correct_answer;
          await route.fulfill({
            json: {
              ...question,
              user_answer: payload.user_answer,
              is_correct: isCorrect,
              time_spent: 30,
              answered_at: new Date().toISOString(),
            },
          });
        }
      }
    );

    await navigateToPractice(page);

    // Complete first 4 questions normally
    for (let i = 0; i < 4; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      const textInput = page.locator('input[type="text"]');
      await textInput.fill(mockQuestions[i].correct_answer.toString());
      await page.click('button:has-text("提交")');
      await expect(page.getByTestId('next-question-button')).toBeVisible();
      await page.getByTestId('next-question-button').click();
    }

    // 5th question should trigger error
    await expect(page.getByTestId('question-content')).toBeVisible();
    const textInput = page.locator('input[type="text"]');
    await textInput.fill(mockQuestions[4].correct_answer.toString());
    await page.click('button:has-text("提交")');

    // The error from the store is shown in a general error display
    await expect(page.getByTestId('error-state')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId('error-state')).toContainText('提交答案失败');
  });

  test('should handle session summary API failure', async ({ page }) => {
    await setupAPIRoutes(page);

    // Override session summary to return error
    await page.route(
      new RegExp(
        `http://localhost:8000/api/v1/practice/summary\\?session_id=${mockSessionId}`
      ),
      async (route) => {
        await route.fulfill({
          status: 500,
          json: { error: 'Failed to generate summary' },
        });
      }
    );

    await navigateToPractice(page);

    // Complete all 10 questions
    for (let i = 0; i < 10; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await page
        .locator('input[type="text"]')
        .fill(mockQuestions[i].correct_answer.toString());
      await page.click('button:has-text("提交")');
      if (i < 9) {
        await expect(page.getByTestId('next-question-button')).toBeVisible();
        await page.getByTestId('next-question-button').click();
      }
    }

    // Should still navigate to result page even with summary error
    await page.waitForURL('**/result');

    // Should show error message on result page
    await expect(page.getByTestId('error-state')).toBeVisible();
    await expect(page.getByTestId('error-state')).toContainText(
      '加载结果时出错'
    );
  });

  test('should maintain session state across page refreshes', async ({
    page,
  }) => {
    await setupAPIRoutes(page);
    await navigateToPractice(page);

    // Complete first 3 questions
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await page
        .locator('input[type="text"]')
        .fill(mockQuestions[i].correct_answer.toString());
      await page.click('button:has-text("提交")');
      await expect(page.getByTestId('next-question-button')).toBeVisible();
      await page.getByTestId('next-question-button').click();
    }

    // At question 4
    await expect(page.getByTestId('progress-indicator')).toContainText(
      '题目: 4 / 10'
    );

    // Refresh the page
    await page.reload();
    await page.waitForURL('**/practice');

    // Should resume from question 4 (store should persist session)
    await expect(page.getByTestId('practice-page')).toBeVisible();
    await expect(page.getByTestId('question-content')).toBeVisible();

    // Verify question number or content indicates continuation
    await expect(page.getByTestId('progress-indicator')).toContainText(
      '题目: 4 / 10'
    );
  });

  test('should show progress indicator during session', async ({ page }) => {
    await setupAPIRoutes(page);
    await navigateToPractice(page);

    const progressIndicator = page.getByTestId('progress-indicator');
    await expect(progressIndicator).toContainText('题目: 1 / 10');

    // Complete a few questions and verify progress updates
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await expect(progressIndicator).toContainText(`题目: ${i + 1} / 10`);

      await page
        .locator('input[type="text"]')
        .fill(mockQuestions[i].correct_answer.toString());
      await page.click('button:has-text("提交")');
      await expect(page.getByTestId('next-question-button')).toBeVisible();
      await page.getByTestId('next-question-button').click();
    }

    await expect(progressIndicator).toContainText('题目: 4 / 10');
  });

  test('should handle direct navigation to practice page with URL parameters', async ({
    page,
  }) => {
    await setupAPIRoutes(page);

    const practiceUrl = `/practice?difficultyId=1&totalQuestions=10&difficultyName=Test&testMode=true`;
    await page.goto(practiceUrl);

    // Should work with URL parameters
    await expect(page.getByTestId('practice-page')).toBeVisible();

    // Complete one question to verify functionality
    await expect(page.getByTestId('question-content')).toBeVisible();
    const textInput = page.locator('input[type="text"]');
    await textInput.fill(mockQuestions[0].correct_answer.toString());
    await page.click('button:has-text("提交")');

    // Should show feedback and next question button
    await expect(page.getByTestId('next-question-button')).toBeVisible();
  });

  test('should handle result page navigation and content', async ({ page }) => {
    await setupAPIRoutes(page);
    await navigateToPractice(page);

    // Complete all questions
    for (let i = 0; i < 10; i++) {
      await expect(page.getByTestId('question-content')).toBeVisible();
      await page
        .locator('input[type="text"]')
        .fill(mockQuestions[i].correct_answer.toString());
      await page.click('button:has-text("提交")');
      if (i < 9) {
        await expect(page.getByTestId('next-question-button')).toBeVisible();
        await page.getByTestId('next-question-button').click();
      }
    }

    // Wait for result page
    await page.waitForURL('**/result');

    // Verify result page elements
    await expect(page.getByTestId('result-page')).toBeVisible();
    await expect(page.getByTestId('score-section')).toBeVisible();
    await expect(page.getByTestId('question-review-section')).toBeVisible();
    await expect(page.getByTestId('action-buttons')).toBeVisible();

    // Test navigation buttons
    const tryAgainButton = page.getByTestId('try-again-button');
    const homeButton = page.getByTestId('home-button');

    await expect(tryAgainButton).toBeVisible();
    await expect(homeButton).toBeVisible();

    // Test clicking "Try Again" button
    await tryAgainButton.click();
    await page.waitForURL('**/grade-selection');
  });
});
