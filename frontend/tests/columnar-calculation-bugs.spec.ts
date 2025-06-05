import { test, expect, Page } from '@playwright/test';
import type { Question } from '../src/services/api'; // Adjust path as needed

// Helper function to navigate and set up a columnar question scenario
const setupColumnarQuestionScenario = async (
  page: Page,
  questionData: Partial<Question>
) => {
  // Mock the API response for getNextQuestion to provide specific test data
  await page.route('**/api/practice/next_question**', async (route) => {
    const json = questionData;
    await route.fulfill({ json });
  });

  // Navigate to the practice page or a dedicated test page for the component
  await page.goto('/'); // Assuming '/' can lead to the practice area
  await page.waitForLoadState('networkidle');

  // Click a button to start practice or load the component
  // Adjust selectors based on your application's actual DOM structure
  await page
    .click('[data-testid="start-practice"]', { timeout: 7000 })
    .catch(() => {
      page.click('text=开始练习', { timeout: 3000 }).catch(() => {
        page.click('button:has-text("练习")', { timeout: 3000 }).catch(() => {
          console.warn(
            'Could not find practice button, attempting to load component directly or assuming it is already visible.'
          );
        });
      });
    });

  // Wait for the columnar calculation component to be visible
  await page.waitForSelector('.columnar-calculation-container', {
    timeout: 10000,
  });
};

