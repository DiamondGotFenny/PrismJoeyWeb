import { Page, expect } from '@playwright/test';
import type { DifficultyLevel } from '../src/services/api';

/**
 * Mocks the navigation state and navigates directly to the practice session page.
 * This is the correct way to test the ExerciseSessionPage without relying on
 * test-specific code within the component itself.
 *
 * @param page The Playwright Page object.
 * @param options The mock data to inject into the navigation store.
 */
export async function gotoPracticeSession(
  page: Page,
  options: {
    difficulty: Partial<DifficultyLevel>;
    totalQuestions: number;
  }
) {
  const mockDifficulty: DifficultyLevel = {
    id: 1,
    name: 'Mock Difficulty',
    code: 'MOCK_DIFFICULTY',
    max_number: 100,
    allow_carry: true,
    allow_borrow: true,
    operation_types: ['addition', 'subtraction'],
    order: 1,
    ...options.difficulty,
  };

  const mockState = {
    state: {
      currentStep: 'practice' as const,
      flow: {
        grade: '1',
        subject: 'mathematics',
        mathOption: 'practice',
        difficulty: mockDifficulty,
        totalQuestions: options.totalQuestions,
      },
      history: [],
      canProceed: true,
      hasValidFlow: true,
      pendingNavigation: null,
      sessionStarted: true,
      sessionId: `mock-session-${Date.now()}`,
    },
    version: 0,
  };

  await page.addInitScript((stateToPersist) => {
    localStorage.setItem('navigation-store', JSON.stringify(stateToPersist));
    console.log('[TestHelper] Mock state set in localStorage:', stateToPersist);
  }, mockState);

  // Navigate to the root first to ensure the localStorage is set for the domain.
  console.log('[TestHelper] Navigating to root: /');
  await page.goto('/');
  console.log('[TestHelper] Navigation to root complete.');

  // Now, navigate to the actual page.
  // The grade and subject in the URL are now less important as the store is mocked,
  // but they should still be valid to match the routing structure.
  console.log(
    '[TestHelper] Navigating to practice session: /grades/1/subjects/mathematics/practice/session'
  );
  await page.goto('/grades/1/subjects/mathematics/practice/session');
  console.log('[TestHelper] Navigation to practice session complete.');

  // Add a verification step within the helper to ensure the page loaded correctly
  console.log('[TestHelper] Waiting for practice page to be visible...');
  await expect(page.getByTestId('practice-page')).toBeVisible({
    timeout: 15000,
  });
  console.log('[TestHelper] Successfully navigated to practice session page.');
}
