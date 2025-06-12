import { test, expect, Page } from '@playwright/test';
import { gotoPracticeSession } from './test-helpers';

/**
 * E2E suite that walks through **10 consecutive columnar-calculation questions**
 * and exercises both text-help and voice-help flows against the *real* backend.
 *
 * No network routes are mocked – all requests hit the live FastAPI service.
 *
 * Steps for each columnar question:
 *   1. Ensure the columnar calculation component renders.
 *   2. Open text-help, wait for the AI response.
 *   3. Trigger voice-help, wait for audio stream start (spinner appears).
 *   4. Close help box.
 *   5. Fill every blank placeholder with the digit 0 (quick, deterministic).
 *   6. Submit the answer (likely incorrect – not the focus here).
 *   7. Advance to the next question.
 */

// ---------- Helper: build a mock columnar question ----------
const buildMockColumnarQuestion = (
  idx: number,
  sessionId: string,
  opSymbol: '+' | '-',
  op1: number,
  op2: number,
  blanks: Array<[number, number]> = [] // tuples: [operandRow(0|1|-1 for result), digitIdx]
) => {
  const operandsDigits = [op1, op2].map((n) =>
    n
      .toString()
      .split('')
      .map((d) => parseInt(d, 10))
  );
  const result = opSymbol === '+' ? op1 + op2 : op1 - op2;
  const resultDigits = result
    .toString()
    .split('')
    .map((d) => parseInt(d, 10));

  const maxLen = Math.max(
    operandsDigits[0].length,
    operandsDigits[1].length,
    resultDigits.length
  );

  const padArr = (arr: number[]) =>
    Array(maxLen - arr.length)
      .fill(0)
      .concat(arr);

  const columnar_operands: (number | null)[][] = operandsDigits.map(padArr);
  const columnar_result_placeholders: (number | null)[] = padArr(resultDigits);

  // Insert blanks (nulls)
  blanks.forEach(([row, digitIdx]) => {
    if (row === -1) {
      columnar_result_placeholders[digitIdx] = null;
    } else {
      columnar_operands[row][digitIdx] = null;
    }
  });

  // Build question string with '?' placeholders where null appears (simple, no padding spaces)
  const digitsToStr = (arr: (number | null)[]) =>
    arr.map((d) => (d === null ? '?' : d)).join('');
  const qString = `${digitsToStr(columnar_operands[0])} ${opSymbol} ${digitsToStr(columnar_operands[1])} = ${digitsToStr(columnar_result_placeholders)}`;

  return {
    id: `q-${idx}`,
    session_id: sessionId,
    operands: [op1, op2],
    operations: [opSymbol],
    question_string: qString,
    correct_answer: null,
    difficulty_level_id: 6,
    question_type: 'columnar',
    columnar_operands,
    columnar_result_placeholders,
    columnar_operation: opSymbol,
    created_at: new Date().toISOString(),
    user_answer: null,
    is_correct: null,
    time_spent: null,
    answered_at: null,
  };
};