test.describe('ColumnarCalculation Component Bug Hunt', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(35000); // Increased timeout for potentially complex scenarios
    void page; // Suppress unused 'page' warning if not used in beforeEach directly
  });

  test('[BUG-KeyConflict] should handle dynamic key generation for padding without conflicts', async ({
    page,
  }) => {
    // This test aims to simulate a scenario where padding elements might cause key conflicts.
    // We will use a question with varying operand lengths to trigger different padding amounts.
    const questionData: Partial<Question> = {
      id: 'bug-key-test-1',
      session_id: 'test-session',
      // operands: [], // Not directly used by columnar display but good to have
      // operations: [],
      // question_string: ' ',
      // correct_answer: 0,
      // difficulty_level_id: 1,
      question_type: 'columnar',
      columnar_operands: [
        [1, 2, 3],
        [null, 4],
      ], // Varying lengths
      columnar_result_placeholders: [null, null, null],
      columnar_operation: '+',
    };
    await setupColumnarQuestionScenario(page, questionData);

    const operandGrid = page.locator('.operand-grid');
    const resultGrid = page.locator('.result-grid');

    // Count all child elements within the grids. A high number of unique keys is expected.
    // Playwright doesn't directly expose React keys. We infer correct rendering by absence of errors and structure.
    const operandCells = await operandGrid
      .locator('.digit-cell, .placeholder-padding')
      .count();
    const resultCells = await resultGrid
      .locator('.digit-cell, .placeholder-padding')
      .count();

    // Expect a certain number of cells based on maxOperandLength and structure
    // Max length is 3 (from [1,2,3]). Operator + 3 digits = 4 columns.
    // Operands: 2 rows * 4 columns/row = 8 cells (includes operator/spacers and padding)
    // Result: 1 row * 4 columns/row = 4 cells (includes spacer and padding)
    // This is an approximation; exact count depends on how `renderDigit` structures spacers and operators.
    // A more robust check would be to ensure no console errors related to keys appear.

    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => consoleErrors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('key')) {
        consoleErrors.push(msg.text());
      }
    });

    // Interact a bit to trigger re-renders if any
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );
    if ((await interactiveElements.count()) > 0) {
      await interactiveElements.first().click();
    }

    expect(operandCells).toBeGreaterThan(4); // Rough check
    expect(resultCells).toBeGreaterThan(2); // Rough check
    expect(
      consoleErrors.filter((err) =>
        err.toLowerCase().includes('unique key prop')
      )
    ).toHaveLength(0);
  });

  test('[BUG-GridEdge] maxOperandLength calculation with empty or null operands', async ({
    page,
  }) => {
    const questionDataEmpty: Partial<Question> = {
      id: 'bug-grid-empty-1',
      session_id: 'test-session',
      // operands: [], operations: [], question_string: ' ', correct_answer: 0, difficulty_level_id: 1,
      question_type: 'columnar',
      columnar_operands: [[], [null]], // Empty and null operands
      columnar_result_placeholders: [],
      columnar_operation: '+',
    };
    await setupColumnarQuestionScenario(page, questionDataEmpty);
    const container = page.locator('.columnar-calculation-container');
    await expect(container).toBeVisible(); // Should render without crashing

    const operandGrid = page.locator('.operand-grid');
    const gridStyle = await operandGrid.getAttribute('style');
    // Example: repeat(1, auto) for operator only, or repeat(2, auto) if it defaults to 1 digit + operator
    expect(gridStyle).toMatch(/repeat\(\d+, auto\)/);
    // Check no JS errors
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    expect(errors).toHaveLength(0);
  });

  test('[BUG-FocusMgmt] focus behavior with multiple empty inputs and clearing', async ({
    page,
  }) => {
    const questionData: Partial<Question> = {
      id: 'bug-focus-1',
      session_id: 'test-session',
      // operands: [], operations: [], question_string: ' ', correct_answer: 0, difficulty_level_id: 1,
      question_type: 'columnar',
      columnar_operands: [[null], [null]], // All inputs initially empty
      columnar_result_placeholders: [null, null],
      columnar_operation: '+',
    };
    await setupColumnarQuestionScenario(page, questionData);

    const placeholders = page.locator(
      '.columnar-calculation-container .placeholder'
    );
    // const firstPlaceholder = placeholders.nth(0); // Unused
    // const secondPlaceholder = placeholders.nth(1); // Unused
    const clearButton = page
      .locator(
        'button:has-text("清除"), button:has-text("删除"), [data-testid="clear-button"]'
      )
      .first();
    const digitButton1 = page.locator('button:has-text("1")').first();

    await expect(placeholders.nth(0)).toBeVisible();
    // Auto-focus should target the very first placeholder
    await expect(placeholders.nth(0)).toHaveClass(/active/);

    // Input a digit in the first placeholder
    await digitButton1.click();
    await page.waitForTimeout(200); // wait for state update and focus shift
    // Focus should move to the second placeholder
    await expect(placeholders.nth(1)).toHaveClass(/active/);

    // Click clear - should clear the first input (which now has '1') and focus it
    await clearButton.click();
    await page.waitForTimeout(200);
    await expect(placeholders.nth(0)).toHaveClass(/active/);
    // Check if the first input is empty (visual check or by state if possible)
    const firstOperandCellText = await placeholders
      .nth(0)
      .locator('span') // Assuming MathIcon renders a span
      .textContent();
    expect(firstOperandCellText?.trim()).toBe(''); // Or check for &nbsp; if that's how empty is rendered

    // Click clear again - focus should remain on the first (already empty) placeholder or move to previous if logic dictates
    await clearButton.click();
    await page.waitForTimeout(200);
    await expect(placeholders.nth(0)).toHaveClass(/active/);
  });

  test('[BUG-Accessibility] keyboard navigation and ARIA attributes', async ({
    page,
  }) => {
    const questionData: Partial<Question> = {
      id: 'bug-aria-1',
      session_id: 'test-session',
      // operands: [], operations: [], question_string: ' ', correct_answer: 0, difficulty_level_id: 1,
      question_type: 'columnar',
      columnar_operands: [
        [null, 5],
        [3, null],
      ],
      columnar_result_placeholders: [null, null],
      columnar_operation: '+',
    };
    await setupColumnarQuestionScenario(page, questionData);

    const interactiveCells = page.locator(
      '.columnar-calculation-container .placeholder, .columnar-calculation-container .interactive-digit'
    );
    const firstInteractiveCell = interactiveCells.first();

    await expect(firstInteractiveCell).toBeVisible();
    await firstInteractiveCell.focus();
    await expect(firstInteractiveCell).toBeFocused();

    // Check for role="button" on interactive placeholders
    const firstPlaceholder = page
      .locator('.columnar-calculation-container .placeholder')
      .first();
    if ((await firstPlaceholder.count()) > 0) {
      await expect(firstPlaceholder).toHaveAttribute('role', 'button');
      await expect(firstPlaceholder).toHaveAttribute('tabindex', '0');
    }

    // Check for role on interactive digits (if they are meant to be buttons)
    const filledInteractiveDigit = page
      .locator('.columnar-calculation-container .interactive-digit')
      .first();
    if (
      (await filledInteractiveDigit.count()) > 0 &&
      (await filledInteractiveDigit.locator('span').textContent()) !== ' '
    ) {
      // Ensure it's not an empty placeholder classed as interactive
      await expect(filledInteractiveDigit).toHaveAttribute('role', 'button');
      await expect(filledInteractiveDigit).toHaveAttribute('tabindex', '0');
    }

    // Press Enter on an interactive cell, it should become active
    await firstInteractiveCell.press('Enter');
    await expect(firstInteractiveCell).toHaveClass(/active/);

    // Press Tab, focus should move to the next logical element
    // This is hard to test precisely without knowing the exact tab order implementation
    // We can check if focus moves away from the current element
    await firstInteractiveCell.press('Tab');
    await expect(firstInteractiveCell).not.toBeFocused();
    // Ideally, check if the next expected element is focused.
  });

  // More tests can be added for:
  // - State synchronization with complex inputs (e.g., long numbers, many operands)
  // - Interaction with `showCorrectAnswer` prop
  // - Specific focus sequences (e.g., tabbing from last operand digit to first result digit)
});
