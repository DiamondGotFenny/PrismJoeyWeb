import { Page } from '@playwright/test';

export interface MockDifficulty {
  id: number;
  name: string;
  code: string;
  max_number: number;
  allow_carry: boolean;
  allow_borrow: boolean;
  operation_types: string[];
  order: number;
}

export interface NavigationMockSetup {
  difficulty: MockDifficulty;
  totalQuestions: number;
  sessionId?: string;
}

/**
 * Sets up proper navigation store mocking for tests.
 * This replaces the old URL parameter approach with proper store mocking.
 */
export async function setupNavigationStoreMocking(
  page: Page,
  setup: NavigationMockSetup
): Promise<void> {
  // Inject navigation store state directly into the page
  await page.addInitScript((mockSetup: NavigationMockSetup) => {
    // Store the mock data in a global variable that the stores can access
    (window as unknown as Record<string, unknown>).__TEST_NAVIGATION_MOCK__ =
      mockSetup;

    // Override console.log to help with debugging
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      if (args[0]?.toString().includes('[TEST_MOCK]')) {
        originalLog(...args);
      } else {
        originalLog(...args);
      }
    };

    console.log('[TEST_MOCK] Navigation store mock setup completed', mockSetup);
  }, setup);
}

/**
 * Creates a mock API response helper for practice sessions
 */
export function createMockApiHelper(sessionId: string) {
  const sessionQuestionMap = new Map<string, number>();
  const sessionQuestionsUsed = new Map<string, Set<string>>();

  return {
    setupBasicAPIRoutes: async (page: Page) => {
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
        sessionQuestionMap.set(sessionId, 0);
        sessionQuestionsUsed.set(sessionId, new Set());

        await route.fulfill({
          json: {
            id: sessionId,
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

      // Mock get question
      await page.route('**/api/v1/practice/question*', async (route) => {
        const url = new URL(route.request().url());
        const urlSessionId = url.searchParams.get('session_id');
        const currentSessionId = urlSessionId || sessionId;

        let questionCount = sessionQuestionMap.get(currentSessionId) || 0;
        const usedQuestions =
          sessionQuestionsUsed.get(currentSessionId) || new Set();

        if (usedQuestions.size >= 10) {
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
        const currentSessionId = payload.session_id || sessionId;

        await route.fulfill({
          json: {
            id: payload.question_id,
            session_id: currentSessionId,
            user_answer: payload.user_answer,
            is_correct: true,
            correct_answer: payload.user_answer,
            time_spent: 30,
            answered_at: new Date().toISOString(),
          },
        });
      });

      // Mock summary
      await page.route('**/api/v1/practice/summary*', async (route) => {
        const url = new URL(route.request().url());
        const summarySessionId =
          url.searchParams.get('session_id') || sessionId;
        const usedQuestions =
          sessionQuestionsUsed.get(summarySessionId) || new Set();
        const questionsCount = Math.min(usedQuestions.size, 10);

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
    },
  };
}

/**
 * Navigates to practice session page using proper navigation flow
 * instead of direct URL navigation with test parameters
 */
export async function navigateToPracticeSessionViaFlow(
  page: Page,
  difficulty: MockDifficulty,
  totalQuestions: number = 10
): Promise<void> {
  // Setup navigation store mock first
  await setupNavigationStoreMocking(page, { difficulty, totalQuestions });

  // Navigate through the proper flow
  await page.goto('/');
  await page.getByRole('button', { name: '开始学习' }).click();
  await page.getByRole('button', { name: '一年级' }).click();
  await page.getByRole('button', { name: '数学' }).click();
  await page.getByRole('button', { name: '练习题' }).click();

  // Click on the difficulty button
  await page.getByRole('button', { name: difficulty.name }).click();
}

/**
 * Default mock difficulty for tests
 */
export const DEFAULT_MOCK_DIFFICULTY: MockDifficulty = {
  id: 1,
  name: '10以内加减法',
  code: 'within_10',
  max_number: 10,
  allow_carry: false,
  allow_borrow: false,
  operation_types: ['addition', 'subtraction'],
  order: 1,
};