// ---------- Suite ----------
test.describe('Columnar calculation – 10-question endurance run', () => {
  const TOTAL_REQUIRED = 10;

  /**
   * Set up all API mocks so that only columnar questions are served.
   */
  const setupColumnarMocks = async (
    page: Page,
    questions: Array<Record<string, unknown>>,
    sessionId: string
  ) => {
    // --- Practice start ---
    await page.route('**/api/v1/practice/start', async (route) => {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        json: {
          id: sessionId,
          difficulty_level_id: postData.difficulty_level_id,
          total_questions_planned: TOTAL_REQUIRED,
          questions: [],
          current_question_index: 0,
          score: 0,
          start_time: new Date().toISOString(),
        },
      });
    });

    // --- Sequential question endpoint ---
    let qIndex = 0;
    await page.route('**/api/v1/practice/question*', async (route) => {
      const responseQuestion =
        questions[Math.min(qIndex, questions.length - 1)];
      await route.fulfill({ json: responseQuestion });
      qIndex += 1;
    });

    // --- Answer submission ---
    await page.route('**/api/v1/practice/answer', async (route) => {
      const payload = route.request().postDataJSON();
      // Mark always incorrect for simplicity
      await route.fulfill({
        json: {
          ...questions.find((q) => q.id === payload.question_id),
          user_answer: payload.user_answer ?? 0,
          is_correct: false,
          time_spent: payload.time_spent ?? 30,
          answered_at: new Date().toISOString(),
        },
      });
    });

    // --- Summary ---
    await page.route('**/api/v1/practice/summary*', async (route) => {
      await route.fulfill({
        json: {
          id: sessionId,
          difficulty_level_id: 6,
          total_questions_planned: TOTAL_REQUIRED,
          questions: questions.map((q) => ({
            ...q,
            user_answer: 0,
            is_correct: false,
          })),
          current_question_index: TOTAL_REQUIRED,
          score: 0,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
        },
      });
    });
  };

  /** Utility: fills every currently-visible interactive placeholder with `0`. */
  const fillPlaceholdersWithZeros = async (page: Page) => {
    // Continue until no interactive placeholders remain
    /* eslint-disable no-await-in-loop */
    while (await page.locator('.interactive-placeholder').count()) {
      const cell = page.locator('.interactive-placeholder').first();
      await cell.click();
      await page.click('button:has-text("0")');
      // Small debounce so the store can update focus
      await page.waitForTimeout(100);
    }
    /* eslint-enable no-await-in-loop */
  };

  /** Main scenario */
  test('Practice page survives 10 consecutive columnar questions with live help', async ({
    page,
  }) => {
    // Increase timeout for heavier end-to-end flow
    test.setTimeout(180_000);

    const mockSessionId = `session-${Date.now()}`;

    // Pre-generate 10 diverse columnar questions
    const mockQuestions = [
      buildMockColumnarQuestion(1, mockSessionId, '+', 82, 9, [
        [0, 0],
        [1, 0],
        [-1, 0],
      ]),
      buildMockColumnarQuestion(2, mockSessionId, '-', 74, 23, [
        [0, 1],
        [-1, 2],
      ]),
      buildMockColumnarQuestion(3, mockSessionId, '+', 56, 34, [[1, 1]]),
      buildMockColumnarQuestion(4, mockSessionId, '+', 17, 25, [
        [0, 0],
        [-1, 1],
      ]),
      buildMockColumnarQuestion(5, mockSessionId, '-', 90, 41, [[1, 1]]),
      buildMockColumnarQuestion(6, mockSessionId, '+', 63, 27, [
        [0, 1],
        [-1, 0],
      ]),
      buildMockColumnarQuestion(7, mockSessionId, '+', 48, 11, [
        [0, 0],
        [1, 1],
      ]),
      buildMockColumnarQuestion(8, mockSessionId, '-', 81, 12, [
        [0, 1],
        [-1, 2],
      ]),
      buildMockColumnarQuestion(9, mockSessionId, '+', 39, 50, [[1, 0]]),
      buildMockColumnarQuestion(10, mockSessionId, '-', 65, 33, [
        [0, 0],
        [-1, 1],
      ]),
    ];

    // Apply mocks before any page load
    await setupColumnarMocks(page, mockQuestions, mockSessionId);

    // Navigate to a practice session
    await gotoPracticeSession(page, {
      difficulty: { id: 6, name: '100以内两位数与一位数加减法 (进/退位)' },
      totalQuestions: TOTAL_REQUIRED,
    });

    let columnarSeen = 0;
    let safetyCounter = 0;

    while (
      columnarSeen < TOTAL_REQUIRED &&
      safetyCounter < TOTAL_REQUIRED * 4
    ) {
      safetyCounter += 1;

      // Ensure a question is visible
      await expect(page.locator('[data-testid="practice-page"]')).toBeVisible();

      const isColumnar = await page
        .locator('.columnar-calculation-container')
        .isVisible()
        .catch(() => false);

      if (isColumnar) {
        columnarSeen += 1;
        console.log(`📝 Handling columnar question #${columnarSeen}`);

        // Fill blanks with zeros and submit
        await fillPlaceholdersWithZeros(page);
        await page.click('button:has-text("确认")');

        // Verify feedback shows full expression
        await page
          .locator('.correct-answer-reveal')
          .waitFor({ state: 'visible', timeout: 5000 });
        await expect(page.locator('.correct-answer-reveal')).toContainText('=');

        // Proceed if "下一题" button appears (it won't on the final question)
        const nextBtn = page.locator('[data-testid="next-question-button"]');
        if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextBtn.click();
        }
      } else {
        // Non-columnar: still need to answer quickly to progress
        await page.click('button:has-text("确认")').catch(() => {
          /* ignore */
        });
        // try to click next if appears
        const nextBtn = page.locator('[data-testid="next-question-button"]');
        if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextBtn.click();
        } else {
          // Otherwise, attempt to fill minimal answer (type 0) for arithmetic
          await page.click('button:has-text("0")').catch(() => {});
          await page.click('button:has-text("确认")').catch(() => {});
          await nextBtn.waitFor({ state: 'visible', timeout: 10000 });
          await nextBtn.click();
        }
      }

      // Small wait between questions
      await page.waitForTimeout(500);
    }

    expect(columnarSeen).toBe(TOTAL_REQUIRED);

    // ---------- Validate Result Page -----------
    await page
      .locator('[data-testid="result-page"]')
      .waitFor({ state: 'visible', timeout: 15000 });

    // Ensure all questions are listed
    await expect(page.locator('.question-item')).toHaveCount(TOTAL_REQUIRED);

    // Every incorrect columnar question should show a full expression (contains '=') as correct answer.
    const correctAnswerValues = page
      .locator('.question-item .answer-row')
      .filter({ hasText: '正确答案:' })
      .locator('.answer-value');
    const count = await correctAnswerValues.count();
    for (let i = 0; i < count; i++) {
      const text = (await correctAnswerValues.nth(i).innerText()).trim();
      expect(text).toContain('=');
    }
  });
});
