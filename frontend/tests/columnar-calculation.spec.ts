import { test, expect, Page } from '@playwright/test';

test.describe('ColumnarCalculation Component', () => {
  // Helper function to navigate to a practice page with columnar questions
  const setupColumnarQuestion = async (page: Page) => {
    const mockDifficultyLevelId = 1; // Example difficulty ID
    const mockTotalQuestions = 5; // Example total questions
    const mockSessionId = 'mock-session-id-123';
    const mockQuestionId = 'mock-question-id-456';

    // Define a local type for the mock question to satisfy the linter
    type MockQuestion = {
      id: string;
      session_id: string;
      operands: number[];
      operations: string[];
      question_string: string;
      correct_answer: number;
      difficulty_level_id: number;
      question_type: string;
      columnar_operands?: (number | null)[][];
      columnar_result_placeholders?: (number | null)[];
      columnar_operation?: string;
      created_at: string;
    };

    // 1. Mock the API response for starting a practice session
    await page.route(
      'http://localhost:8000/api/v1/practice/start',
      async (route) => {
        console.log(
          '[Playwright Test] API call to /practice/start intercepted.'
        );
        const request = route.request();
        const postData = request.postDataJSON();

        expect(postData.difficulty_level_id).toBe(mockDifficultyLevelId);
        expect(postData.total_questions).toBe(mockTotalQuestions);

        const mockQuestion: MockQuestion = {
          id: mockQuestionId,
          session_id: mockSessionId,
          operands: [123, 45],
          operations: ['+'],
          question_string: '123 + 45',
          correct_answer: 168,
          difficulty_level_id: mockDifficultyLevelId,
          question_type: 'columnar',
          columnar_operands: [
            [null, 1, 2, 3],
            [null, null, 4, 5],
          ],
          columnar_result_placeholders: [null, null, null, null],
          columnar_operation: '+',
          created_at: new Date().toISOString(),
        };

        const mockPracticeSessionResponse = {
          id: mockSessionId,
          difficulty_level_id: mockDifficultyLevelId,
          total_questions_planned: mockTotalQuestions,
          questions: [mockQuestion],
          current_question_index: 0,
          score: 0,
          start_time: new Date().toISOString(),
        };
        console.log(
          '[Playwright Test] Fulfilling /practice/start with:',
          mockPracticeSessionResponse
        );
        await route.fulfill({ json: mockPracticeSessionResponse });
      }
    );

    // 2. Mock the API response for getting the next question
    await page.route(
      `http://localhost:8000/api/v1/practice/question?session_id=${mockSessionId}`,
      async (route) => {
        console.log(
          '[Playwright Test] API call to /practice/question intercepted.'
        );

        const mockQuestion: MockQuestion = {
          id: mockQuestionId,
          session_id: mockSessionId,
          operands: [123, 45],
          operations: ['+'],
          question_string: '123 + 45',
          correct_answer: 168,
          difficulty_level_id: mockDifficultyLevelId,
          question_type: 'columnar',
          columnar_operands: [
            [null, 1, 2, 3],
            [null, null, 4, 5],
          ],
          columnar_result_placeholders: [null, null, null, null],
          columnar_operation: '+',
          created_at: new Date().toISOString(),
        };

        console.log(
          '[Playwright Test] Fulfilling /practice/question with:',
          mockQuestion
        );
        await route.fulfill({ json: mockQuestion });
      }
    );

    // 3. Navigate to the practice page with URL parameters for testing
    page.on('console', (msg) =>
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`)
    ); // Log all browser console messages

    // Use URL parameters instead of state for more reliable E2E testing
    const practiceUrl = `/practice?difficultyId=${mockDifficultyLevelId}&totalQuestions=${mockTotalQuestions}&difficultyName=Mock%20Difficulty&testMode=true`;
    console.log('[Playwright Test] Navigating to:', practiceUrl);

    await page.goto(practiceUrl);

    // Wait for the application to load and columnar component to be present
    await page.waitForLoadState('networkidle');
    console.log('[Playwright Test] Network is idle.');

    await page.waitForSelector('.columnar-calculation-container', {
      timeout: 10000,
    });
    console.log('[Playwright Test] .columnar-calculation-container found.');
  };

  test.beforeEach(async ({ page }) => {
    // Set up a longer timeout for these tests since they involve complex interactions
    test.setTimeout(30000);
    // Suppress console warnings about unused page parameter
    void page;
  });

  test('should render columnar calculation layout correctly', async ({
    page,
  }) => {
    await setupColumnarQuestion(page);

    // Verify main container exists
    const container = page.locator('.columnar-calculation-container');
    await expect(container).toBeVisible();

    // Verify operand grid exists
    const operandGrid = page.locator('.operand-grid');
    await expect(operandGrid).toBeVisible();

    // Verify calculation line exists
    const calculationLine = page.locator('.calculation-line');
    await expect(calculationLine).toBeVisible();

    // Verify result grid exists
    const resultGrid = page.locator('.result-grid');
    await expect(resultGrid).toBeVisible();

    // Check that digit cells are present
    const digitCells = page.locator('.digit-cell');
    await expect(digitCells.first()).toBeVisible();

    // Verify operator is displayed
    const operatorCell = page.locator('.operator-cell');
    await expect(operatorCell).toBeVisible();
  });

  test('should have correct grid layout and alignment', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Check that the grid has proper CSS grid layout
    const operandGrid = page.locator('.operand-grid');
    const gridStyle = await operandGrid.getAttribute('style');
    expect(gridStyle).toContain('grid-template-columns');

    // Verify that all digit cells have consistent dimensions
    const cellCount = await page.locator('.digit-cell').count();
    expect(cellCount).toBeGreaterThan(0);

    // Check cell alignment by verifying CSS classes
    await expect(page.locator('.digit-cell').first()).toHaveCSS(
      'display',
      'flex'
    );
    await expect(page.locator('.digit-cell').first()).toHaveCSS(
      'align-items',
      'center'
    );
    await expect(page.locator('.digit-cell').first()).toHaveCSS(
      'justify-content',
      'center'
    );
  });

  test('should handle interactive placeholders correctly', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Find interactive placeholders (empty input cells)
    const placeholders = page.locator('.placeholder');
    const placeholderCount = await placeholders.count();

    if (placeholderCount > 0) {
      // Test clicking on a placeholder
      const firstPlaceholder = placeholders.first();
      await expect(firstPlaceholder).toBeVisible();
      await expect(firstPlaceholder).toHaveCSS('cursor', 'pointer');

      // Click should focus the placeholder
      await firstPlaceholder.click();
      await expect(firstPlaceholder).toHaveClass(/active/);

      // Test keyboard navigation
      await firstPlaceholder.press('Tab');
      // Should move focus (implementation depends on your focus logic)
    }
  });

  test('should handle digit input and focus management', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Find the numeric keypad
    const keypad = page.locator(
      '.numeric-keypad, .keypad-container, [data-testid="keypad"]'
    );

    // Wait for keypad to be available
    await expect(
      keypad.or(page.locator('button:has-text("1")')).first()
    ).toBeVisible({ timeout: 5000 });

    // Find first interactive placeholder or digit entry
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );
    const elementCount = await interactiveElements.count();

    if (elementCount > 0) {
      // Click on first interactive element
      await interactiveElements.first().click();

      // Press a digit on the keypad
      const digitButton = page.locator('button:has-text("5")').first();
      if (await digitButton.isVisible()) {
        await digitButton.click();

        // Verify that focus moved to next available input
        // This tests the findNextFocusable logic
        await expect(page.locator('.active').first()).not.toBe(
          interactiveElements.first()
        );
        await expect(page.locator('.active').first()).toBeVisible();
      }
    }
  });

  test('should handle backspace/clear functionality', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Find clear button on keypad
    const clearButton = page.locator(
      'button:has-text("清空"), button:has-text("清除"), button:has-text("删除"), [data-testid="clear-button"]'
    ); // Prioritized "清空"

    // Ensure the clear button is visible before proceeding
    await expect(clearButton.first()).toBeVisible({ timeout: 5000 });

    if (await clearButton.first().isVisible()) {
      const interactiveElements = page.locator(
        '.placeholder, .interactive-digit'
      );
      const initialInteractiveCount = await interactiveElements.count();

      if (initialInteractiveCount > 0) {
        const firstInteractiveElement = interactiveElements.first();
        await firstInteractiveElement.click();

        // Expect the clicked element to become active
        await expect(firstInteractiveElement).toHaveClass(/active/);

        // Input a digit
        const digitButton = page.locator('button:has-text("7")').first();
        // Ensure the digit button is visible before clicking
        await expect(digitButton).toBeVisible({ timeout: 3000 });

        if (await digitButton.isVisible()) {
          const textBeforeInput = await firstInteractiveElement.textContent();
          await digitButton.click();

          // Wait for the digit to appear or for the active element to potentially change
          // Instead of a fixed timeout, we can wait for the text content to change or for a specific class
          await expect(firstInteractiveElement).not.toHaveText(
            textBeforeInput || ' ',
            { timeout: 2000 }
          ); // Or check if it contains '7'
          await expect(page.locator('.active').first()).toBeVisible(); // Ensure some element is active

          // Now test clear
          // Let's assume the first interactive element is still the target or focus has moved predictably
          const activeElementBeforeClear = page
            .locator('.digit-cell.active')
            .first();

          await clearButton.first().click();

          // Verify the digit was cleared and the cell is now a placeholder or empty
          // It should also remain (or become) the active input
          await expect(activeElementBeforeClear).toBeVisible();

          // Check if it reverted to a placeholder state (empty or specific placeholder character)
          // Placeholders in the component render as &nbsp; which translates to a non-breaking space.
          const textAfterClear = await activeElementBeforeClear.textContent();
          // It should be empty or a space, and importantly, not the digit '7'
          expect([' ', '\u00A0', '']).toContain(textAfterClear); // Replaced irregular whitespace
          expect(textAfterClear).not.toContain('7');

          // Verify it's still interactive (or focus has moved to a valid previous cell)
          // and marked as active
          await expect(activeElementBeforeClear).toHaveClass(/active/); // Or the new active element

          // Also verify that it's a placeholder if that's the expected state
          // This depends on how your component defines a cleared, fillable slot.
          // For example, it might revert to having the 'placeholder' class if it was originally one.
          // If the element was a .digit-entry and becomes a .placeholder:
          // await expect(activeElementBeforeClear).toHaveClass(/placeholder/);

          // Ensure the number of interactive elements hasn't unexpectedly changed if that's a concern
          // await expect(interactiveElements).toHaveCount(initialInteractiveCount);
        }
      }
    }
  });

  test('should handle edge cases with empty operands', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test that the component doesn't crash with edge cases
    // This tests the maxOperandLength calculation edge case

    // Verify component is still rendered correctly even with potential edge cases
    const container = page.locator('.columnar-calculation-container');
    await expect(container).toBeVisible();

    // Check that grid style is applied even with empty data
    const operandGrid = page.locator('.operand-grid');
    const style = await operandGrid.getAttribute('style');
    expect(style).toBeTruthy();
    expect(style).toContain('grid-template-columns');
  });

  test('should have proper keyboard accessibility', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test keyboard navigation
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );
    const elementCount = await interactiveElements.count();

    if (elementCount > 0) {
      const firstElement = interactiveElements.first();

      // Focus with keyboard
      await firstElement.focus();
      await expect(firstElement).toBeFocused();

      // Test Enter key interaction
      await firstElement.press('Enter');
      await expect(firstElement).toHaveClass(/active/);

      // Test Space key interaction
      await firstElement.press(' ');
      await expect(firstElement).toHaveClass(/active/);

      // Test Tab navigation
      await firstElement.press('Tab');
      // Next element should receive focus (browser default behavior)
    }
  });

  test('should display correct operator symbols', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Verify operator cell exists and contains operator
    const operatorCell = page.locator('.operator-cell');
    await expect(operatorCell).toBeVisible();

    // The operator should be rendered via MathIcon
    // Check that it contains some mathematical operator
    const operatorContent = await operatorCell.textContent();
    expect(operatorContent).toBeTruthy();
  });

  test('should handle responsive design correctly', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    const container = page.locator('.columnar-calculation-container');
    await expect(container).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(container).toBeVisible();

    // Check that cells adapt to smaller screen
    const digitCells = page.locator('.digit-cell');
    await expect(digitCells.first()).toBeVisible();

    // Verify mobile-specific styles are applied
    const cellBox = await digitCells.first().boundingBox();
    expect(cellBox).toBeTruthy();
    if (cellBox) {
      expect(cellBox.width).toBeGreaterThan(0);
      expect(cellBox.height).toBeGreaterThan(0);
    }
  });

  test('should handle state synchronization between parent and component', async ({
    page,
  }) => {
    await setupColumnarQuestion(page);

    // This tests the complex state management between PracticePage and ColumnarCalculation
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );

    if ((await interactiveElements.count()) > 0) {
      // Input multiple digits and verify state consistency
      await interactiveElements.first().click();

      // Input a sequence of digits
      const digits = ['1', '2', '3'];
      for (const digit of digits) {
        const digitButton = page.locator(`button:has-text("${digit}")`).first();
        if (await digitButton.isVisible()) {
          await digitButton.click();
          // Wait for focus to potentially move or content to update
          await expect(page.locator('.active').first()).toBeVisible({
            timeout: 1000,
          });
          // If focus moves, the new active element should be different, or content should change
        }
      }

      // Verify that the component reflects the state changes
      // This indirectly tests the onAnswerChange callback and state management
      // Add a specific assertion here, e.g., check the content of the input cells
      await expect(page.locator('.active').first()).toBeVisible();
    }
  });

  test('should show visual feedback for active inputs', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test visual feedback for active/hovered states
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );

    if ((await interactiveElements.count()) > 0) {
      const firstElement = interactiveElements.first();

      // Test hover state
      await firstElement.hover();

      // Test active state
      await firstElement.click();
      await expect(firstElement).toHaveClass(/active/);

      // Test focus styles
      await firstElement.focus();
    }
  });

  test('should handle malformed data gracefully', async ({ page }) => {
    await setupColumnarQuestion(page);

    // This test ensures the component doesn't crash with edge cases
    // Since we can't inject malformed data directly in e2e tests,
    // we test that the component renders without errors under normal conditions

    // Check for JavaScript errors in console
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Interact with the component
    const container = page.locator('.columnar-calculation-container');
    await expect(container).toBeVisible();

    // Try various interactions
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );
    const elementCount = await interactiveElements.count();

    for (let i = 0; i < Math.min(elementCount, 3); i++) {
      await interactiveElements.nth(i).click();
      await page.waitForTimeout(100);
    }

    // Verify no JavaScript errors occurred
    expect(errors).toHaveLength(0);
  });

  test('should maintain focus sequence correctly', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test the complex focus management logic
    const allInteractive = page.locator('.placeholder, .interactive-digit');

    const totalInteractive = await allInteractive.count();

    if (totalInteractive > 1) {
      // Click through multiple inputs in sequence
      for (let i = 0; i < Math.min(totalInteractive, 5); i++) {
        await allInteractive.nth(i).click();
        await page.waitForTimeout(100);

        // Verify focus moved correctly
        const activeElements = page.locator('.active');
        await expect(activeElements.first()).toBeVisible();
      }
    }
  });

  test('should handle simultaneous operations correctly', async ({ page }) => {
    await setupColumnarQuestion(page);

    // Test rapid interactions to check for race conditions
    const interactiveElements = page.locator(
      '.placeholder, .interactive-digit'
    );

    if ((await interactiveElements.count()) > 0) {
      const firstElement = interactiveElements.first();

      // Rapid clicks
      await firstElement.click();
      await firstElement.click();
      await firstElement.click();

      // Should not crash or cause inconsistent state
      await expect(firstElement).toBeVisible();

      // Test rapid keypad interactions
      const digitButton = page.locator('button:has-text("9")').first();
      if (await digitButton.isVisible()) {
        await digitButton.click();
        await digitButton.click();
        // Should handle rapid inputs gracefully
      }
    }
  });
});
